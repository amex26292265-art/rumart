# MEMECOIN INTELLIGENCE — Data Sources

**Research date:** 2026-08-09  
**Rule:** Only use documented/authorized interfaces. Never invent endpoints. Never scrape protected APIs. Never steal cookies or automate login to bypass auth.

For every ingested datum the system stores: `source`, `source_timestamp`, `ingestion_timestamp`, `age_seconds`, `reliability`, and `mint` when applicable.

---

## 1. Axiom Trade

| Field | Value |
| --- | --- |
| Purpose | Trader terminal the user already uses; deep-link / UX parity only |
| Official docs | https://docs.axiom.trade |
| Documented public developer API? | **No** (product/trader docs only as of research date) |
| Authentication | N/A for our ingestion — we do **not** integrate undocumented APIs |
| Rate limits | N/A |
| Cost | N/A |
| WebSocket | Not used (community SDKs requiring browser tokens are forbidden) |
| Data freshness | N/A |
| Fallback | DexScreener + Helius + Jupiter + PumpPortal + Solana RPC |
| Dashboard action | **COPY CONTRACT ADDRESS** + open documented Pulse page `https://axiom.trade/pulse` |
| Deep link | No mint deep-link format is documented in official Axiom docs. Do not invent one. If Axiom publishes one later, add `AxiomDeepLinkAdapter`. |

**Forbidden:** ChipaDevTeam / community “AxiomTradeAPI” patterns that harvest browser auth cookies, automate OTP login, or hit undocumented private endpoints.

---

## 2. DexScreener

| Field | Value |
| --- | --- |
| Purpose | Pair/token market snapshots: price, liquidity, volume, txns, mcap, social links, new profiles/boosts |
| Official docs | https://docs.dexscreener.com/api/reference |
| Authentication | None for public REST |
| Rate limits | Profiles/boosts/orders/metas ≈ **60 req/min**; pair/search/token routes ≈ **300 req/min** (per IP). HTTP 429 on exceed |
| Cost / free tier | Free public API; no paid higher-limit tier documented |
| WebSocket | **Not available** on public API (snapshot REST only) |
| Data freshness | Near-real-time snapshots; no historical OHLCV on free API |
| Fallback | Birdeye (paid), Jupiter Price API, Helius-enhanced market enrichment |

Key endpoints (documented):
- `GET /latest/dex/search?q=`
- `GET /latest/dex/pairs/{chainId}/{pairId}`
- `GET /tokens/v1/{chainId}/{tokenAddresses}` (up to 30)
- `GET /token-pairs/v1/{chainId}/{tokenAddress}`
- `GET /token-profiles/latest/v1`
- `GET /token-boosts/latest/v1`, `/token-boosts/top/v1`
- `GET /metas/trending/v1`

---

## 3. Helius (Solana RPC + DAS + enhanced WS)

| Field | Value |
| --- | --- |
| Purpose | On-chain token metadata, holders/owners, transactions, realtime account/tx subscriptions |
| Official docs | https://www.helius.dev/docs |
| DAS API | https://www.helius.dev/docs/das-api |
| Authentication | API key query param on RPC URL (`?api-key=`) |
| Rate limits | Plan-based RPS (Free ~2 rps, Developer ~10, Business ~50, Professional ~100 — verify on current billing docs) |
| Cost / free tier | Free tier available; paid plans for higher throughput / LaserStream |
| WebSocket | Yes — standard Solana pubsub + enhanced subscriptions / LaserStream (plan-gated) |
| Data freshness | Chain tip (RPC commitment configurable); DAS indexed state may lag slightly |
| Fallback | Public Solana RPC (lower reliability), alternative DAS providers |

Useful methods: `getAsset`, `getAssetsByOwner`, `getTokenAccounts`, `searchAssets`, `transactionSubscribe`.

---

## 4. Jupiter Price API v3

