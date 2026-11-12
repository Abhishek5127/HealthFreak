import asyncio
import hashlib
import hmac
import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Annotated, Optional
from dotenv import load_dotenv
from pydantic import Field
from livekit import rtc
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    RunContext,
    TurnHandlingOptions,
    cli,
    inference,
    room_io,
)
try:
    from livekit.agents.beta.tools import EndCallTool
except ImportError:
    from livekit.agents.beta import EndCallTool

from livekit.agents.llm import ChatMessage, ToolError, function_tool
from livekit.agents.voice import UserStateChangedEvent
from livekit.agents.voice.events import ConversationItemAddedEvent, UserInputTranscribedEvent

# Top-level plugin imports on main thread
from livekit.plugins import sarvam, silero

try:
    from livekit.plugins import noise_cancellation
except ImportError:
    noise_cancellation = None

import aiohttp
from context_pack import (
    CoachState,
    ContextPack,
    ProfileEssential,
    DayMetrics,
    SevenDaySummary,
    ActivePlan,
    OpenIssue,
    LastCall,
    NextCall,
)

logger = logging.getLogger("HealthFreakVoiceAgent")

COACH_NAME = "Coach Mack"
COACH_SPOKEN_GREETING_HI = "मैं Coach Mack हूँ"

load_dotenv()
parent_env = os.path.join(os.path.dirname(__file__), "..", ".env")
if os.path.exists(parent_env):
    load_dotenv(parent_env)

SARVAM_FEMALE_SPEAKERS = {
    "ritu", "pooja", "simran", "kavya", "ishita", "shreya", "priya",
    "neha", "roopa", "amelia", "sophia", "suhani", "rupali", "tanya", "shruti", "kavitha"
}

FITNESS_KEYTERMS = [
    "paneer", "dalia", "chhole", "poha", "roti", "dal", "khichdi", "idli",
    "dosa", "upma", "curd", "sattu", "rajma", "paratha", "sabzi", "cardio",
    "squat", "deadlift", "pushup", "pullup", "pranayam", "surya namaskar",
    "whey protein", "creatine", "multivitamin", "ashwagandha", "omega-3",
    "kilo", "gram", "calorie"
]

def _get_speaker_gender() -> str:
    tts_choice = os.getenv("TTS_CHOICE", "sarvam").lower()
    if tts_choice == "sarvam":
        speaker = os.getenv("SARVAM_SPEAKER", "shubh").lower()
        if speaker in SARVAM_FEMALE_SPEAKERS:
            return "female"
    return "male"

def _build_instructions(context_pack: Optional[ContextPack] = None, is_anonymous: bool = False) -> str:
    gender = _get_speaker_gender()
    gender_rule = (
        "Match your grammatical gender to the voice: use feminine verb forms (सकती, करूँगी, बताऊँगी)."
        if gender == "female"
        else "Match your grammatical gender to the voice: use masculine verb forms (सकता, करूँगा, बताऊँगा)."
    )

    base = (
        f'You are {COACH_NAME}, the HealthFreak voice coach: a warm, practical Indian fitness and nutrition coach. Spoken opening: "{COACH_SPOKEN_GREETING_HI}". '
        "You are not a doctor and never diagnose. For chest pain, trouble breathing, fainting, "
        "severe or sudden symptoms, tell the user to seek urgent medical care.\n"
        "Language: mirror the user. Hindi gets Hindi, English gets English, mixed speech gets natural Hinglish. "
        "If a preferred language is provided in metadata, use it by default.\n"
        "Script rule (critical for the voice): write Hindi words in Devanagari and English words in Latin script, "
        'in the same sentence. Example: "नमस्ते! आज का workout कैसा रहा?" Never write Hindi in Roman letters.\n'
        "Style: spoken, not written. Short sentences, one or two per turn, one question at a time. "
        'Say "आप" and "जी". No markdown, lists, emoji, symbols or abbreviations. '
        'Spell out units ("किलो", "ग्राम", "कैलोरी"). End sentences with "।" or ".". '
        'Use fillers sparingly ("हाँ जी", "अच्छा", "ठीक है").\n'
        "Call opening: Follow up ONLY on issues under Open Issues. Never mention anything under Resolved recently unless the user brings it up. "
        'Never recite all data. Mention numbers naturally ("kal aapne 8 हज़ार steps किए").\n'
        "Opener style: Use the user's name at most once per conversation, in the greeting only. Never start a reply with 'Arre' or the user's name. Never start two consecutive replies with the same word or phrase. Start by reacting to or answering what the user just said.\n"
        "Wrap-up: Before ending the call, recap commitments made, confirm the next call time (if any), then end the call with the end_call tool.\n"
        "Transcripts may contain mishearings or spelling variants. Before saving any meal, workout or health detail "
        "with a tool, read back food names and quantities and get a yes. If unsure, ask instead of guessing.\n"
        "Before calling update_issue_status to resolve or update an issue, read back a confirmation like 'Shoulder ab theek hai, main ise close kar doon?' and get a yes from the user.\n"
        f"{gender_rule}"
    )

    if not is_anonymous and context_pack:
        rendered_pack = context_pack.render_prompt_text()
        return f"{base}\n\n{rendered_pack}"
    elif is_anonymous:
        return f"{base}\n\n[ANONYMOUS CALL MODE: No persistent health memory or database writes.]"
    return base

