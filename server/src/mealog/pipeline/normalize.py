"""Locale-aware text and unit normalization. Pure functions over a locale pack;
no locale is named in this file on purpose -- adding a market must not require
editing code here."""
import re
import unicodedata

from mealog.domain.models import NormalizedItem, PerceivedItem
from mealog.locales.loader import LocalePack

_QTY = re.compile(r"(?P<qty>\d+(?:[.,]\d+)?)\s*(?P<unit>[a-zA-Z_\u00c0-\u024f]+)?")


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


def parse_portion(hint: str | None, pack: LocalePack) -> tuple[float | None, str | None]:
    """'2 kepce' -> (2.0, 'kepce'). Unknown units are returned as-is so the
    portion stage can fall back to the catalogue default instead of guessing."""
    if not hint:
        return None, None
    m = _QTY.search(fold(hint, pack))
    if not m:
        return None, fold(hint, pack) or None
    qty = float(m.group("qty").replace(",", "."))
    return qty, (m.group("unit") or None)


def normalize(items: list[PerceivedItem], pack: LocalePack,
              apply_rules: bool = True) -> list[NormalizedItem]:
    out = []
    for it in items:
        query = fold(it.surface_form, pack) if apply_rules else it.surface_form.lower()
        qty, unit = parse_portion(it.portion_hint, pack) if apply_rules else (None, None)
        out.append(NormalizedItem(original=it, query=query, quantity=qty, unit=unit))
    return out
