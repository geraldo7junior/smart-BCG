from datetime import date, timedelta

from .engine import CATALOG, MODEL_VERSION, analyze, evaluate_policy
from .store import put, records

DEMO = [
    ("Atlas GeoAI", "GeoInt", "Monitorar infraestrutura crítica", 235000, 420, [5, 5, 4, 4, 4, 5, 5, 4, 4, 4]),
    ("Sentinela de Ativos", "IA Industrial", "Reduzir falhas e paradas", 185000, 340, [5, 4, 4, 4, 4, 4, 5, 4, 4, 4]),
    ("Visão de Linha", "IA Industrial", "Automatizar inspeção de qualidade", 175000, 310, [4, 4, 3, 4, 4, 4, 4, 4, 3, 4]),
    ("Território 360", "GeoInt", "Acelerar diagnóstico territorial", 150000, 290, [2, 3, 2, 2, 3, 5, 4, 3, 4, 4]),
    ("Gêmeo de Processo", "IA Industrial", "Testar eficiência operacional", 210000, 520, [2, 2, 3, 2, 3, 4, 4, 3, 3, 4]),
    ("Mapeamento LiDAR", "GeoInt", "Sustentar entregas de campo", 115000, 280, [4, 4, 4, 3, 4, 2, 3, 2, 2, 3]),
    ("Radar de Tendências", "Estratégia", "Organizar sinais de mercado", 75000, 140, [2, 2, 2, 3, 2, 2, 2, 2, 1, 2]),
    ("Otimização Energética", "Energia", "Reduzir custos de operação", 120000, 270, None),
]


def seed(store):
    with store.connection(write=True) as db:
        if records(db, "projects"):
            return
        projects = []
        for index, (name, domain, objective, cost, hours, scores) in enumerate(DEMO):
            project = put(db, "projects", {
                "name": name, "domain": domain, "objective": objective, "cost": cost,
                "hours": hours, "description": f"Caso fictício de demonstração. Objetivo: {objective.lower()}.",
                "owner": f"EQ-{index + 1:02d}", "origin": "synthetic",
            })
            row = {**project, "review": None}
            projects.append(row)
            if scores is None:
                continue
            ratings = {
                item["key"]: {
                    "score": score,
                    "evidence": "" if (index == 3 and item["key"] in {"capability", "readiness"}) or
                    (index == 4 and item["key"] in {"integration", "demand", "alignment"}) else
                    f"Evidência sintética para demonstração: {item['label'].lower()}.",
                }
                for item, score in zip(CATALOG, scores)
            }
            analysis = analyze(ratings)
            review = put(db, "reviews", {
                "cycle": "Ciclo de demonstração", "reviewer": "AV-DEMO",
                "ratings": ratings, "analysis": analysis, "catalog": CATALOG,
                "project_snapshot": project,
            }, project=project["id"])
            row["review"] = review
            if index in (0, 1):
                due = (date.today() + timedelta(days=30 + index * 5)).isoformat()
                decision = put(db, "decisions", {
                    "reviewer": "COM-DEMO", "choice": "investir" if index == 0 else "validar",
                    "rationale": "Exemplo sintético de decisão com revisão de evidências pelo comitê.",
                    "review_due": due, "review_id": review["id"], "recommendation": analysis["choice"],
                    "override": index == 1,
                }, project=project["id"])
                if index == 0:
                    action = put(db, "actions", {
                        "title": "Concluir piloto em ambiente representativo", "owner": "EQ-01", "due": due,
                        "status": "em curso", "evidence": "", "decision_id": decision["id"],
                    }, project=project["id"])
                    put(db, "action_events", {"action_id": action["id"], "snapshot": action}, project=project["id"])
                    benefit = put(db, "benefits", {
                        "name": "Tempo médio de inspeção", "unit": "horas", "baseline": 12, "target": 8,
                        "due": due, "decision_id": decision["id"],
                    }, project=project["id"])
                    put(db, "observations", {
                        "benefit_id": benefit["id"], "measured_on": date.today().isoformat(),
                        "value": 10, "evidence": "Medição fictícia para fins de demonstração.",
                    }, project=project["id"])
        baseline = {"budget": 550000, "capacity": 1120, "tech_share": 50,
                    "tech_threshold": 3, "market_threshold": 3, "evidence_only": False}
        proposed = {**baseline, "budget": 420000, "capacity": 750, "tech_share": 60, "evidence_only": True}
        put(db, "scenarios", {
            "name": "Revisão de capacidade · demonstração", "baseline": baseline, "proposed": proposed,
            "version": MODEL_VERSION, "project_ids": [item["id"] for item in projects],
            "results": {"baseline": evaluate_policy(projects, baseline), "proposed": evaluate_policy(projects, proposed)},
        })
