# OmniSignal Security Model

## Wallet Security

- MetaMask connection uses the EIP-1193 provider.
- Authentication uses signed nonce verification.
- Nonces expire and are marked used after verification.
- The backend verifies recovered signer address with `ethers`.
- Seed phrases are never requested.
- Private keys are never stored for user wallets.

## API Key Security

- Provider keys live only in backend environment variables.
- The frontend calls OmniSignal API routes, never paid provider APIs directly.
- Error states expose provider status, not secrets.
- Logs redact authorization headers.
RPC keys and Telegram bot tokens are backend-only.

## Payment Security

- The $25 Premium flow requires a verified MetaMask session.
- Payment goes from the user's MetaMask wallet to the configured OmniSignal treasury wallet.
- Browser wallet state does not activate Premium.
- Premium is activated only after the backend verifies the on-chain ERC-20 transfer.
- Payment transaction hashes are stored uniquely to prevent duplicate subscription activation.
- Every successful Premium activation writes an audit log.

## Trading Safety

- The frontend cannot place Hyperliquid orders.
- Voice cannot execute trades.
- AI can prepare order tickets only.
- Real trading requires visual confirmation in `/portal/trading`.
- `DISABLE_TRADING=true` blocks non-simulation placement.
- `ENABLE_MAINNET_TRADING=false` blocks mainnet.
- `TRADING_MODE` controls allowed runtime mode.
- Every order intent and execution response is persisted.
- Every trading action writes an audit log.

## Rate Limiting

Fastify rate limiting is enabled for public endpoints:

- `RATE_LIMIT_WINDOW_MS`
- `RATE_LIMIT_MAX_REQUESTS`

Provider calls should also be cached through Redis when traffic increases.

## Audit Logs

Audit logs are written for:

- wallet nonce creation
- wallet verification
- portfolio creation
- position changes
- simulations and rebalances
- voice session creation
- order intent creation
- testnet/mainnet submission
- cancellation requests
- premium payment intent creation
- premium subscription activation
- Telegram AI link creation
- signal refreshes

## Data Validation

- Shared Zod schemas validate request bodies and AI output.
- Prisma enforces relational integrity and enum constraints.
- Provider connectors normalize and validate quote/candle data.

## Mainnet Kill Switch

Mainnet execution is blocked unless all are true:

- `DISABLE_TRADING=false`
- `TRADING_MODE=mainnet`
- `ENABLE_MAINNET_TRADING=true`
- backend has a configured Hyperliquid agent key
- user visually confirms the order ticket

## No Voice-Only Execution

The Realtime voice layer exposes safe tools for navigation, analysis, simulation, filtering, and order-ticket preparation. It does not expose an execution tool.

## No Substituted Data

Production code does not render fallback market prices, generated portfolio balances, generated AI content, generated wallet states, or generated Hyperliquid responses. Provider failure must produce empty, loading, error, or unavailable UI.
