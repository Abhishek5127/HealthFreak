import json
import os
import re
from typing import Dict, List, Set, Tuple

def _tokenize(text: str) -> List[str]:
    cleaned = re.sub(r"[।,?!.:;'\"()[\]{}]", " ", text.lower())
    return [t for t in cleaned.strip().split() if t]

def _get_trigrams(text: str) -> List[str]:
    tokens = _tokenize(text)
    return [f"{tokens[i]} {tokens[i+1]} {tokens[i+2]}" for i in range(len(tokens) - 2)]

class VarietyController:
    _instances: Dict[str, "VarietyController"] = {}
    _vocab_cache = None

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.ring_buffer: List[str] = []
        self.max_buffer_size = 12
        self.turn_count = 0

    @classmethod
    def get(cls, session_id: str) -> "VarietyController":
        if session_id not in cls._instances:
            cls._instances[session_id] = VarietyController(session_id)
        return cls._instances[session_id]

    @classmethod
    def clear(cls, session_id: str = None):
        if session_id:
            cls._instances.pop(session_id, None)
        else:
            cls._instances.clear()

    @classmethod
    def get_vocab(cls) -> dict:
        if cls._vocab_cache is not None:
            return cls._vocab_cache
        vocab_path = os.path.join(os.path.dirname(__file__), "vocab", "voice_hi.json")
        if os.path.exists(vocab_path):
            with open(vocab_path, "r", encoding="utf-8") as f:
                cls._vocab_cache = json.load(f)
        else:
            cls._vocab_cache = {"intents": {}, "domain": {}}
        return cls._vocab_cache

    def record_assistant_reply(self, reply: str):
        trimmed = reply.strip()
        if not trimmed:
            return
        self.ring_buffer.append(trimmed)
        if len(self.ring_buffer) > self.max_buffer_size:
            self.ring_buffer.pop(0)
        self.turn_count += 1

    def calculate_trigram_overlap(self, text: str, lookback: int = 6) -> float:
        text_tris = set(_get_trigrams(text))
        if not text_tris:
            return 0.0

        recent_turns = self.ring_buffer[-lookback:]
        if not recent_turns:
            return 0.0

        hist_tris: Set[str] = set()
        for turn in recent_turns:
            hist_tris.update(_get_trigrams(turn))

        if not hist_tris:
            return 0.0

        overlap = len(text_tris.intersection(hist_tris))
        return overlap / float(len(text_tris))

    def build_style_variety_block(self, seed_override: int = None) -> Tuple[str, int]:
        if not self.ring_buffer:
            return "", 0

        vocab = self.get_vocab()
        intents_dict = vocab.get("intents", {})

        # Compute simple stats
        openers: List[str] = []
        for r in self.ring_buffer:
            tokens = _tokenize(r)
            if len(tokens) >= 2:
                openers.append(f"{tokens[0]} {tokens[1]}")
            elif tokens:
                openers.append(tokens[0])

        recent_openers = list(dict.fromkeys(openers))[-3:]

        # Sample 3-4 alternatives deterministically
        seed = seed_override
        if seed is None:
            seed = sum(ord(c) for c in self.session_id) + self.turn_count * 97

        candidates = []
        for intent in ["acknowledge", "transition", "nudge"]:
            pool = intents_dict.get(intent, [])
            if pool:
                idx = (seed + len(candidates) * 13) % len(pool)
                candidates.append(pool[idx])

        lines = ["[STYLE VARIETY]"]
        if recent_openers:
            lines.append(f"Recently used (vary wording, reuse only rarely): {', '.join(recent_openers)}")
        if candidates:
            lines.append(
                f"If you need an acknowledgement/transition/nudge, consider ones like: [{', '.join(candidates[:4])}]. Reword freely; never copy mechanically."
            )

        block_text = "\n".join(lines)
        token_estimate = int(len(block_text.split()) * 1.3)
        return block_text, token_estimate
