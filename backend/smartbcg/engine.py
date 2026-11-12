from collections import Counter
from decimal import Decimal
from math import sqrt

MODEL_VERSION = "smartbcg-1.0"
CRITERIA = [
    ("readiness", "tech", "Maturidade tecnológica", 3, "Demonstre desempenho no ambiente de aplicação."),
    ("capability", "tech", "Capacidade de execução", 2, "Valide competências e capacidade da equipe."),
    ("differentiation", "tech", "Diferenciação técnica", 2, "Compare a solução com alternativas existentes."),
    ("integration", "tech", "Integração e escala", 2, "Teste a integração em ambiente representativo."),
    ("risk", "tech", "Controle de riscos técnicos", 1, "Valide as hipóteses técnicas de maior risco."),
    ("demand", "market", "Demanda validada", 3, "Valide a demanda com usuários e clientes."),
    ("alignment", "market", "Alinhamento estratégico", 2, "Vincule a entrega a uma meta estratégica verificável."),
    ("economics", "market", "Viabilidade econômica", 2, "Atualize o custo total e a hipótese de retorno."),
    ("adoption", "market", "Adoção e acesso ao mercado", 2, "Teste a adoção e o canal de transferência."),
    ("partners", "market", "Parcerias e mobilização", 1, "Formalize o compromisso dos parceiros críticos."),
]
CATALOG = [
    {"key": key, "axis": axis, "label": label, "weight": weight, "action": action}
    for key, axis, label, weight, action in CRITERIA
]
ANCHORS = [
    "Incipientemente atendido ou lacuna material identificada",
    "Atendido em pequena parte, com lacunas relevantes",
    "Parcialmente atendido no contexto avaliado",
    "Majoritariamente atendido e demonstrado no contexto",
    "Plenamente atendido e demonstrado no contexto",
]
QUADRANTS = {
    "star": {"label": "Estrela", "choice": "investir"},
    "question": {"label": "Ponto de interrogação", "choice": "validar"},
    "cash": {"label": "Vaca leiteira", "choice": "sustentar"},
    "dog": {"label": "Reposicionamento", "choice": "reposicionar"},
}


def quadrant(tech, market, tech_threshold, market_threshold):
    if tech >= tech_threshold:
        return "star" if market >= market_threshold else "cash"
    return "question" if market >= market_threshold else "dog"


def analyze(ratings, tech_threshold=3, market_threshold=3):
    breakdown = []
    axes = {}
    for axis in ("tech", "market"):
        criteria = [item for item in CATALOG if item["axis"] == axis]
        weight_sum = sum(item["weight"] for item in criteria)
        totals = Counter()
        for item in criteria:
            rating = ratings.get(item["key"], {})
            score = rating.get("score")
            has_evidence = bool(rating.get("evidence"))
            weight = item["weight"]
            totals["nominal"] += weight * (score if score is not None else 3)
            totals["low"] += weight * (score if has_evidence else 1)
            totals["high"] += weight * (score if has_evidence else 5)
            totals["answered"] += weight * (score is not None)
            totals["evidenced"] += weight * has_evidence
            breakdown.append({
                **item, "score": score, "evidenced": has_evidence,
                "contribution": round(weight * score / weight_sum, 3) if score is not None else None,
            })
        axes[axis] = {key: round(totals[key] / weight_sum, 3)
                      for key in ("nominal", "low", "high", "answered", "evidenced")}

    tech, market = axes["tech"], axes["market"]
    thresholds = tech_threshold, market_threshold
    current = quadrant(tech["nominal"], market["nominal"], *thresholds)
    possible = sorted({quadrant(tech[x], market[y], *thresholds)
                       for x in ("low", "high") for y in ("low", "high")})
    distance = sqrt(max(0, tech_threshold - tech["nominal"]) ** 2
                    + max(0, market_threshold - market["nominal"]) ** 2)
    candidates = sorted(breakdown, key=lambda item: (
        item["evidenced"],
        -item["weight"] * (5 - (item["score"] if item["score"] is not None else 1)),
        item["key"],
    ))
    actions = []
    for item in candidates:
        if item["evidenced"] and item["score"] >= 4:
            continue
        prefix = "Obter evidência. " if not item["evidenced"] else ""
        actions.append({"criterion": item["key"], "text": prefix + item["action"]})
        if len(actions) == 3:
            break
    return {
        "version": MODEL_VERSION, "thresholds": {"tech": tech_threshold, "market": market_threshold},
        "axes": axes, "quadrant": current, "possible_quadrants": possible, "stable": len(possible) == 1,
        "choice": QUADRANTS[current]["choice"], "distance_to_star": round(distance, 3),
        "evidence_coverage": round((tech["evidenced"] + market["evidenced"]) / 2, 3),
        "breakdown": breakdown, "actions": actions,
    }


def cents(value):
    return int(Decimal(str(value)).quantize(Decimal(".01")) * 100)


def solve(rows, policy):
    candidates = [item for item in rows if item["eligible"]]
    if len(candidates) > 18:
        raise ValueError("A otimização exata aceita até 18 projetos elegíveis por cenário.")
    candidates.sort(key=lambda item: (-item["utility_units"], item["id"]))
    remaining = [0] * (len(candidates) + 1)
    for i in range(len(candidates) - 1, -1, -1):
        remaining[i] = remaining[i + 1] + candidates[i]["utility_units"]
    budget = cents(policy["budget"])
    capacity = policy["capacity"]
    best_key = (0, 0, 0)
    best_ids = ()

    def visit(index, cost, hours, utility, ids):
        nonlocal best_key, best_ids
        if utility + remaining[index] < best_key[0]:
            return
        if index == len(candidates):
            key = (utility, -cost, -hours)
            ids = tuple(sorted(ids))
            if key > best_key or (key == best_key and ids < best_ids):
                best_key, best_ids = key, ids
            return
        item = candidates[index]
        item_cost = cents(item["cost"])
        if cost + item_cost <= budget and hours + item["hours"] <= capacity and item["utility_units"] > 0:
            visit(index + 1, cost + item_cost, hours + item["hours"],
                  utility + item["utility_units"], (*ids, item["id"]))
        visit(index + 1, cost, hours, utility, ids)

    visit(0, 0, 0, 0, ())
    for item in rows:
        item["selected"] = item["id"] in best_ids
    return {
        "rows": rows, "selected_ids": list(best_ids),
        "utility": best_key[0] / 100000, "cost": -best_key[1] / 100, "hours": -best_key[2],
    }


def evaluate_policy(projects, policy):
    rows = []
    share = policy["tech_share"]
    for project in projects:
        review = project.get("review")
        item = {key: project[key] for key in ("id", "name", "cost", "hours")}
        item["review_id"] = review["id"] if review else None
        result = analyze(review["ratings"], policy["tech_threshold"], policy["market_threshold"]) if review else None
        item["analysis"] = result
        item["eligible"] = bool(result and (not policy["evidence_only"] or result["evidence_coverage"] == 1))
        item["ineligible_reason"] = (
            "Sem avaliação" if result is None else
            "Evidência incompleta" if not item["eligible"] else None
        )
        # The conservative utility is a preference index, expressed in integer 1e-5 units.
        item["utility_units"] = (
            round((result["axes"]["tech"]["low"] - 1) * 1000) * share
            + round((result["axes"]["market"]["low"] - 1) * 1000) * (100 - share)
            if result else 0
        )
        rows.append(item)
    return solve(rows, policy)
