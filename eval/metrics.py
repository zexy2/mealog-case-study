"""Metrics.

Two decisions are encoded here and both are deliberate:

1. The headline number is the WORST cuisine bucket, not the mean. A global
   product's real accuracy is its worst market; averaging hides exactly the
   failure this project is about.
2. Identity and mass are scored separately. Reporting only calories makes the
   two dominant error families indistinguishable, and they have different fixes.
"""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class SampleResult:
    sample_id: str
    cuisine: str
    tier: str
    truth_ids: set[str]
    pred_ids: set[str]
    truth_kcal: float
    pred_kcal: float
    abstained: int = 0
    asked: bool = False

    @property
    def covered(self) -> bool:
        """A sample is 'covered' when the system committed to an answer.
        When it defers (abstains or asks), scoring its calories as if it had
        answered would punish the system for doing the right thing -- so
        accuracy is measured over covered samples and coverage is reported
        next to it. That pair is the risk-coverage trade, made explicit."""
        return not (self.asked or self.abstained)

    @property
    def tp(self) -> int: return len(self.truth_ids & self.pred_ids)
    @property
    def fp(self) -> int: return len(self.pred_ids - self.truth_ids)
    @property
    def fn(self) -> int: return len(self.truth_ids - self.pred_ids)

    @property
    def ape(self) -> float | None:
        """Absolute percentage error on calories. Undefined for zero-truth
        samples (traps), which are scored on identity only."""
        if self.truth_kcal <= 0:
            return None
        return abs(self.pred_kcal - self.truth_kcal) / self.truth_kcal * 100.0


@dataclass
class Bucket:
    name: str
    n: int = 0
    n_covered: int = 0
    tp: int = 0
    fp: int = 0
    fn: int = 0
    apes: list[float] = field(default_factory=list)
    abstained: int = 0
    asked: int = 0

    @property
    def precision(self) -> float:
        return self.tp / (self.tp + self.fp) if (self.tp + self.fp) else 0.0

    @property
    def recall(self) -> float:
        return self.tp / (self.tp + self.fn) if (self.tp + self.fn) else 0.0

    @property
    def f1(self) -> float:
        p, r = self.precision, self.recall
        return 2 * p * r / (p + r) if (p + r) else 0.0

    @property
    def coverage(self) -> float:
        """Share of meals the system answered without deferring to the user."""
        return self.n_covered / self.n * 100.0 if self.n else 0.0

    @property
    def mape(self) -> float:
        """Calorie error over COVERED samples only. Read together with coverage:
        a low MAPE at 40% coverage is a different product than one at 95%."""
        return sum(self.apes) / len(self.apes) if self.apes else 0.0

    @property
    def within_20pct(self) -> float:
        """Share of meals whose calorie estimate lands within +/-20%. More
        product-meaningful than MAPE: it is the number a user actually feels."""
        if not self.apes:
            return 0.0
        return sum(1 for a in self.apes if a <= 20.0) / len(self.apes) * 100.0

    #: False positives are hallucinations only once resolution is closed-set;
    #: before that they are just wrong free-text guesses.
    @property
    def hallucination_rate(self) -> float:
        total = self.tp + self.fp
        return self.fp / total * 100.0 if total else 0.0


def aggregate(results: list[SampleResult]) -> tuple[dict[str, Bucket], Bucket]:
    buckets: dict[str, Bucket] = {}
    overall = Bucket("overall")
    for r in results:
        for b in (buckets.setdefault(r.cuisine, Bucket(r.cuisine)), overall):
            b.n += 1
            b.tp += r.tp; b.fp += r.fp; b.fn += r.fn
            b.abstained += r.abstained
            b.asked += int(r.asked)
            if r.covered:
                b.n_covered += 1
                if (a := r.ape) is not None:
                    b.apes.append(a)
    return buckets, overall


def worst_cuisine(buckets: dict[str, Bucket]) -> Bucket | None:
    scored = [b for b in buckets.values() if b.apes]
    return max(scored, key=lambda b: b.mape) if scored else None


def spread(buckets: dict[str, Bucket]) -> float:
    """Worst-to-best MAPE ratio. Published re-analyses put commercial apps at
    1.6x-2.4x across cuisines; this is the number we are trying to push to 1.0."""
    scored = [b.mape for b in buckets.values() if b.apes and b.mape > 0]
    return max(scored) / min(scored) if len(scored) > 1 else 1.0
