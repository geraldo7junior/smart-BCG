from tempfile import TemporaryDirectory
from unittest import TestCase

from fastapi.testclient import TestClient

from smartbcg.main import create_app


class WorkflowTest(TestCase):
    def setUp(self):
        directory = TemporaryDirectory()
        self.addCleanup(directory.cleanup)
        self.db = f"{directory.name}/test.sqlite3"
        client = TestClient(create_app(database=self.db, demo=False, frontend=directory.name))
        self.addCleanup(client.close)
        self.addCleanup(client.__exit__, None, None, None)
        self.client = client.__enter__()

    def post(self, path, body):
        response = self.client.post("/api" + path, json=body)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def get(self, path):
        response = self.client.get("/api" + path)
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def project(self, name="Visão Industrial"):
        return self.post("/projects", {
            "name": name, "domain": "IA Industrial", "objective": "Reduzir defeitos",
            "owner": "EQ-01", "cost": 5000, "hours": 22,
        })

    def test_complete_trace(self):
        project = self.project()
        prefix = f"/projects/{project['id']}"
        model = self.get("/model")
        ratings = {item["key"]: {"score": 4, "evidence": "material sensível"}
                   for item in model["criteria"]}
        review = self.post(prefix + "/reviews", {"cycle": "Primeiro ciclo", "reviewer": "P-01", "ratings": ratings})
        decision_path = prefix + f"/reviews/{review['id']}/decisions"
        decision_body = {"reviewer": "P-02", "choice": "validar",
                         "rationale": "A evidência do campo merece confirmação.", "review_due": "2027-01-15"}
        decision = self.post(decision_path, decision_body)
        self.assertTrue(decision["override"])
        second = self.project("Outro projeto")
        bad = self.client.post(f"/api/projects/{second['id']}/reviews/{review['id']}/decisions", json=decision_body)
        self.assertEqual(bad.status_code, 404)
        action_body = {"title": "Conferir medições", "owner": "P-03", "due": "2027-01-15"}
        action = self.post(prefix + f"/decisions/{decision['id']}/actions", action_body)
        action_path = f"/api{prefix}/actions/{action['id']}"
        action_edit = {**action_body, "status": "concluída", "evidence": "Relatório de campo 01"}
        updated = self.client.put(action_path, params={"revision": action["created_at"]}, json=action_edit)
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(self.client.put(action_path, params={"revision": action["created_at"]}, json=action_edit).status_code, 409)
        benefit = self.post(prefix + f"/decisions/{decision['id']}/benefits", {
            "name": "Tempo de inspeção", "unit": "horas", "baseline": 20, "target": 10, "due": "2027-01-15",
        })
        for value, measured_on in [(15, "2027-01-15"), (17, "2027-01-05")]:
            self.post(prefix + f"/benefits/{benefit['id']}/observations", {
                "measured_on": measured_on, "value": value, "evidence": "Evidência da inspeção",
            })
        detail = self.get(prefix)
        self.assertEqual(detail["benefits"][0]["progress"], 0.5)
        self.assertEqual(len(detail["action_events"]), 2)
        policy = {"budget": 5000, "capacity": 22}
        scenario = self.post("/scenarios", {"name": "Cenário base", "baseline": policy,
                                           "proposed": {**policy, "capacity": 21}})
        self.assertEqual(scenario["results"]["baseline"]["selected_ids"], [project["id"]])
        self.assertEqual(scenario["results"]["proposed"]["selected_ids"], [])
        self.assertEqual(scenario["results"]["baseline"]["rows"][0]["review_id"], review["id"])
        export = self.get("/export/research.json")
        self.assertNotIn("name", export["projects"][0])
        self.assertNotIn("evidence", export["reviews"][0]["ratings"]["risk"])
        self.assertEqual(self.get("/export/research.json?include_text=1")["reviews"][0]["ratings"]["risk"]["evidence"],
                         "material sensível")
        with TestClient(create_app(database=self.db, demo=False)) as reopened:
            self.assertEqual(reopened.get("/api" + prefix).json()["decisions"][0]["id"], decision["id"])

    def test_legacy_and_study(self):
        row = {"projectName": "Geo Teste", "dimensionMarket": "1", "category": "Geoint"}
        self.assertEqual(self.post("/legacy", [row, row]), {"imported": 1, "duplicates": 1})
        self.assertEqual(self.get("/legacy")[0]["raw"], row)
        self.assertEqual(self.get("/projects"), [])
        run = {"participant": "P-01", "case_code": "CASE-01", "case_version": "v1", "condition": "manual",
               "period": 1, "elapsed_seconds": 135, "choice": "validar", "rationale": "=4+2 fórmula simulada",
               "confidence": 3}
        self.post("/study", run)
        self.assertEqual(self.client.post("/api/study", json=run).status_code, 409)
        self.assertNotIn("rationale", self.client.get("/api/export/study.csv").text)
        self.assertIn("'=4+2", self.client.get("/api/export/study.csv?include_text=1").text)
        invalid = self.client.post("/api/projects", json={
            "name": "Proj", "domain": "IA", "objective": "Teste", "owner": "AA", "cost": 1.005, "hours": 1,
        })
        self.assertEqual(invalid.status_code, 422)

    def test_decision_links_the_exact_scenario_review(self):
        pid = self.project()["id"]
        prefix = f"/projects/{pid}"
        body = {"cycle": "Ciclo I", "reviewer": "AV-01",
                "ratings": {"readiness": {"score": 5, "evidence": "Relatório de piloto"}}}
        original = self.post(prefix + "/reviews", body)
        policy = {"budget": 5000, "capacity": 22}
        scenario = self.post("/scenarios", {"name": "Cenário inicial", "baseline": policy, "proposed": policy})
        latest = self.post(prefix + "/reviews", {**body, "cycle": "Ciclo II"})
        decision = {"reviewer": "COM-01", "choice": "validar", "rationale": "Evidência parcial exige validação.",
                    "review_due": "2027-01-15", "scenario_id": scenario["id"]}
        path = prefix + f"/reviews/{latest['id']}/decisions"
        self.assertEqual(self.client.post("/api" + path, json=decision).status_code, 422)
        saved = self.post(prefix + f"/reviews/{original['id']}/decisions", decision)
        self.assertEqual(saved["scenario_id"], scenario["id"])
        self.assertEqual(self.get(prefix)["scenario_links"][0]["review_id"], original["id"])

    def test_synthetic_exclusion(self):
        with TestClient(create_app(database=self.db, demo=True)) as client:
            self.assertEqual(len(client.get("/api/projects").json()), 8)
            self.assertEqual(len(client.get("/api/scenarios").json()), 1)
            clean = client.get("/api/export/research.json").json()
            self.assertEqual(clean["projects"], [])
            self.assertEqual(clean["scenarios"], [])
            self.assertEqual(len(client.get("/api/export/research.json?include_synthetic=1").json()["projects"]), 8)