def _build_stt():
    stt_choice = os.getenv("STT_CHOICE", "sarvam").lower()
    if stt_choice == "deepgram":
        return inference.STT("deepgram/nova-3", language=os.getenv("STT_LANGUAGE", "hi"), extra_kwargs={"keyterm": FITNESS_KEYTERMS})
    return sarvam.STT(model="saaras:v3", language="hi-IN", mode="codemix")

def _build_tts():
    tts_choice = os.getenv("TTS_CHOICE", "sarvam").lower()
    if tts_choice == "cartesia":
        return inference.TTS("cartesia/sonic-3", voice=os.getenv("CARTESIA_HINDI_VOICE_ID", "default"), language="hi")
    return sarvam.TTS(
        model="bulbul:v3",
        target_language_code="hi-IN",
        speaker=os.getenv("SARVAM_SPEAKER", "shubh"),
        pace=1.0,
        temperature=0.6,
    )

def _setup_eval_logging(session: AgentSession, stt_language: str, call_id: str | None = None) -> None:
    last_user_turn = {"transcript": "", "language": stt_language, "start_time": 0.0}
    turn_counter = {"index": 0}

    async def _send_transcript_turn(turn_idx: int, role: str, text: str) -> None:
        if not call_id:
            return
        try:
            port = os.getenv("PORT", "3001")
            backend_url = os.getenv("BACKEND_URL", f"http://127.0.0.1:{port}").rstrip("/")
            path = "/api/coach/transcript-turn"
            payload = json.dumps({"turn_index": turn_idx, "role": role, "text": text}).encode("utf-8")
            headers = sign_coach_request("POST", path, call_id, payload)
            headers["Content-Type"] = "application/json"
            async with aiohttp.ClientSession() as http_sess:
                async with http_sess.post(f"{backend_url}{path}", data=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=4)) as resp:
                    if resp.status != 200:
                        logger.warning(f"Failed to persist turn {turn_idx}: HTTP {resp.status}")
        except Exception as err:
            logger.warning(f"Non-fatal error persisting transcript turn {turn_idx}: {err}")

    @session.on("user_input_transcribed")
    def _on_transcript(ev: UserInputTranscribedEvent) -> None:
        if ev.is_final and ev.transcript.strip():
            transcript_text = ev.transcript.strip()
            last_user_turn["transcript"] = transcript_text
            last_user_turn["language"] = str(ev.language) if ev.language else stt_language
            last_user_turn["start_time"] = time.time()
            record = {
                "event": "user_speech",
                "timestamp": time.time(),
                "user_transcript": transcript_text,
                "stt_language": last_user_turn["language"],
            }
            try:
                with open("transcripts.jsonl", "a", encoding="utf-8") as f:
                    f.write(json.dumps(record, ensure_ascii=False) + "\n")
                    f.flush()
            except Exception as err:
                logger.warning(f"Failed to append to transcripts.jsonl: {err}")

            turn_idx = turn_counter["index"]
            turn_counter["index"] += 1
            try:
                asyncio.create_task(_send_transcript_turn(turn_idx, "user", transcript_text))
            except Exception as err:
                logger.warning(f"Failed to schedule user turn persistence: {err}")

    @session.on("conversation_item_added")
    def _on_item_added(ev: ConversationItemAddedEvent) -> None:
        if isinstance(ev.item, ChatMessage) and ev.item.role == "assistant":
            reply_text = (ev.item.text_content or "").strip()
            latency = round(time.time() - last_user_turn["start_time"], 3) if last_user_turn["start_time"] > 0 else 0.0
            record = {
                "event": "coach_reply",
                "timestamp": time.time(),
                "user_transcript": last_user_turn["transcript"],
                "coach_reply": reply_text,
                "stt_language": last_user_turn["language"],
                "turn_latency_sec": latency,
            }
            try:
                with open("transcripts.jsonl", "a", encoding="utf-8") as f:
                    f.write(json.dumps(record, ensure_ascii=False) + "\n")
                    f.flush()
            except Exception as err:
                logger.warning(f"Failed to append to transcripts.jsonl: {err}")
            last_user_turn["start_time"] = 0.0

            if reply_text:
                turn_idx = turn_counter["index"]
                turn_counter["index"] += 1
                try:
                    asyncio.create_task(_send_transcript_turn(turn_idx, "agent", reply_text))
                except Exception as err:
                    logger.warning(f"Failed to schedule agent turn persistence: {err}")