| Field | Value |
| --- | --- |
| Purpose | Heuristics-based USD prices + liquidity hints for Solana mints |
| Official docs | https://developers.jup.ag/docs/price |
| Authentication | `x-api-key` header from https://developers.jup.ag/portal |
| Rate limits / credits | Portal plans (Free ~1 RPS documented in portal plans; verify current portal) |
| Cost / free tier | Free plan with credit/RPS limits; paid tiers available |
| WebSocket | No (poll + store) |
| Data freshness | Last-swapped heuristics; `blockId` when present |
| Fallback | DexScreener pair `priceUsd`, Birdeye price |

Endpoint: `GET https://api.jup.ag/price/v3?ids={comma_separated_mints}` (max 50 ids).

---

## 5b. Bybit Spot (public)

| Field | Value |
| --- | --- |
| Purpose | CEX Spot opportunity scanner: instruments, tickers, fast movers, early-move phases |
| Official docs | https://bybit-exchange.github.io/docs/v5/market/instrument · https://bybit-exchange.github.io/docs/v5/websocket/public/ticker |
| Authentication | None for public market REST/WS |
| REST | `GET /v5/market/instruments-info?category=spot`, `GET /v5/market/tickers?category=spot` |
| WebSocket | `wss://stream.bybit.com/v5/public/spot` topic `tickers.{symbol}` |
| Rate limits | See Bybit docs; public WS arg limits (Spot ≤10 args per subscribe message) |
| Cost | Free public market data |
| Fallback discovery | CoinGecko `exchanges/bybit_spot/tickers` when Bybit REST is geo-blocked (documented; provenance labeled) |
| Note | Some cloud regions receive HTTP 403 from Bybit CloudFront REST while WS still works |

---

| Field | Value |
| --- | --- |
| Purpose | Near-real-time new Pump.fun token creations and trade streams |
| Official site / docs | https://pumpportal.fun (public Data API documented on site/README) |
| Authentication | Data WebSocket: none for subscribe methods; Trading API requires key (we do **not** use trading for paper mode) |
| Rate limits | Subject to provider limits; reconnect with backoff |
| Cost / free tier | Data stream free per provider docs; trading charges fees (out of scope for paper) |
| WebSocket | Yes — `wss://pumpportal.fun/api/data` |
| Methods | `subscribeNewToken`, `subscribeTokenTrade`, `subscribeAccountTrade` |
| Data freshness | Event-driven |
| Fallback | DexScreener token profiles / Helius program listeners |

**Note:** PumpPortal is a third-party interface to Pump.fun activity. Treat payloads as untrusted input. Prefer cross-checking mints with on-chain / DexScreener before bullish classification.

---

## 6. Birdeye (optional paid)

| Field | Value |
| --- | --- |
| Purpose | Rich Solana market, OHLCV, wallet tracking, WS price streams |
| Official docs | https://docs.birdeye.so |
| Authentication | `X-API-KEY` / `x-api-key` |
| Rate limits | Plan CU quotas (Starter ~60 req/min cited in FAQ; verify dashboard) |
| Cost / free tier | Standard free CU tier; WebSocket requires higher paid plans (Premium Plus / Business per FAQ) |
| WebSocket | Yes on eligible plans — `wss://public-api.birdeye.so/socket/solana?x-api-key=` |
| Data freshness | Real-time on WS; REST polling otherwise |
| Fallback | DexScreener + Jupiter |

---

## 7. Solana RPC (generic)

| Field | Value |
| --- | --- |
| Purpose | Direct chain reads: accounts, signatures, token supply, slot time |
| Official docs | https://solana.com/docs/rpc |
| Authentication | Provider-dependent (Helius/QuickNode/public) |
| Rate limits | Provider-dependent |
| Cost | Public endpoints free but unreliable; paid recommended |
| WebSocket | Yes (`accountSubscribe`, `logsSubscribe`, etc.) |
| Data freshness | Commitment-level dependent |
| Fallback | Alternate RPC URL list with health failover |

---

## 8. X (Twitter) API v2

| Field | Value |
| --- | --- |
| Purpose | Mention velocity, authors, engagement for tickers/narratives |
| Official docs | https://docs.x.com / https://developer.x.com |
| Authentication | OAuth 2.0 Bearer / user tokens |
| Rate limits | Per-endpoint (e.g. recent search often ~450/15min app — verify live headers). Pay-per-use billing as of 2026 for new apps |
| Cost / free tier | Free tier discontinued for new apps (2026); pay-per-use or legacy Basic/Pro |
| WebSocket / stream | Filtered stream on higher tiers |
| Data freshness | Recent search = last 7 days window on standard access |
| Fallback | News/Reddit only; social features marked INSUFFICIENT if no key |

