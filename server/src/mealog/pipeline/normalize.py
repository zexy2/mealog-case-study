"""Locale-aware text and unit normalization. Pure functions over a locale pack;
no locale is named in this file on purpose -- adding a market must not require
editing code here."""
import re
import unicodedata

from mealog.domain.models import NormalizedItem, PerceivedItem
from mealog.locales.loader import LocalePack

_QTY = re.compile(
    r"(?P<qty>"
    r"(?:\d+(?:[.,]\d+)?\s+\d+\s*/\s*\d+)"
    r"|(?:\d+\s*/\s*\d+)"
    r"|(?:\d+(?:[.,]\d+)?)"
    r"|[¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]"
    r")"
)
_TOKEN = re.compile(r"[\w\u00c0-\u024f]+(?:[-'][\w\u00c0-\u024f]+)*", re.UNICODE)

_VULGAR_FRACTIONS = {
    "¼": 0.25,
    "½": 0.5,
    "¾": 0.75,
    "⅐": 1 / 7,
    "⅑": 1 / 9,
    "⅒": 0.1,
    "⅓": 1 / 3,
    "⅔": 2 / 3,
    "⅕": 0.2,
    "⅖": 0.4,
    "⅗": 0.6,
    "⅘": 0.8,
    "⅙": 1 / 6,
    "⅚": 5 / 6,
    "⅛": 0.125,
    "⅜": 0.375,
    "⅝": 0.625,
    "⅞": 0.875,
}

# These are quantity words, not locale branches. Locale packs still own text
# folding; the parser only needs a small, shared vocabulary for common input.
_WORD_NUMBERS = {
    "zero": 0.0,
    "one": 1.0,
    "two": 2.0,
    "three": 3.0,
    "four": 4.0,
    "five": 5.0,
    "six": 6.0,
    "seven": 7.0,
    "eight": 8.0,
    "nine": 9.0,
    "ten": 10.0,
    "half": 0.5,
    "quarter": 0.25,
    "bir": 1.0,
    "iki": 2.0,
    "uc": 3.0,
    "dort": 4.0,
    "bes": 5.0,
    "alti": 6.0,
    "yedi": 7.0,
    "sekiz": 8.0,
    "dokuz": 9.0,
    "on": 10.0,
    "yarim": 0.5,
    "ceyrek": 0.25,
}
_HALF_WORDS = {"a", "buçuk", "bucuk", "and"}
_SKIP_AFTER_QUANTITY = {"a", "an", "of", "and"}


def fold(text: str, pack: LocalePack) -> str:
    rules = pack.text_rules
    out = text
    for src, dst in (rules.get("char_map") or {}).items():
        out = out.replace(src, dst)
    if rules.get("lowercase", True):
        out = out.lower()
    if rules.get("strip_accents", False):
        out = "".join(c for c in unicodedata.normalize("NFD", out)
                      if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", out).strip()


def _parse_numeric(raw: str) -> float:
    raw = raw.strip()
    if raw in _VULGAR_FRACTIONS:
        return _VULGAR_FRACTIONS[raw]

    normalized = raw.replace(",", ".")
    mixed = normalized.split()
    if len(mixed) == 2 and "/" in mixed[1]:
        numerator, denominator = mixed[1].split("/", 1)
        return float(mixed[0]) + float(numerator) / float(denominator)

    compact = normalized.replace(" ", "")
    if "/" in compact:
        numerator, denominator = compact.split("/", 1)
        return float(numerator) / float(denominator)
    return float(compact)


def _unit_after(text: str, end: int) -> str | None:
    """Return first meaningful token after a numeric/word quantity."""
    for token in _TOKEN.findall(text[end:]):
        if token not in _SKIP_AFTER_QUANTITY:
            return token
    return None


def _word_quantity(text: str) -> tuple[float, str | None] | None:
    tokens = list(_TOKEN.finditer(text))
    for index, match in enumerate(tokens):
        value = _WORD_NUMBERS.get(match.group(0))
        if value is None:
            continue

        end = match.end()
        # Support common mixed word forms such as "one and a half" and
        # "bir buçuk" without treating a bare article as quantity evidence.
        next_index = index + 1
        if value >= 1.0 and next_index < len(tokens):
            modifier = tokens[next_index].group(0)
            if modifier in _HALF_WORDS:
                if modifier == "and" and next_index < len(tokens):
                    next_index += 1
                    if tokens[next_index].group(0) == "a":
                        next_index += 1
                    if next_index < len(tokens):
                        modifier = tokens[next_index].group(0)
                if modifier in {"half", "buçuk", "bucuk"}:
                    value += 0.5
                    end = tokens[next_index].end()

        unit = _unit_after(text, end)
        return value, unit
    return None


def parse_portion(hint: str | None, pack: LocalePack) -> tuple[float | None, str | None]:
    """'2 kepce' -> (2.0, 'kepce'). Fractions and common word numbers are
    converted before unit lookup. Unknown units are returned as-is so the
    portion stage can fall back to the catalogue default instead of guessing."""
    if not hint:
        return None, None
    text = fold(hint, pack)
    m = _QTY.search(text)
    if m:
        return _parse_numeric(m.group("qty")), _unit_after(text, m.end())

    word = _word_quantity(text)
    if word:
        return word

    return None, text or None


def normalize(items: list[PerceivedItem], pack: LocalePack,
              apply_rules: bool = True) -> list[NormalizedItem]:
    out = []
    for it in items:
        query = fold(it.surface_form, pack) if apply_rules else it.surface_form.lower()
        qty, unit = parse_portion(it.portion_hint, pack) if apply_rules else (None, None)
        out.append(NormalizedItem(original=it, query=query, quantity=qty, unit=unit))
    return out