async def _notify_call_ended(call_id: str) -> None:
    if not call_id:
        return
    try:
        port = os.getenv("PORT", "3001")
        backend_url = os.getenv("BACKEND_URL", f"http://127.0.0.1:{port}").rstrip("/")
        path = "/api/coach/call-ended"
        payload = json.dumps({"reason": "completed"}).encode("utf-8")
        headers = sign_coach_request("POST", path, call_id, payload)
        headers["Content-Type"] = "application/json"
        async with aiohttp.ClientSession() as http_sess:
            async with http_sess.post(f"{backend_url}{path}", data=payload, headers=headers, timeout=aiohttp.ClientTimeout(total=8)) as resp:
                if resp.status == 200:
                    logger.info(f"Post-call extraction completed for {call_id}")
                else:
                    logger.warning(f"Call-ended notification returned HTTP {resp.status}")
    except Exception as err:
        logger.warning(f"Non-fatal error notifying call-ended for {call_id}: {err}")

def sign_coach_request(method: str, path_with_query: str, call_id: str, body: bytes = b"") -> dict[str, str]:
    secret = os.getenv("COACH_HMAC_SECRET", "healthfreak_coach_hmac_secret_default")
    timestamp = str(int(time.time() * 1000))
    body_sha256 = hashlib.sha256(body).hexdigest()
    canonical = f"{timestamp}\n{method.upper()}\n{path_with_query}\n{body_sha256}\n{call_id}"
    signature = hmac.new(secret.encode("utf-8"), canonical.encode("utf-8"), hashlib.sha256).hexdigest()
    return {
        "X-Coach-Call-Id": call_id,
        "X-Coach-Timestamp": timestamp,
        "X-Coach-Signature": signature,
    }

