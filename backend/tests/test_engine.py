from itertools import combinations
from random import Random
from unittest import TestCase

from smartbcg.engine import CATALOG, analyze, cents, evaluate_policy, quadrant, solve


class EngineTest(TestCase):
    def test_boundaries_and_missing_evidence(self):
        self.assertEqual(quadrant(3, 3, 3, 3), "star")
        self.assertEqual(quadrant(2.9, 3, 3, 3), "question")
        self.assertEqual(quadrant(3, 2.9, 3, 3), "cash")
        self.assertEqual(quadrant(2.9, 2.9, 3, 3), "dog")
        result = analyze({"readiness": {"score": 5, "evidence": ""}})
        self.assertEqual(result["axes"]["tech"], {
            "nominal": 3.6, "low": 1, "high": 5, "answered": 0.3, "evidenced": 0,
        })
        self.assertEqual(set(result["possible_quadrants"]), {"star", "cash", "question", "dog"})
        self.assertFalse(result["stable"])

    def test_coverage_and_thresholds_are_independent_of_utility(self):
        ratings = {item["key"]: {"score": 3, "evidence": "referência"} for item in CATALOG}
        project = {"id": "A", "name": "Projeto", "cost": 0.01, "hours": 1,
                   "review": {"id": "R", "ratings": ratings}}
        policy = {"budget": 0.01, "capacity": 1, "tech_threshold": 3,
                  "market_threshold": 3, "tech_share": 65, "evidence_only": True}
        baseline = evaluate_policy([project], policy)
        other = evaluate_policy([project], {**policy, "market_threshold": 3.1})
        self.assertEqual(baseline["rows"][0]["analysis"]["quadrant"], "star")
        self.assertEqual(other["rows"][0]["analysis"]["quadrant"], "cash")
        self.assertEqual(baseline["utility"], other["utility"])
        ratings["risk"]["evidence"] = ""
        self.assertFalse(evaluate_policy([project], policy)["rows"][0]["eligible"])

    def test_optimizer_matches_exhaustive_search(self):
        random = Random(81)
        for _ in range(20):
            rows = [{"id": str(i), "cost": random.randint(0, 1000) / 100, "hours": random.randint(1, 6),
                     "utility_units": random.randint(1, 50), "eligible": random.choice([True, True, False])}
                    for i in range(8)]
            budget, capacity = 1000, 9
            eligible = [row for row in rows if row["eligible"]]
            brute = []
            for size in range(len(eligible) + 1):
                for group in combinations(eligible, size):
                    cost = sum(cents(item["cost"]) for item in group)
                    hours = sum(item["hours"] for item in group)
                    if cost <= budget and hours <= capacity:
                        brute.append((-sum(item["utility_units"] for item in group), cost, hours,
                                      sorted(item["id"] for item in group)))
            result = solve(rows, {"budget": budget / 100, "capacity": capacity})
            self.assertEqual(result["selected_ids"], min(brute)[-1])
            self.assertEqual(result["cost"], min(brute)[1] / 100)
            self.assertEqual(result["hours"], min(brute)[2])
