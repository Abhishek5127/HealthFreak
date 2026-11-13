import os
import re
import json
from pathlib import Path
from typing import Optional, NamedTuple, AsyncIterable, AsyncGenerator

PROMPT_VERSION = "2026-11-13.coach-context-v2.5c286b5"

class OpenerMatchResult(NamedTuple):
    has_opener: bool
    matched_clause: str
    remaining_text: str

_PATTERNS_CACHE = None

def _load_patterns():
    global _PATTERNS_CACHE
    if _PATTERNS_CACHE is not None:
        return _PATTERNS_CACHE

    # Search known paths for opener_patterns.json
    candidates = [
        Path(__file__).resolve().parent / "opener_patterns.json",
        Path(__file__).resolve().parent.parent.parent / "src" / "coach" / "style" / "opener_patterns.json",
    ]
    for p in candidates:
        if p.exists():
            try:
                with open(p, "r", encoding="utf-8") as f:
                    _PATTERNS_CACHE = json.load(f)
                    return _PATTERNS_CACHE
            except Exception:
                pass

    _PATTERNS_CACHE = {
        "interjections_roman": ["arre", "are", "arey", "arrey", "oye", "hey", "oh", "wah", "namaste", "hello", "hi"],
        "interjections_devanagari": ["अरे", "ओह", "वाह", "अरे वाह", "ओए", "नमस्ते", "हैलो", "हाय"],
        "honorifics": ["ji", "जी"],
        "min_gap_sentences_default": 20,
    }
    return _PATTERNS_CACHE

def count_sentences(text: str) -> int:
    """Counts sentences while ignoring decimals (2.5) and common abbreviations (Dr., kg., etc.)."""
    if not text or not text.strip():
        return 0

    sanitized = text.strip()
    # Mask decimals
    sanitized = re.sub(r'(\d+)\.(\d+)', r'\1_\2', sanitized)
    # Mask common abbreviations
    sanitized = re.sub(r'\b(dr|mr|mrs|ms|vs|approx|e\.g|i\.e|etc|kg|km|ml|min|sec)\.', r'\1_', sanitized, flags=re.IGNORECASE)

    matches = re.findall(r'([.?!।]+)', sanitized)
    if not matches:
        return 1 if len(sanitized) > 0 else 0
    return max(1, len(matches))

def detect_leading_opener(text: str, user_name: Optional[str] = None) -> OpenerMatchResult:
    """Checks if text starts with an interjection or user name (Roman / Devanagari).
    Only matches leading clause at the beginning of the text. Mid-sentence uses are untouched.
    """
    if not text or not text.strip():
        return OpenerMatchResult(False, "", text)

    patterns = _load_patterns()
    trimmed = text.strip()

    interjections = sorted(
        patterns.get("interjections_devanagari", []) +
        patterns.get("interjections_roman", []),
        key=len,
        reverse=True
    )
    honorific_regex = r'(?:\s+(?:ji|जी))?'

    clean_name = user_name.strip() if user_name else None
    name_parts = []
    if clean_name and clean_name.lower() != "friend":
        name_parts.append(re.escape(clean_name))

    # 1. Composite: [Interjection] [Name] [Honorific]? [,!:-]?
    for inter in interjections:
        esc_inter = re.escape(inter)
        if name_parts:
            for np in name_parts:
                comp_pattern = re.compile(rf'^({esc_inter}\s+{np}{honorific_regex}\s*[,!:-]?\s*)', re.IGNORECASE)
                m = comp_pattern.match(trimmed)
                if m:
                    clause = m.group(1)
                    rem = trimmed[len(clause):].strip()
                    if rem:
                        rem = rem[0].upper() + rem[1:]
                    return OpenerMatchResult(True, clause, rem)

        # Generic composite: [Interjection] [Single Word / Name] [Honorific]? [,!:-]
        generic_pattern = re.compile(rf'^({esc_inter}\s+\S+{honorific_regex}\s*[,!:-]\s*)', re.IGNORECASE)
        m_gen = generic_pattern.match(trimmed)
        if m_gen:
            clause = m_gen.group(1)
            rem = trimmed[len(clause):].strip()
            if rem:
                rem = rem[0].upper() + rem[1:]
            return OpenerMatchResult(True, clause, rem)

        # 2. Standalone Interjection: [Interjection] [,!:-]?
        inter_pattern = re.compile(rf'^({esc_inter}\s*[,!:-]?\s*)', re.IGNORECASE)
        m_inter = inter_pattern.match(trimmed)
        if m_inter:
            clause = m_inter.group(1)
            rem = trimmed[len(clause):].strip()
            if rem:
                rem = rem[0].upper() + rem[1:]
            return OpenerMatchResult(True, clause, rem)

    # 3. Standalone Name: [Name] [Honorific]? [,!:-]?
    if name_parts:
        for np in name_parts:
            name_pattern = re.compile(rf'^({np}{honorific_regex}\s*[,!:-]?\s*)', re.IGNORECASE)
            m_name = name_pattern.match(trimmed)
            if m_name:
                clause = m_name.group(1)
                rem = trimmed[len(clause):].strip()
                if rem:
                    rem = rem[0].upper() + rem[1:]
                return OpenerMatchResult(True, clause, rem)

    return OpenerMatchResult(False, "", text)

