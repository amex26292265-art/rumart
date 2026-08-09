"""API smoke tests with in-process TestClient."""

import os

os.environ["SEED_DEMO_SCENARIOS"] = "true"

from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app
from app.services.scenarios import build_scenarios
from app.services.state import state

get_settings.cache_clear()


def test_health_and_reject_separation():
    state.settings = get_settings()
    state.load_scenarios()
    if not state.tokens:
        state.tokens = build_scenarios()
    app = create_app()
    with TestClient(app) as client:
        h = client.get("/health").json()
        assert h["trading_mode"] == "paper"
        assert h["live_execution_enabled"] is False

        opps = client.get("/tokens/opportunities").json()["items"]
        for t in opps:
            decision = t.get("analysis", {}).get("decision") or t.get("status")
            safety = t.get("analysis", {}).get("safety_class")
            assert decision != "REJECT"
            assert safety != "REJECT"

        rejected = client.get("/tokens/rejected").json()["items"]
        assert isinstance(rejected, list)


def test_paper_open_rejects_rejected_token():
    state.settings = get_settings()
    state.tokens = build_scenarios()
    app = create_app()
    with TestClient(app) as client:
        rejected = [t for t in state.tokens if t.get("bucket") == "rejected"]
        assert rejected
        res = client.post("/portfolio/paper/open", json={"mint": rejected[0]["mint"]}).json()
        assert res["error"] == "REJECTED_TOKEN"


def test_status_explainers_present():
    app = create_app()
    with TestClient(app) as client:
        data = client.get("/meta/status-explainers").json()
        assert "CONSIDER_ENTRY" in data["items"]
