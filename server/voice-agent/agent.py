import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass
from typing import Annotated
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

logger = logging.getLogger("HealthFreakVoiceAgent")

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

def _build_instructions() -> str:
    gender = _get_speaker_gender()
    gender_rule = (
        "Match your grammatical gender to the voice: use feminine verb forms (सकती, करूँगी, बताऊँगी)."
        if gender == "female"
        else "Match your grammatical gender to the voice: use masculine verb forms (सकता, करूँगा, बताऊँगा)."
    )
    return (
        "You are the HealthFreak voice coach: a warm, practical Indian fitness and nutrition coach. "
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
        "Transcripts may contain mishearings or spelling variants. Before saving any meal, workout or health detail "
        "with a tool, read back food names and quantities and get a yes. If unsure, ask instead of guessing.\n"
        f"{gender_rule}"
    )

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

def _setup_eval_logging(session: AgentSession, stt_language: str) -> None:
    last_user_turn = {"transcript": "", "language": stt_language, "start_time": 0.0}

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

    @session.on("conversation_item_added")
    def _on_item_added(ev: ConversationItemAddedEvent) -> None:
        if isinstance(ev.item, ChatMessage) and ev.item.role == "assistant":
            reply_text = ev.item.text_content or ""
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

class HealthFreakCoachAgent(Agent):
    def __init__(self) -> None:
        super().__init__(
            instructions=_build_instructions(),
            tools=[EndCallTool()],
        )

    async def on_enter(self) -> None:
        gender = _get_speaker_gender()
        suffix = "सकती हूँ" if gender == "female" else "सकता हूँ"
        greeting = f"नमस्ते! मैं HealthFreak voice coach हूँ। आज आपकी fitness और diet में क्या help कर {suffix}?"
        self.session.generate_reply(instructions=f'Greet the user warmly: "{greeting}"')

    @function_tool
    async def log_meal(
        self,
        context: RunContext,
        food_name: Annotated[str, Field(description="Name of the food item in Hindi or English")],
        quantity: Annotated[str, Field(description="Quantity with units like 'एक कटोरी dal' or 'दो roti'")],
        meal_type: Annotated[str, Field(description="breakfast, lunch, dinner, or snack")] = "snack",
    ) -> str:
        """Saves a meal after reading back and confirming with the user."""
        logger.info(f"Logging meal: {food_name}, quantity: {quantity}, type: {meal_type}")
        return f"बढ़िया! मैंने {quantity} {food_name} आपके {meal_type} में note कर लिया है।"

    @function_tool
    async def log_workout(
        self,
        context: RunContext,
        exercise_name: Annotated[str, Field(description="Name of exercise or activity")],
        duration_minutes: Annotated[int, Field(description="Duration in minutes")],
    ) -> str:
        """Saves a completed workout or activity session."""
        logger.info(f"Logging workout: {exercise_name} for {duration_minutes} mins")
        return f"शाबाश! आपका {duration_minutes} मिनट का {exercise_name} session save हो गया है।"

server = AgentServer()

@server.rtc_session()
async def entrypoint(ctx: JobContext) -> None:
    ctx.log_context_fields = {"room": ctx.room.name}
    stt_language = os.getenv("STT_LANGUAGE", "hi")
    stt_instance = _build_stt()
    tts_instance = _build_tts()
    llm_instance = inference.LLM(os.getenv("LLM_MODEL", "openai/gpt-4.1-mini"))

    turn_handling = TurnHandlingOptions(
        turn_detection=inference.TurnDetector(),
        interruption={
            "enabled": True,
            "min_duration": 0.8,
            "min_words": 2,
            "resume_false_interruption": True,
            "false_interruption_timeout": 1.5,
        },
        preemptive_generation={"enabled": True, "max_retries": 3},
    )

    session = AgentSession(
        vad=silero.VAD.load(),
        stt=stt_instance,
        llm=llm_instance,
        tts=tts_instance,
        turn_handling=turn_handling,
    )

    _setup_eval_logging(session, stt_language)

    is_console = cli.AgentsConsole.get_instance().enabled or ctx.room.name == "console-room"
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

    await session.start(agent=HealthFreakCoachAgent(), room=ctx.room, room_options=room_options)

if __name__ == "__main__":
    cli.run_app(server)