class HealthFreakCoachAgent(Agent):
    def __init__(self, instructions: str, coach_state: CoachState) -> None:
        super().__init__(
            instructions=instructions,
            tools=[EndCallTool()],
        )
        self.coach_state = coach_state

    async def on_enter(self) -> None:
        gender = _get_speaker_gender()
        suffix = "सकती हूँ" if gender == "female" else "सकता हूँ"

        if not self.coach_state.is_anonymous and self.coach_state.context_pack:
            pack = self.coach_state.context_pack
            first_name = pack.profile.first_name if (pack.profile.first_name and pack.profile.first_name != "Friend") else None
            greeting_prefix = f"Greet {first_name} warmly in one short sentence" if first_name else "Greet the user warmly in one short sentence"

            # (a) the top open issue with a follow_up_question
            if pack.open_issues and pack.open_issues[0].follow_up_question:
                question = pack.open_issues[0].follow_up_question
                instructions = (
                    f'{greeting_prefix}, then ask this follow-up question naturally: "{question}"'
                )
                self.session.generate_reply(instructions=instructions)
                return

            # (b) a real data hook: today\'s workout from an active plan or a user commitment from the last call
            if pack.active_plan and pack.active_plan.today_workout:
                workout = pack.active_plan.today_workout
                instructions = (
                    f'{greeting_prefix}, then ask about today\'s planned workout: "{workout}".'
                )
                self.session.generate_reply(instructions=instructions)
                return

            if pack.last_call and pack.last_call.commitments:
                commitment = pack.last_call.commitments[0]
                instructions = (
                    f'{greeting_prefix}, then check in on their commitment from last time: "{commitment}".'
                )
                self.session.generate_reply(instructions=instructions)
                return

            # (c) otherwise a short greeting asking what they want to work on today
            instructions = f"{greeting_prefix} and ask what they want to work on today."
            self.session.generate_reply(instructions=instructions)
            return

        instructions = "Greet the user warmly in one short sentence and ask what they want to work on today."
        self.session.generate_reply(instructions=instructions)

    @function_tool
    async def log_meal(
        self,
        context: RunContext,
        food_name: Annotated[str, Field(description="Name of the food item in Hindi or English")],
        quantity: Annotated[str, Field(description="Quantity with units like 'एक कटोरी dal' or 'दो roti'")],
        meal_type: Annotated[str, Field(description="breakfast, lunch, dinner, or snack")] = "snack",
    ) -> str:
        """Saves a meal after reading back and confirming with the user."""
        call_id = self.coach_state.call_id
        if not call_id:
            logger.error("Cannot log meal: call_id missing in coach_state")
            return "Error: Call session ID missing, cannot save meal."

        port = os.getenv("PORT", "3001")
        backend_url = os.getenv("BACKEND_URL", f"http://127.0.0.1:{port}").rstrip("/")
        path = "/api/coach/log-meal"
        body_dict = {
            "food_name": food_name,
            "quantity": quantity,
            "meal_type": meal_type,
        }
        body_bytes = json.dumps(body_dict).encode("utf-8")
        headers = sign_coach_request("POST", path, call_id, body_bytes)
        headers["Content-Type"] = "application/json"

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=4.0)) as http_session:
                async with http_session.post(f"{backend_url}{path}", headers=headers, data=body_bytes) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("success"):
                            logger.info(f"Successfully logged meal: {food_name}")
                            return f"बढ़िया! मैंने {quantity} {food_name} आपके {meal_type} में note कर लिया है।"
                    error_text = await resp.text()
                    logger.error(f"Failed to log meal (status {resp.status}): {error_text}")
                    return f"माफ़ कीजिए, meal save करने में server error आया (code {resp.status})।"
        except Exception as err:
            logger.error(f"Exception logging meal: {err}")
            return "माफ़ कीजिए, server से connect नहीं हो पाया meal save करने के लिए।"

    @function_tool
    async def log_workout(
        self,
        context: RunContext,
        exercise_name: Annotated[str, Field(description="Name of exercise or activity")],
        duration_minutes: Annotated[int, Field(description="Duration in minutes")],
    ) -> str:
        """Saves a completed workout or activity session."""
        call_id = self.coach_state.call_id
        if not call_id:
            logger.error("Cannot log workout: call_id missing in coach_state")
            return "Error: Call session ID missing, cannot save workout."

        port = os.getenv("PORT", "3001")
        backend_url = os.getenv("BACKEND_URL", f"http://127.0.0.1:{port}").rstrip("/")
        path = "/api/coach/log-workout"
        body_dict = {
            "exercise_name": exercise_name,
            "duration_minutes": duration_minutes,
        }
        body_bytes = json.dumps(body_dict).encode("utf-8")
        headers = sign_coach_request("POST", path, call_id, body_bytes)
        headers["Content-Type"] = "application/json"

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=4.0)) as http_session:
                async with http_session.post(f"{backend_url}{path}", headers=headers, data=body_bytes) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("success"):
                            logger.info(f"Successfully logged workout: {exercise_name}")
                            return f"शाबाश! आपका {duration_minutes} मिनट का {exercise_name} session save हो गया है।"
                    error_text = await resp.text()
                    logger.error(f"Failed to log workout (status {resp.status}): {error_text}")
                    return f"माफ़ कीजिए, workout save करने में server error आया (code {resp.status})।"
        except Exception as err:
            logger.error(f"Exception logging workout: {err}")
            return "माफ़ कीजिए, server से connect नहीं हो पाया workout save करने के लिए।"

    @function_tool
    async def update_issue_status(
        self,
        context: RunContext,
        issue_ref: Annotated[str, Field(description="Issue ID prefix (like [id:xxxxxxxx]) or title of the open issue")],
        status: Annotated[str, Field(description="New status: 'resolved' or 'improving'")],
    ) -> str:
        """Updates the status of an open issue after confirming with the user."""
        call_id = self.coach_state.call_id
        if not call_id:
            logger.error("Cannot update issue: call_id missing in coach_state")
            return "Error: Call session ID missing, cannot update issue."

        port = os.getenv("PORT", "3001")
        backend_url = os.getenv("BACKEND_URL", f"http://127.0.0.1:{port}").rstrip("/")
        path = "/api/coach/update-issue"
        body_dict = {
            "issue_ref": issue_ref,
            "status": status,
        }
        body_bytes = json.dumps(body_dict).encode("utf-8")
        headers = sign_coach_request("POST", path, call_id, body_bytes)
        headers["Content-Type"] = "application/json"

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=4.0)) as http_session:
                async with http_session.post(f"{backend_url}{path}", headers=headers, data=body_bytes) as resp:
                    if resp.status == 200:
                        data = await resp.json()
                        if data.get("success"):
                            logger.info(f"Successfully updated issue status: {issue_ref} -> {status}")
                            if status == "resolved":
                                return "मैंने इस issue को resolved mark कर दिया है।"
                            else:
                                return "मैंने note कर लिया है कि इसमें सुधार हो रहा है।"
                    error_text = await resp.text()
                    logger.error(f"Failed to update issue (status {resp.status}): {error_text}")
                    return f"Issue status update नहीं हो पाया (status {resp.status})।"
        except Exception as err:
            logger.error(f"Exception updating issue: {err}")
            return "Server से connect नहीं हो पाया issue update करने के लिए।"

