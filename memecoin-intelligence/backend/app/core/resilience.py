"""Resilience helpers: retry, circuit breaker, staleness."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from time import monotonic
from typing import Any, Callable, TypeVar

from tenacity import retry, retry_if_exception_type, stop_after_attempt, wait_exponential

T = TypeVar("T")


class DataStatus(str, Enum):
    OK = "OK"
    STALE = "STALE"
    UNKNOWN = "UNKNOWN"
    INSUFFICIENT = "INSUFFICIENT"
    ERROR = "ERROR"


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def age_seconds(source_ts: datetime | None, now: datetime | None = None) -> float | None:
    if source_ts is None:
        return None
    now = now or utcnow()
    if source_ts.tzinfo is None:
        source_ts = source_ts.replace(tzinfo=timezone.utc)
    return max(0.0, (now - source_ts).total_seconds())


def classify_freshness(
    source_ts: datetime | None,
    max_age_seconds: float,
    now: datetime | None = None,
) -> DataStatus:
    if source_ts is None:
        return DataStatus.INSUFFICIENT
    age = age_seconds(source_ts, now)
    if age is None:
        return DataStatus.INSUFFICIENT
    if age > max_age_seconds:
        return DataStatus.STALE
    return DataStatus.OK


def with_backoff(fn: Callable[..., T]) -> Callable[..., T]:
    """Decorator factory for exponential backoff on network-ish errors."""

    return retry(
        reraise=True,
        stop=stop_after_attempt(4),
        wait=wait_exponential(multiplier=1, min=1, max=16),
        retry=retry_if_exception_type((TimeoutError, ConnectionError, OSError)),
    )(fn)


@dataclass
class CircuitBreaker:
    failure_threshold: int = 5
    recovery_seconds: float = 30.0
    failures: int = 0
    opened_at: float | None = None
    state: str = "closed"

    def allow(self) -> bool:
        if self.state != "open":
            return True
        assert self.opened_at is not None
        if monotonic() - self.opened_at >= self.recovery_seconds:
            self.state = "half_open"
            return True
        return False

    def record_success(self) -> None:
        self.failures = 0
        self.state = "closed"
        self.opened_at = None

    def record_failure(self) -> None:
        self.failures += 1
        if self.failures >= self.failure_threshold:
            self.state = "open"
            self.opened_at = monotonic()


@dataclass
class Provenance:
    source: str
    source_timestamp: datetime | None
    ingestion_timestamp: datetime
    reliability: float
    mint: str | None = None
    status: DataStatus = DataStatus.OK
    extra: dict[str, Any] = field(default_factory=dict)

    @property
    def age_seconds(self) -> float | None:
        return age_seconds(self.source_timestamp, self.ingestion_timestamp)

    def to_dict(self) -> dict[str, Any]:
        return {
            "source": self.source,
            "source_timestamp": self.source_timestamp.isoformat() if self.source_timestamp else None,
            "ingestion_timestamp": self.ingestion_timestamp.isoformat(),
            "age_seconds": self.age_seconds,
            "reliability": self.reliability,
            "mint": self.mint,
            "status": self.status.value,
            "extra": self.extra,
        }
