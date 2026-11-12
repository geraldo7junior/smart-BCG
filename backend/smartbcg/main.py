from contextlib import asynccontextmanager
import csv
import hashlib
import io
import json
import os
from pathlib import Path

from fastapi import Body, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

from . import models
from .demo import seed
from .engine import ANCHORS, CATALOG, MODEL_VERSION, QUADRANTS, analyze, evaluate_policy
from .store import TABLES, Store, get, now, put, records, update


def require(db, table, ident, project=None):
    item = get(db, table, ident)
    if item is None or (project is not None and item.get("project_id") != project):
        raise HTTPException(404, "Registro não encontrado.")
    return item


def payload(data):
    return data.model_dump(mode="json")


def project_rows(db):
    latest = {}
    for review in records(db, "reviews"):
        latest.setdefault(review["project_id"], review)
    decisions = {}
    for decision in records(db, "decisions"):
        decisions.setdefault(decision["project_id"], decision)
    return [
        {**item, "review": latest.get(item["id"]), "decision": decisions.get(item["id"])}
        for item in reversed(records(db, "projects"))
    ]


def summarize_benefits(benefits, observations):
    output = []
    for benefit in benefits:
        history = [item for item in observations if item["benefit_id"] == benefit["id"]]
        history.sort(key=lambda item: item["measured_on"], reverse=True)
        observed = history[0]["value"] if history else None
        progress = ((observed - benefit["baseline"]) / (benefit["target"] - benefit["baseline"])
                    if observed is not None else None)
        output.append({**benefit, "observations": history, "progress": progress})
    return output


def scenario_project_row(scenario, project_id):
    return next((row for row in scenario["results"]["baseline"]["rows"] if row["id"] == project_id), None)


def research_export(db, include_synthetic, include_text):
    tables = {table: records(db, table) for table in TABLES if table != "legacy"}
    synthetic = {item["id"] for item in tables["projects"] if item["origin"] == "synthetic"}
    if not include_synthetic:
        tables["projects"] = [item for item in tables["projects"] if item["id"] not in synthetic]
        for table in ("reviews", "decisions", "actions", "action_events", "benefits", "observations"):
            tables[table] = [item for item in tables[table] if item["project_id"] not in synthetic]
        # The optimizer was run on the original candidate set. Dropping rows would misrepresent its result.
        tables["scenarios"] = [item for item in tables["scenarios"]
                               if not synthetic.intersection(item["project_ids"])]
        scenario_ids = {item["id"] for item in tables["scenarios"]}
        for decision in tables["decisions"]:
            if decision.get("scenario_id") and decision["scenario_id"] not in scenario_ids:
                decision["scenario_id"] = None
                decision["scenario_omitted"] = True
    return tables if include_text else redact(tables)


def redact(value):
    private = {"evidence", "description", "rationale", "name", "objective", "owner", "title", "reviewer", "cycle"}
    if isinstance(value, dict):
        return {key: redact(item) for key, item in value.items() if key not in private}
    if isinstance(value, list):
        return [redact(item) for item in value]
    return value


