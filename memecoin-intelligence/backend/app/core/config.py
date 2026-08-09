"""Application settings — secrets only from environment."""

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Memecoin Intelligence"
    app_env: str = "local"
    log_level: str = "INFO"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: str = "http://localhost:3001,http://127.0.0.1:3001"
    frontend_origin: str = "http://localhost:3001"

    database_url: str = "postgresql+asyncpg://memecoin:memecoin@localhost:5432/memecoin_intelligence"
    database_url_sync: str = "postgresql://memecoin:memecoin@localhost:5432/memecoin_intelligence"
    redis_url: str = "redis://localhost:6379/0"

    trading_mode: Literal["paper"] = "paper"
    paper_starting_balance_usd: float = 40.0
    paper_max_position_usd: float = 5.0
    paper_max_open_positions: int = 5
    live_execution_enabled: bool = False

    stale_price_seconds: int = 30
    stale_holders_seconds: int = 120
    stale_social_seconds: int = 180
    stale_news_seconds: int = 900

    solana_rpc_url: str = "https://api.mainnet-beta.solana.com"
    helius_api_key: str = ""
    helius_rpc_url: str = ""
    jupiter_api_key: str = ""
    birdeye_api_key: str = ""
    dexscreener_base_url: str = "https://api.dexscreener.com"
    pumpportal_ws_url: str = "wss://pumpportal.fun/api/data"

    x_bearer_token: str = ""
    reddit_client_id: str = ""
    reddit_client_secret: str = ""
    reddit_user_agent: str = "memecoin-intelligence/0.1 by local-dev"
    cryptopanic_auth_token: str = ""
    gdelt_enabled: bool = True

    llm_provider: str = "none"
    openai_api_key: str = ""
    anthropic_api_key: str = ""
    llm_model: str = ""

    axiom_pulse_url: str = "https://axiom.trade/pulse"
    axiom_mint_deep_link_template: str = ""

    seed_demo_scenarios: bool = Field(
        default=True,
        description="Load labeled mock scenarios for UI/tests. Never presented as live chain data.",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