class SessionOpenerState:
    def __init__(self, min_gap: int):
        self.sentences_since_last_opener = min_gap  # Allows turn 0 opener
        self.last_opener_used: Optional[str] = None
        self.turn_index = 0

class OpenerBudget:
    _sessions: dict[str, SessionOpenerState] = {}
    _telemetry_events: list[dict] = []

    @classmethod
    def get_min_gap(cls) -> int:
        env_val = os.getenv("OPENER_MIN_GAP_SENTENCES")
        if env_val:
            try:
                parsed = int(env_val)
                if parsed > 0:
                    return parsed
            except ValueError:
                pass
        return _load_patterns().get("min_gap_sentences_default", 20)

    @classmethod
    def get_state(cls, session_id: str) -> SessionOpenerState:
        if session_id not in cls._sessions:
            cls._sessions[session_id] = SessionOpenerState(cls.get_min_gap())
        return cls._sessions[session_id]

    @classmethod
    def is_opener_allowed(cls, session_id: str) -> bool:
        state = cls.get_state(session_id)
        return state.turn_index == 0 or state.sentences_since_last_opener >= cls.get_min_gap()

    @classmethod
    def process_reply(
        cls,
        session_id: str,
        text: str,
        user_name: Optional[str] = None,
        path: str = "voice_agent",
        lang: str = "hi"
    ) -> tuple[str, str, int]:
        """Processes a reply, enforcing the opener budget.
        Returns: (cleaned_text, action, sentence_count) where action in ('allowed', 'stripped', 'none').
        """
        state = cls.get_state(session_id)
        min_gap = cls.get_min_gap()
        detection = detect_leading_opener(text, user_name)
        sent_count = count_sentences(detection.remaining_text if detection.has_opener else text)

        result_text = text
        action = "none"

        if detection.has_opener:
            if state.turn_index == 0 or state.sentences_since_last_opener >= min_gap:
                action = "allowed"
                state.sentences_since_last_opener = 0
                state.last_opener_used = detection.matched_clause.strip()
                result_text = text
            else:
                action = "stripped"
                result_text = detection.remaining_text

            cls.record_telemetry({
                "path": path,
                "lang": lang,
                "action": action,
                "gap": state.sentences_since_last_opener,
            })

        state.sentences_since_last_opener += sent_count
        state.turn_index += 1

        return result_text, action, sent_count

    @classmethod
    def record_telemetry(cls, event: dict) -> None:
        cls._telemetry_events.append(event)
        if len(cls._telemetry_events) > 500:
            cls._telemetry_events.pop(0)

    @classmethod
    def get_telemetry(cls) -> list[dict]:
        return list(cls._telemetry_events)

    @classmethod
    def reset_session(cls, session_id: str) -> None:
        cls._sessions.pop(session_id, None)

    @classmethod
    def sanitize_history(cls, messages: list[dict], user_name: Optional[str] = None) -> list[dict]:
        """Strips leading opener clauses from earlier assistant turns."""
        sanitized = []
        for m in messages:
            if m.get("role") in ("assistant", "coach"):
                content = m.get("content") or m.get("text") or ""
                det = detect_leading_opener(content, user_name)
                if det.has_opener:
                    new_m = dict(m)
                    if "content" in new_m:
                        new_m["content"] = det.remaining_text
                    if "text" in new_m:
                        new_m["text"] = det.remaining_text
                    sanitized.append(new_m)
                    continue
            sanitized.append(m)
        return sanitized

async def filter_streaming_opener(
    text_stream: AsyncIterable[str],
    user_name: Optional[str],
    session_id: str,
    path: str = "voice_agent",
    lang: str = "hi"
) -> AsyncGenerator[str, None]:
    """Buffers initial tokens to detect leading opener and enforce OpenerBudget,
    yielding remaining text with minimal (~50-100ms) latency.
    """
    buffer = ""
    prefix_decided = False
    delimiter_re = re.compile(r'[,!?:।\n]')

    async for chunk in text_stream:
        if prefix_decided:
            yield chunk
            continue

        buffer += chunk

        # Wait until we see a punctuation delimiter or at least 4 words / 35 characters
        has_delimiter = bool(delimiter_re.search(buffer))
        word_count = len(buffer.split())

        if has_delimiter or word_count >= 4 or len(buffer) >= 35:
            # Evaluate leading opener
            det = detect_leading_opener(buffer, user_name)
            if det.has_opener:
                cleaned, action, _ = OpenerBudget.process_reply(
                    session_id=session_id,
                    text=buffer,
                    user_name=user_name,
                    path=path,
                    lang=lang,
                )
                yield cleaned
            else:
                yield buffer
            prefix_decided = True

    if not prefix_decided and buffer:
        cleaned, _, _ = OpenerBudget.process_reply(
            session_id=session_id,
            text=buffer,
            user_name=user_name,
            path=path,
            lang=lang,
        )
        yield cleaned