def create_app(database=None, demo=None, frontend=None):
    @asynccontextmanager
    async def lifespan(app):
        app.state.store = Store(database) if database is not None else Store.configured()
        demo_enabled = demo if demo is not None else os.getenv("SMARTBCG_DEMO", "1") == "1"
        if demo_enabled:
            seed(app.state.store)
        yield

    app = FastAPI(title="SmartBCG", version="1.0.0", lifespan=lifespan)

    def db(write=False):
        return app.state.store.connection(write)

    @app.get("/api/health")
    def health():
        return {"status": "ok", "version": MODEL_VERSION}

    @app.get("/api/model")
    def model():
        return {"version": MODEL_VERSION, "criteria": CATALOG, "quadrants": QUADRANTS, "anchors": ANCHORS}

    @app.get("/api/projects")
    def list_projects():
        with db() as conn:
            return project_rows(conn)

    @app.post("/api/projects", status_code=201)
    def create_project(data: models.Project):
        with db(True) as conn:
            return put(conn, "projects", {**payload(data), "origin": "user"})

    @app.get("/api/projects/{pid}")
    def project(pid: str):
        with db() as conn:
            item = require(conn, "projects", pid)
            result = {key: records(conn, key, pid) for key in ("reviews", "decisions", "actions", "action_events")}
            benefits = summarize_benefits(records(conn, "benefits", pid), records(conn, "observations", pid))
            scenarios = []
            for saved in records(conn, "scenarios"):
                row = scenario_project_row(saved, pid)
                if row and row["review_id"]:
                    scenarios.append({"id": saved["id"], "name": saved["name"], "review_id": row["review_id"]})
            return {**item, **result, "benefits": benefits, "scenario_links": scenarios}

    @app.put("/api/projects/{pid}")
    def edit_project(pid: str, data: models.Project):
        with db(True) as conn:
            project = require(conn, "projects", pid)
            return update(conn, "projects", {**project, **payload(data)})

    @app.post("/api/projects/{pid}/reviews", status_code=201)
    def review(pid: str, data: models.Review):
        submitted = payload(data)
        ratings = submitted["ratings"]
        if not ratings.keys() <= {item["key"] for item in CATALOG}:
            raise HTTPException(422, "A avaliação contém critérios desconhecidos.")
        with db(True) as conn:
            project = require(conn, "projects", pid)
            return put(conn, "reviews", {
                **submitted, "analysis": analyze(ratings), "catalog": CATALOG, "project_snapshot": project,
            }, project=pid)

    @app.post("/api/projects/{pid}/reviews/{rid}/decisions", status_code=201)
    def decision(pid: str, rid: str, data: models.Decision):
        with db(True) as conn:
            review = require(conn, "reviews", rid, pid)
            if data.scenario_id:
                saved = require(conn, "scenarios", data.scenario_id)
                row = scenario_project_row(saved, pid)
                if not row or row["review_id"] != rid:
                    raise HTTPException(422, "Selecione um cenário que tenha usado esta avaliação.")
            recommendation = review["analysis"]["choice"]
            return put(conn, "decisions", {
                **payload(data), "review_id": rid, "recommendation": recommendation,
                "override": recommendation != data.choice,
            }, project=pid)

    @app.post("/api/projects/{pid}/decisions/{did}/actions", status_code=201)
    def action(pid: str, did: str, data: models.Action):
        with db(True) as conn:
            require(conn, "decisions", did, pid)
            action = put(conn, "actions", {**payload(data), "decision_id": did}, project=pid)
            put(conn, "action_events", {"action_id": action["id"], "snapshot": action}, project=pid)
            return action

    @app.put("/api/projects/{pid}/actions/{aid}")
    def edit_action(pid: str, aid: str, data: models.Action, revision: str = Query()):
        with db(True) as conn:
            action = require(conn, "actions", aid, pid)
            if revision != (action.get("updated_at") or action["created_at"]):
                raise HTTPException(409, "A ação mudou desde a abertura. Recarregue o projeto.")
            updated = update(conn, "actions", {**action, **payload(data)})
            put(conn, "action_events", {"action_id": aid, "snapshot": updated}, project=pid)
            return updated

    @app.post("/api/projects/{pid}/decisions/{did}/benefits", status_code=201)
    def benefit(pid: str, did: str, data: models.Benefit):
        with db(True) as conn:
            require(conn, "decisions", did, pid)
            return put(conn, "benefits", {**payload(data), "decision_id": did}, project=pid)

    @app.post("/api/projects/{pid}/benefits/{bid}/observations", status_code=201)
    def observation(pid: str, bid: str, data: models.Observation):
        with db(True) as conn:
            require(conn, "benefits", bid, pid)
            return put(conn, "observations", {**payload(data), "benefit_id": bid}, project=pid)

    @app.get("/api/scenarios")
    def scenarios():
        with db() as conn:
            return records(conn, "scenarios")

    @app.post("/api/scenarios", status_code=201)
    def scenario(data: models.Scenario):
        submitted = payload(data)
        with db(True) as conn:
            projects = project_rows(conn)
            if not any(item["review"] for item in projects):
                raise HTTPException(422, "Avalie ao menos um projeto para simular.")
            try:
                results = {key: evaluate_policy(projects, submitted[key]) for key in ("baseline", "proposed")}
            except ValueError as error:
                raise HTTPException(422, str(error)) from error
            return put(conn, "scenarios", {
                **submitted, "version": MODEL_VERSION, "results": results,
                "project_ids": [item["id"] for item in projects],
            })

    @app.get("/api/study")
    def study():
        with db() as conn:
            return records(conn, "study")

    @app.post("/api/study", status_code=201)
    def study_record(data: models.StudyRun):
        key = [data.participant, data.case_code, data.period]
        fingerprint = hashlib.sha256(json.dumps(key).encode()).hexdigest()
        with db(True) as conn:
            if get(conn, "study", fingerprint):
                raise HTTPException(409, "Já existe registro para este participante, caso e período.")
            return put(conn, "study", payload(data), ident=fingerprint)

    @app.get("/api/export/study.csv")
    def study_csv(include_text: bool = False):
        fields = ["participant", "case_code", "case_version", "condition", "period", "elapsed_seconds",
                  "choice", "confidence", "created_at"]
        if include_text:
            fields.append("rationale")
        stream = io.StringIO(newline="")
        writer = csv.DictWriter(stream, fields, extrasaction="ignore")
        writer.writeheader()
        with db() as conn:
            for item in reversed(records(conn, "study")):
                safe = {key: "'" + value if isinstance(value, str) and value[:1] in "=+-@\t\r\n"
                        and value else value for key, value in item.items()}
                writer.writerow(safe)
        return Response("\ufeff" + stream.getvalue(), media_type="text/csv; charset=utf-8",
                        headers={"Content-Disposition": 'attachment; filename="smartbcg-estudo.csv"'})

    @app.get("/api/export/research.json")
    def export(include_synthetic: bool = False, include_text: bool = False):
        with db() as conn:
            data = research_export(conn, include_synthetic, include_text)
        return JSONResponse({"schema_version": 1, "model_version": MODEL_VERSION, "exported_at": now(), **data},
                            headers={"Content-Disposition": 'attachment; filename="smartbcg-pesquisa.json"'})

    @app.get("/api/legacy")
    def legacy():
        with db() as conn:
            return records(conn, "legacy")

    @app.post("/api/legacy", status_code=201)
    def import_legacy(rows: list[dict] = Body(min_length=1, max_length=500)):
        prepared = []
        for row in rows:
            name = row.get("projectName")
            dimensions = {key: value for key, value in row.items() if key.startswith("dimension")}
            if not isinstance(name, str) or not 1 < len(name.strip()) <= 140 or not dimensions:
                raise HTTPException(422, "Cada linha legada deve conter projectName e ao menos um campo dimension*.")
            if len(row) > 24 or any(not isinstance(value, (str, int, float, type(None))) for value in row.values()):
                raise HTTPException(422, "Use o formato tabular dos protótipos Hoshin.")
            if any(isinstance(value, str) and len(value) > 2000 for value in row.values()):
                raise HTTPException(422, "Há um campo legado acima de 2.000 caracteres.")
            try:
                encoded = json.dumps(row, ensure_ascii=False, sort_keys=True, allow_nan=False).encode()
            except ValueError as error:
                raise HTTPException(422, "A linha legada contém valor numérico inválido.") from error
            prepared.append((hashlib.sha256(encoded).hexdigest(), row, name.strip()))
        imported = 0
        with db(True) as conn:
            for ident, row, name in prepared:
                if get(conn, "legacy", ident):
                    continue
                put(conn, "legacy", {"name": name, "raw": row}, ident=ident)
                imported += 1
        return {"imported": imported, "duplicates": len(rows) - imported}

    dist = Path(frontend) if frontend is not None else Path(__file__).resolve().parents[2] / "frontend" / "dist"
    if (dist / "index.html").is_file():
        if (dist / "assets").is_dir():
            app.mount("/assets", StaticFiles(directory=dist / "assets"), name="assets")

        @app.get("/{path:path}", include_in_schema=False)
        def frontend_route(path: str):
            if path == "api" or path.startswith("api/"):
                raise HTTPException(404, "Endpoint não encontrado.")
            return FileResponse(dist / "index.html")

    return app


app = create_app()
