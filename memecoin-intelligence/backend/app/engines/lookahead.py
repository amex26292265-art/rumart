"""Look-ahead bias guards for historical evaluation."""

from __future__ import annotations

from datetime import datetime, timezone


class LookAheadError(ValueError):
    pass


def ensure_not_future(event_time: datetime, as_of: datetime, label: str = "event") -> None:
    """Raise if event_time is after as_of (future information)."""
    if event_time.tzinfo is None:
        event_time = event_time.replace(tzinfo=timezone.utc)
    if as_of.tzinfo is None:
        as_of = as_of.replace(tzinfo=timezone.utc)
    if event_time > as_of:
        raise LookAheadError(
            f"Look-ahead bias blocked: {label} at {event_time.isoformat()} is after as_of {as_of.isoformat()}"
        )


def filter_available(items: list[dict], timestamp_key: str, as_of: datetime) -> list[dict]:
    """Keep only items with timestamp <= as_of."""
    out: list[dict] = []
    for item in items:
        ts = item.get(timestamp_key)
        if ts is None:
            continue
        if isinstance(ts, str):
            ts_dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        else:
            ts_dt = ts
        if ts_dt.tzinfo is None:
            ts_dt = ts_dt.replace(tzinfo=timezone.utc)
        as_cmp = as_of if as_of.tzinfo else as_of.replace(tzinfo=timezone.utc)
        if ts_dt <= as_cmp:
            out.append(item)
    return out
