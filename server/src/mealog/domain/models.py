"""Pipeline data types. One rule runs through all of them: no stage that talks
to a model is allowed to produce a nutrient number. Models produce *references*
(a surface form, then a canonical food_id, then grams). Nutrients are computed."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, model_validator

from .taxonomy import CuisineBucket

ABSTAIN = "ABSTAIN"


class Nutrients(BaseModel):
    kcal: float = 0.0
    protein_g: float = 0.0
    carb_g: float = 0.0
    fat_g: float = 0.0

    def __add__(self, other: Nutrients) -> Nutrients:
        return Nutrients(
            kcal=self.kcal + other.kcal,
            protein_g=self.protein_g + other.protein_g,
            carb_g=self.carb_g + other.carb_g,
            fat_g=self.fat_g + other.fat_g,
        )

    def rounded(self, nd: int = 1) -> Nutrients:
        return Nutrients(**{k: round(v, nd) for k, v in self.model_dump().items()})


class CanonicalFood(BaseModel):
    food_id: str
    name: str
    per_100g: Nutrients
    default_serving_g: float
    default_serving_name: str
    source: str
    locale: str
    packaged: bool = False
    serving_size_g: float | None = None
    serving_size_name: str | None = None
    serving_size_source: str | None = None
    net_weight_g: float | None = None
    net_weight_source: str | None = None
    density_g_per_ml: float | None = None
    density_source: str | None = None

    @model_validator(mode="after")
    def validate_food_provenance(self) -> CanonicalFood:
        if (self.serving_size_g is None) != (self.serving_size_source is None):
            raise ValueError(
                "serving_size_g and serving_size_source must be provided together"
            )
        if self.serving_size_g is not None and self.serving_size_g <= 0:
            raise ValueError("serving_size_g must be positive")
        if self.serving_size_g is not None and not self.serving_size_source.strip():
            raise ValueError("serving_size_source must not be empty")
        if self.serving_size_name is not None and self.serving_size_g is None:
            raise ValueError("serving_size_name requires serving_size_g")
        if (self.net_weight_g is None) != (self.net_weight_source is None):
            raise ValueError(
                "net_weight_g and net_weight_source must be provided together"
            )
        if self.net_weight_g is not None and self.net_weight_g <= 0:
            raise ValueError("net_weight_g must be positive")
        if self.net_weight_g is not None and not self.net_weight_source.strip():
            raise ValueError("net_weight_source must not be empty")
        if (self.density_g_per_ml is None) != (self.density_source is None):
            raise ValueError(
                "density_g_per_ml and density_source must be provided together"
            )
        if self.density_g_per_ml is not None and self.density_g_per_ml <= 0:
            raise ValueError("density_g_per_ml must be positive")
        if self.density_g_per_ml is not None and not self.density_source.strip():
            raise ValueError("density_source must not be empty")
        return self


CountOrigin = Literal['vision', 'user_text'] | None


class PerceivedItem(BaseModel):
    """Raw output of the vision/text stage. Deliberately has no food_id and no
    nutrients -- only what was *observed*."""

    surface_form: str
    cooking_method: str | None = None
    portion_hint: str | None = None
    count: int | None = None
    count_origin: CountOrigin = None
    confidence: float = 0.5
    #: Only populated by the V0 baseline, which asks the model for calories
    #: directly. Kept so the ablation can quantify what grounding buys us.
    ungrounded_kcal: float | None = None


class NormalizedItem(BaseModel):
    original: PerceivedItem
    query: str                      # locale-normalized retrieval key
    quantity: float | None = None
    unit: str | None = None
    count_origin: CountOrigin = None


class Candidate(BaseModel):
    food_id: str
    name: str
    score: float


class ResolvedItem(BaseModel):
    """A perceived item bound to the canonical catalogue -- or explicitly not."""

    query: str
    food_id: str = ABSTAIN
    candidates: list[Candidate] = Field(default_factory=list)
    quantity: float | None = None
    unit: str | None = None
    count_origin: CountOrigin = None
    grams: float = 0.0
    grams_p10: float = 0.0
    grams_p90: float = 0.0
    confidence: float = 0.0
    nutrients: Nutrients = Field(default_factory=Nutrients)
    portion_source: str = "not_applicable"
    portion_provenance: str = "not_applicable"

    @property
    def abstained(self) -> bool:
        return self.food_id == ABSTAIN


class MealLog(BaseModel):
    idempotency_key: str
    locale: str
    cuisine: CuisineBucket | None = None
    items: list[ResolvedItem] = Field(default_factory=list)
    totals: Nutrients = Field(default_factory=Nutrients)
    #: auto_accept | review | ask
    action: str = "review"
    question: str | None = None
    config: str = "V3"
