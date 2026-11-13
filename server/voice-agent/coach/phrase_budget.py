import os
import re
from typing import Optional, Tuple
from .variety_controller import VarietyController

class PhraseBudget:
    _instances = {}
    _stock_patterns = None

    def __init__(self, session_id: str):
        self.session_id = session_id
        self.sentences_since_last_phrase = 999
        env_gap = os.getenv("PHRASE_MIN_GAP_SENTENCES")
        self.phrase_min_gap_sentences = int(env_gap) if env_gap else 8

    @classmethod
    def get(cls, session_id: str) -> "PhraseBudget":
        if session_id not in cls._instances:
            cls._instances[session_id] = PhraseBudget(session_id)
        return cls._instances[session_id]

    @classmethod
    def clear(cls, session_id: str = None):
        if session_id:
            cls._instances.pop(session_id, None)
        else:
            cls._instances.clear()

    @classmethod
    def get_stock_patterns(cls):
        if cls._stock_patterns is not None:
            return cls._stock_patterns

        patterns = []
        vocab = VarietyController.get_vocab()
        intents_dict = vocab.get("intents", {})
        phrases = intents_dict.get("acknowledge", []) + intents_dict.get("encourage", [])

        for p in phrases:
            escaped = re.escape(p)
            patterns.append(re.compile(rf"^\s*{escaped}\s*[,|।]?\s*", re.IGNORECASE))

        if not patterns:
            defaults = ["ठीक है", "समझ गया", "बढ़िया", "अच्छा", "नोट कर लिया"]
            for d in defaults:
                escaped = re.escape(d)
                patterns.append(re.compile(rf"^\s*{escaped}\s*[,|।]?\s*", re.IGNORECASE))

        cls._stock_patterns = patterns
        return cls._stock_patterns

    @staticmethod
    def count_sentences(text: str) -> int:
        if not text or not text.strip():
            return 0
        cleaned = re.sub(r"(\d+)\.(\d+)", r"\1X\2", text)
        cleaned = re.sub(r"\b(dr|mr|mrs|ms|prof|vs|approx|eg|ie)\.", r"\1", cleaned, flags=re.IGNORECASE)
        matches = re.findall(r"[.!।?]+", cleaned)
        return max(1, len(matches)) if matches else 1

    @staticmethod
    def is_exempt(text: str) -> bool:
        lower = text.lower()
        if any(w in lower for w in ["14416", "112", "tele-manas", "helpline", "doctor", "डॉक्टर"]):
            return True
        if any(w in lower for w in ["सही?", "हटा दूँ?", "नोट कर लेता हूँ", "right?"]):
            return True
        return False

    def process_reply(self, reply: str) -> Tuple[str, bool, int]:
        """Returns (processed_text, phrase_stripped, sentence_count)"""
        trimmed = reply.strip()
        if not trimmed:
            return reply, False, 0

        if self.is_exempt(trimmed):
            sc = self.count_sentences(trimmed)
            self.sentences_since_last_phrase += sc
            return reply, False, sc

        detected = None
        for pat in self.get_stock_patterns():
            if pat.search(trimmed):
                detected = pat
                break

        processed_text = trimmed
        phrase_stripped = False

        if detected:
            if self.sentences_since_last_phrase < self.phrase_min_gap_sentences:
                stripped = detected.sub("", trimmed).strip()
                if stripped:
                    processed_text = stripped[0].upper() + stripped[1:]
                    phrase_stripped = True
            else:
                self.sentences_since_last_phrase = 0

        sc = self.count_sentences(processed_text)
        if not detected or phrase_stripped:
            self.sentences_since_last_phrase += sc

        variety = VarietyController.get(self.session_id)
        variety.record_assistant_reply(processed_text)

        return processed_text, phrase_stripped, sc
