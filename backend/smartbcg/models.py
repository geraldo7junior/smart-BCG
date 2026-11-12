from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import AfterValidator, BaseModel, ConfigDict, Field, StringConstraints, model_validator


def whole_cents(value):
    decimal = Decimal(str(value))
    if decimal != decimal.quantize(Decimal(".01")):
        raise ValueError("Use até duas casas decimais.")
    return value

Label = Annotated[str, StringConstraints(strip_whitespace=True, min_length=2, max_length=140)]
Code = Annotated[str, StringConstraints(strip_whitespace=True, pattern=r"^[A-Za-z0-9_-]{2,40}$")]
Notes = Annotated[str, StringConstraints(strip_whitespace=True, min_length=10, max_length=2000)]
Money = Annotated[float, Field(ge=0, le=100_000_000, allow_inf_nan=False), AfterValidator(whole_cents)]
Hours = Annotated[int, Field(ge=0, le=100_000)]
Measure = Annotated[float, Field(ge=-1e12, le=1e12, allow_inf_nan=False)]
Choice = Literal["investir", "validar", "sustentar", "reposicionar", "pausar"]


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True, allow_inf_nan=False)


class Project(Input):
    name: Label
    domain: Label
    objective: Label
    owner: Code
    description: str = Field(default="", max_length=2000)
    cost: Money
    hours: Hours


class Rating(Input):
    score: int = Field(ge=1, le=5, strict=True)
    evidence: str = Field(default="", max_length=600)


class Review(Input):
    cycle: Label
    reviewer: Code
    ratings: dict[str, Rating] = Field(min_length=1, max_length=10)


class Decision(Input):
    reviewer: Code
    choice: Choice
    rationale: Notes
    review_due: date
    scenario_id: str | None = Field(default=None, pattern=r"^[a-f0-9]{32}$")


class Action(Input):
    title: Label
    owner: Code
    due: date
    status: Literal["aberta", "em curso", "concluída"] = "aberta"
    evidence: str = Field(default="", max_length=600)

    @model_validator(mode="after")
    def require_completion_evidence(self):
        if self.status == "concluída" and len(self.evidence) < 5:
            raise ValueError("Registre a evidência da conclusão.")
        return self


class Benefit(Input):
    name: Label
    unit: Label
    baseline: Measure
    target: Measure
    due: date

    @model_validator(mode="after")
    def distinct_target(self):
        if self.baseline == self.target:
            raise ValueError("A meta deve ser diferente da linha de base.")
        return self


class Observation(Input):
    measured_on: date
    value: Measure
    evidence: Notes


class Policy(Input):
    budget: Money
    capacity: Hours
    tech_share: int = Field(default=50, ge=0, le=100)
    tech_threshold: float = Field(default=3, ge=1, le=5)
    market_threshold: float = Field(default=3, ge=1, le=5)
    evidence_only: bool = False


class Scenario(Input):
    name: Label
    baseline: Policy
    proposed: Policy


class StudyRun(Input):
    participant: Code
    case_code: Code
    condition: Literal["manual", "matriz", "smartbcg"]
    period: int = Field(ge=1, le=20)
    elapsed_seconds: int = Field(gt=0, le=86400)
    choice: Choice
    rationale: Notes
    confidence: int = Field(ge=1, le=5)
    case_version: Code