**Forbidden:** Scraping x.com HTML or unofficial scrapers that violate X ToS.

---

## 9. Reddit Data API

| Field | Value |
| --- | --- |
| Purpose | Subreddit monitoring (`solana`, `CryptoMoonShots`, etc.) |
| Official docs | https://www.reddit.com/dev/api/ · Help wiki: https://support.reddithelp.com/hc/en-us/articles/16160319875092-Reddit-Data-API-Wiki |
| Authentication | OAuth2 + custom User-Agent |
| Rate limits | Free authenticated ≈ **100 QPM** per client (averaged over ~10 min); honor `X-Ratelimit-*` headers |
| Cost / free tier | Free for eligible non-commercial; commercial requires agreement |
| WebSocket | No |
| Data freshness | Polling (new/hot listings) |
| Fallback | RSS where available; news providers |

---

## 10. News / Narrative Sources

### GDELT DOC 2.0 (public project API)
| Field | Value |
| --- | --- |
| Purpose | Global news article search / RSS for breaking narratives |
| Docs | https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/ · `https://api.gdeltproject.org/api/v2/doc/doc` |
| Auth | None for classic DOC API |
| Rate limits | Be polite; cache; dedupe |
| Cost | Free public API |
| WS | No |
| Freshness | Minutes-level (query `timespan`) |
| Fallback | CryptoPanic, curated RSS |

### GDELT Cloud (optional)
| Field | Value |
| --- | --- |
| Purpose | Structured events/stories |
| Docs | https://docs.gdeltcloud.com |
| Auth | Bearer API key |
| Cost | Free signup + paid plans |

### CryptoPanic
| Field | Value |
| --- | --- |
| Purpose | Crypto-specific news aggregation |
| Docs | https://cryptopanic.com/developers/api/ |
| Auth | API token |
| Fallback | GDELT + RSS |

### Curated RSS
CoinDesk, The Block, Solana Foundation blog, etc. — store URL + published time; **dedupe** and prefer original source timestamps so reposts are not treated as breaking.

---

## 11. LLM Providers (explanation / narrative matching only)

| Field | Value |
| --- | --- |
| Purpose | Narrative detection, semantic token↔news matching, summarization, explanation |
| Options | OpenAI / Anthropic official APIs (keys in `.env`) |
| Auth | Bearer API key |
| Constraint | **Must not invent numbers.** Prompt receives structured evidence JSON; output must cite evidence IDs |
| Fallback | Template explanations from deterministic engines |

---

## 12. Provenance Envelope (all providers)

```json
{
  "source": "dexscreener.tokens.v1",
  "source_timestamp": "2026-08-09T09:50:01.000Z",
  "ingestion_timestamp": "2026-08-09T09:50:02.120Z",
  "age_seconds": 61.2,
  "reliability": 0.85,
  "mint": "So1111...optional",
  "status": "OK | STALE | UNKNOWN | INSUFFICIENT | ERROR",
  "payload": {}
}
```

Staleness thresholds are configurable per data class (e.g. price quotes 15–30s, holder snapshots 60–120s, news 5–15m).

---

## 13. Phase 1 Provider Status

| Provider | Interface | Phase 1 implementation |
| --- | --- | --- |
| DexScreener | MarketData / Discovery | Interface + HTTP client stub (disabled without network config) |
| Helius | OnChain | Interface + stub |
| Jupiter | MarketData | Interface + stub |
| PumpPortal | TokenDiscovery | Interface + stub |
| Birdeye | MarketData | Interface only |
| X API | Social | Interface only |
| Reddit | Social | Interface only |
| GDELT / RSS / CryptoPanic | News | Interface + stub RSS reader |
| LLM | LLM | Interface + template explainer |
| MockScenarioProvider | All | **Active in Phase 1 tests** — labeled `source=mock.scenario`, never presented as live market data |
