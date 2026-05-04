# OmniSignal Integrations

## Twelve Data

Package: `packages/market-connectors/src/twelve-data.ts`

Used for equities, ETFs, indices, forex, commodities, quotes, and candles.

Configuration:

- `TWELVE_DATA_API_KEY`

Endpoints:

- `/quote`
- `/time_series`

If the key is absent or the provider returns unusable data, the connector raises a provider-unavailable error.

## Finnhub

Package: `packages/market-connectors/src/finnhub.ts`

Used for equity quote and candle fallback where configured.

Configuration:

- `FINNHUB_API_KEY`

Endpoints:

- `/quote`
- `/stock/candle`

## CoinGecko

Package: `packages/market-connectors/src/coingecko.ts`

Used for crypto prices, market caps, 24-hour volume, and 24-hour changes.

Configuration:

- `COINGECKO_API_KEY`

The connector supports explicit symbol-to-id mappings. Unknown symbols must be deliberately mapped before production use.

## Alpha Vantage

Package: `packages/market-connectors/src/alpha-vantage.ts`

Used as a configured fallback for quotes and historical time series.

Configuration:

- `ALPHA_VANTAGE_API_KEY`

Endpoints:

- `GLOBAL_QUOTE`
- `TIME_SERIES_INTRADAY`
- `TIME_SERIES_DAILY_ADJUSTED`

## Hyperliquid Market Data

Package: `packages/market-connectors/src/hyperliquid-market.ts`

Used for perps and market metadata.

Configuration:

- `HYPERLIQUID_API_BASE`
- `HYPERLIQUID_WS_URL`

Endpoints:

- `/info` with `allMids`
- `/info` with `metaAndAssetCtxs`

## OpenAI AI Analysis

Package: `packages/ai/src/service.ts`

Used for structured asset analysis, portfolio analysis, nudge generation, order explanations, and voice-command responses.

Configuration:

- `OPENAI_API_KEY`

The API requests structured JSON and validates results with Zod before rendering or storing.

## OpenAI Realtime Voice

Package: `packages/ai/src/voice.ts` and `apps/web/lib/use-realtime-voice.ts`

Flow:

1. Frontend requests `/ai/voice/session`.
2. Backend creates a short-lived OpenAI Realtime session.
3. Browser uses the ephemeral client secret to establish a WebRTC session.
4. Voice tools can navigate, simulate, analyze, filter, and prepare order tickets.
5. Voice tools cannot execute real trades.

Configuration:

- `OPENAI_API_KEY`
- `OPENAI_REALTIME_MODEL`

## MetaMask

Frontend:

- EIP-1193 `eth_requestAccounts`
- `personal_sign`
- account and chain listeners

Backend:

- `/auth/wallet/nonce`
- `/auth/wallet/verify`
- ethers signature recovery
- JWT session creation

No private keys or seed phrases are requested.

## Wallet-Paid Premium Subscription

Backend:

- `POST /billing/payment-intent`
- `POST /billing/confirm-wallet-payment`
- `GET /billing/subscription`

Configuration:

- `PREMIUM_PRICE_USD=25`
- `PREMIUM_SUBSCRIPTION_DAYS`
- `PREMIUM_TREASURY_ADDRESS`
- `PREMIUM_PAYMENT_NETWORK_NAME`
- `PREMIUM_PAYMENT_CHAIN_ID`
- `PREMIUM_PAYMENT_TOKEN_SYMBOL`
- `PREMIUM_PAYMENT_TOKEN_ADDRESS`
- `PREMIUM_PAYMENT_TOKEN_DECIMALS`
- `EVM_RPC_URL`

Flow:

1. User must have a verified MetaMask session.
2. Backend creates a $25 payment intent for the configured EVM chain and token.
3. Frontend sends an ERC-20 transfer from MetaMask to `PREMIUM_TREASURY_ADDRESS`.
4. Frontend submits the transaction hash.
5. Backend verifies the transaction receipt and token `Transfer` event through `EVM_RPC_URL`.
6. Backend stores a `Payment` row and activates `PremiumSubscription`.

The frontend transaction hash is not trusted by itself. Only backend on-chain verification can activate Premium.

## Telegram AI

Backend:

- `GET /messaging/telegram/status`
- `POST /messaging/telegram/link-code`
- `POST /messaging/telegram/webhook`

Configuration:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_USERNAME`
- `TELEGRAM_WEBHOOK_SECRET`

Flow:

1. Premium user creates a Telegram link code in Settings.
2. User opens the bot link.
3. Telegram webhook sends `/start CODE`.
4. Backend links that Telegram chat to the Premium wallet.
5. User messages the bot.
6. Backend calls OpenAI with portfolio context and sends the response through Telegram.

## Hyperliquid Trading

Package: `packages/trading/src/hyperliquid-service.ts`

Modes:

- `simulation`: live prices and stored simulation/order-intent records, no external execution.
- `testnet`: submits only to Hyperliquid testnet when trading is enabled.
- `mainnet`: disabled unless explicitly enabled.

Configuration:

- `DISABLE_TRADING`
- `TRADING_MODE`
- `ENABLE_MAINNET_TRADING`
- `HYPERLIQUID_NETWORK`
- `HYPERLIQUID_API_BASE`
- `HYPERLIQUID_WS_URL`
- `HYPERLIQUID_AGENT_PRIVATE_KEY`
- `HYPERLIQUID_TAKER_FEE_BPS`

Safety:

- server-side validation
- duplicate-intent prevention
- visible confirmation required
- audit logs
- execution response persistence