async def _fetch_context_pack(call_id: str, user_id: Optional[str] = None) -> ContextPack:
    port = os.getenv("PORT", "3001")
    backend_url = os.getenv("BACKEND_URL", f"http://127.0.0.1:{port}").rstrip("/")
    path = "/api/health/context-pack"
    headers = sign_coach_request("GET", path, call_id)
    try:
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=2.5)) as http_session:
            async with http_session.get(f"{backend_url}{path}", headers=headers) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    if data.get("success") and data.get("contextPack"):
                        return ContextPack.model_validate(data["contextPack"])
    except Exception as err:
        logger.warning(f"Could not fetch context pack from backend ({err}); using clean pack.")

    if user_id == "usr_synthetic_alex":
        return ContextPack(
            profile=ProfileEssential(
                first_name="Alex",
                language="hinglish",
                goal="Weight management & functional knee stability",
                tz="Asia/Kolkata",
                preferred_call_time="10:00",
            ),
            today=DayMetrics(steps=8240, step_goal=10000, calories_in=1950, calorie_target=2100, protein_g=112, water_ml=2600),
            yesterday=DayMetrics(steps=9500, step_goal=10000, calories_in=2050, protein_g=120),
            seven_day_summary=SevenDaySummary(avg_steps=8750, steps_goal_hit_count=5, avg_calories=2010, avg_protein_g=115, adherence_rate_pct=82),
            active_plan=ActivePlan(
                title="4-Week Metabolic Reboot",
                today_workout="Lower body mobility and 25-min brisk interval walking",
                seven_day_completion_count=4,
            ),
            open_issues=[
                OpenIssue(
                    id="issue_knee_01",
                    title="Right knee soreness after plyometrics",
                    category="pain",
                    severity="mild-to-moderate",
                    last_mentioned="2 days ago",
                    follow_up_question="Aapke right knee ka pain jumping ke baad ab kaisa hai?",
                ),
            ],
            last_call=LastCall(
                summary="Discussed knee tenderness during jumps and hydration target.",
                commitments=["Swapped plyometrics for flat walking", "Drink minimum 2.5L water daily"],
                date="2 days ago",
            ),
            next_call=NextCall(scheduled_for="Tomorrow 10:00 AM", channel="app", reason="Mid-week check-in"),
        )

    return ContextPack(
        profile=ProfileEssential(
            first_name="Friend",
            language="hinglish",
            goal="Healthy lifestyle & wellness",
            tz="Asia/Kolkata",
            preferred_call_time="10:00",
        ),
        today=DayMetrics(steps=0, step_goal=10000, calories_in=0, calorie_target=2000, protein_g=0, water_ml=0),
        yesterday=None,
        seven_day_summary=None,
        active_plan=None,
        open_issues=[],
        last_call=None,
        next_call=None,
    )

server = AgentServer()

AGENT_NAME = os.getenv("LIVEKIT_AGENT_NAME", "healthfreak-coach")
if os.getenv("COACH_EXPLICIT_DISPATCH_ENABLED", "true").lower() == "false":
    AGENT_NAME = ""

