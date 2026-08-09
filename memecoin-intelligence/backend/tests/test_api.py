"""API smoke tests with in-process TestClient."""

from fastapi.testclient import TestClient

from app.main import create_app
from app.services.state import state


def test_health_and_reject_separation():
    app = create_app()
    with TestClient(app) as client:
        h = client.get("/health").json()
        assert h["trading_mode"] == "paper"
        assert h["live_execution_enabled"] is False

        opps = client.get("/tokens/opportunities").json()["items"]
        assert all(t["analysis"]["decision"] != "REJECT" for t in opps)
        assert all(t["analysis"]["safety_class"] != "REJECT" for t in opps)

        rejected = client.get("/tokens/rejected").json()["items"]
        assert len(rejected) >= 1
        assert all(t["bucket"] == "rejected" for t in rejected)

        detail = client.get(f"/tokens/{opps[0]['mint']}").json()
        assert "explanation" in detail
        assert detail["axiom"]["pulse_url"].startswith("https://axiom.trade")


def test_paper_open_rejects_rejected_token():
    app = create_app()
    with TestClient(app) as client:
        rejected = client.get("/tokens/rejected").json()["items"][0]
        res = client.post("/portfolio/paper/open", json={"mint": rejected["mint"]}).json()
        assert res["error"] == "REJECTED_TOKEN"
