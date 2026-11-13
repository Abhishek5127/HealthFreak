import json
import re
from pathlib import Path
from typing import Optional, Literal

_PATTERNS_CACHE = None

def _load_confirmation_patterns() -> dict:
    global _PATTERNS_CACHE
    if _PATTERNS_CACHE is not None:
        return _PATTERNS_CACHE

    candidates = [
        Path(__file__).resolve().parent / "confirmation_patterns.json",
        Path(__file__).resolve().parent.parent.parent / "src" / "coach" / "memory" / "confirmation_patterns.json",
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
        "add_op": {
            "yes": ["theek hai", "ok", "okay", "haan", "yes", "ji", "chalega", "kar do", "ठीक है", "हाँ", "जी"],
            "no": ["nahi", "na", "mat", "ruko", "रहने दो", "नहीं", "ना", "मत", "रुको"]
        },
        "resolve_op": {
            "yes": ["haan", "yes", "bilkul", "hata do", "delete", "हाँ", "हटा दो"],
            "ambiguous": ["theek hai", "ok", "okay", "theek", "ठीक है"],
            "no": ["nahi", "na", "mat", "रहने दो", "नहीं", "ना", "मत हटाओ"]
        }
    }
    return _PATTERNS_CACHE

def classify_confirmation(
    message: str,
    op_type: Literal["add_issue", "add_fact", "resolve_issue", "remove_fact"] = "resolve_issue"
) -> Literal["yes", "no", "ambiguous", "unrelated"]:
    """Classifies user confirmation response using shared confirmation_patterns.json.
    For add_issue/add_fact: 'theek hai'/'ok' is yes.
    For resolve_issue/remove_fact: explicit yes is required; 'theek hai'/'ok' is ambiguous.
    """
    if not message or not message.strip():
        return "unrelated"

    patterns = _load_confirmation_patterns()
    clean = re.sub(r'[.,!?:।\n]', '', message.strip().lower())
    words = clean.split()

    is_add = op_type in ("add_issue", "add_fact")
    target_config = patterns["add_op"] if is_add else patterns["resolve_op"]

    # 1. Exact match against yes patterns
    for y in target_config.get("yes", []):
        y_clean = y.lower().strip()
        if clean == y_clean or clean.startswith(f"{y_clean} ") or clean.endswith(f" {y_clean}"):
            return "yes"

    # 2. Check ambiguous for resolve/remove ops
    if not is_add:
        for a in target_config.get("ambiguous", []):
            a_clean = a.lower().strip()
            if clean == a_clean or clean.startswith(f"{a_clean} ") or clean.endswith(f" {a_clean}"):
                return "ambiguous"

    # 3. Check no patterns
    for n in target_config.get("no", []):
        n_clean = n.lower().strip()
        if clean == n_clean or clean.startswith(f"{n_clean} ") or clean.endswith(f" {n_clean}"):
            return "no"

    return "unrelated"

def verify_voice_confirmation(
    chat_history: list[dict],
    op_type: Literal["add_issue", "add_fact", "resolve_issue", "remove_fact"]
) -> tuple[bool, str]:
    """Verifies that the session history actually contains an assistant confirmation question
    followed by an explicit user affirmative response.
    Never relies solely on model-provided arguments (Rule E2).
    """
    if not chat_history:
        return False, "Chat history is empty; cannot verify confirmation."

    # Find the last user message and the assistant message immediately preceding it
    last_user_msg = None
    last_asst_msg = None

    for msg in reversed(chat_history):
        role = msg.get("role")
        content = msg.get("content") or msg.get("text") or ""
        if isinstance(content, list):
            content = " ".join([str(p.get("text", "")) if isinstance(p, dict) else str(p) for p in content])

        if not last_user_msg and role == "user":
            last_user_msg = str(content)
            continue
        if last_user_msg and not last_asst_msg and role in ("assistant", "agent"):
            last_asst_msg = str(content)
            break

    if not last_user_msg:
        return False, "No user response found in session history."

    # Step 1: Verify user intent using shared classifier
    classification = classify_confirmation(last_user_msg, op_type)
    if classification != "yes":
        if classification == "ambiguous":
            return False, "User response was ambiguous (e.g. 'theek hai'). Need plain confirmation ('हटा दूँ? हाँ या ना')."
        return False, f"User did not confirm (classified as '{classification}')."

    # Step 2: Verify that the preceding assistant turn actually asked a confirmation or read back
    if last_asst_msg:
        asst_lower = last_asst_msg.lower()
        has_question_or_confirm = any(
            marker in asst_lower for marker in [
                "?", "सही?", "पूरी तरह ठीक", "हटा", "नोट कर", "right?", "confirm", "theek ho gaya", "completely gone"
            ]
        )
        if not has_question_or_confirm:
            return False, "Preceding coach turn did not ask for confirmation or read back."

    return True, ""