@server.rtc_session(agent_name=AGENT_NAME)
async def entrypoint(ctx: JobContext) -> None:
    ctx.log_context_fields = {"room": ctx.room.name}
    # Connect immediately so LiveKit does not trigger the 10-second room connection timeout warning
    await ctx.connect()

    stt_language = os.getenv("STT_LANGUAGE", "hi")
    stt_instance = _build_stt()
    tts_instance = _build_tts()
    llm_instance = inference.LLM(os.getenv("LLM_MODEL", "openai/gpt-4.1-mini"))

    is_console = cli.AgentsConsole.get_instance().enabled or ctx.room.name == "console-room"

    # 1. Read metadata from server dispatch
    metadata_raw = ctx.job.metadata or ""
    metadata = {}
    if metadata_raw:
        try:
            metadata = json.loads(metadata_raw)
        except Exception as e:
            logger.warning(f"Failed to parse job metadata JSON: {e}")

    meta_user_id = metadata.get("user_id")
    call_id = metadata.get("call_id")
    purpose = metadata.get("purpose", "checkin")
    scheduled_call_id = metadata.get("scheduled_call_id")

    if is_console and not meta_user_id:
        meta_user_id = os.getenv("DEFAULT_USER_ID", "usr_synthetic_alex")
        call_id = f"console_{int(time.time())}"

    # 2. Validate participant identity
    participant = await ctx.wait_for_participant()
    participant_identity = participant.identity

    is_anonymous = False
    validated_user_id = None

    if meta_user_id:
        # Check against participant identity
        if participant_identity in (meta_user_id, f"user_{meta_user_id}") or is_console:
            validated_user_id = meta_user_id
            logger.info(f"Verified participant identity '{participant_identity}' matches metadata user '{validated_user_id}'")
        else:
            logger.warning(f"Identity mismatch! Participant '{participant_identity}' != metadata user '{meta_user_id}'. Engaging anonymous mode.")
            is_anonymous = True
    else:
        logger.info("No dispatch metadata provided. Engaging anonymous mode.")
        is_anonymous = True

    # 3. Context Pack
    context_pack = None
    if not is_anonymous and call_id:
        context_pack = await _fetch_context_pack(call_id, user_id=validated_user_id)

    # 4. Typed Session Userdata
    coach_state = CoachState(
        user_id=validated_user_id,
        call_id=call_id,
        purpose=purpose,
        scheduled_call_id=scheduled_call_id,
        context_pack=context_pack,
        issues_touched=[],
        commitments=[],
        language=stt_language,
        is_anonymous=is_anonymous,
    )

    turn_handling = TurnHandlingOptions(
        turn_detection=inference.TurnDetector(),
        endpointing={
            "mode": "dynamic",
            "min_delay": 0.35,
            "max_delay": 0.65,
            "alpha": 0.5,
        },
        interruption={
            "enabled": True,
            "mode": "adaptive",
            "min_duration": 0.6,
            "min_words": 2,
            "resume_false_interruption": True,
            "false_interruption_timeout": 1.2,
        },
        preemptive_generation={
            "enabled": True,
            "preemptive_tts": True,
            "max_retries": 3,
        },
    )

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=stt_instance,
        llm=llm_instance,
        tts=tts_instance,
        turn_handling=turn_handling,
    )
    session.userdata = coach_state

    _setup_eval_logging(session, stt_language, call_id=call_id)

    if call_id:
        async def _handle_shutdown():
            await _notify_call_ended(call_id)
        ctx.add_shutdown_callback(_handle_shutdown)

    room_options = None
    if not is_console and noise_cancellation is not None:
        try:
            def _noise_cancellation_selector(params: room_io.NoiseCancellationParams) -> rtc.NoiseCancellationOptions:
                if params.participant.kind == rtc.ParticipantKind.PARTICIPANT_KIND_SIP:
                    return noise_cancellation.BVCTelephony()
                return noise_cancellation.BVC()

            room_options = room_io.RoomOptions(
                audio_input=room_io.AudioInputOptions(noise_cancellation=_noise_cancellation_selector)
            )
        except Exception as e:
            logger.warning(f"Noise cancellation unavailable: {e}")

    instructions = _build_instructions(context_pack, is_anonymous)
    coach_agent = HealthFreakCoachAgent(instructions=instructions, coach_state=coach_state)

    await session.start(agent=coach_agent, room=ctx.room, room_options=room_options)

if __name__ == "__main__":
    cli.run_app(server)

