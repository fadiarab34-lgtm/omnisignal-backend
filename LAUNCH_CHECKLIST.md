# OmniSignal Launch Checklist

This is the plain-English setup list for taking OmniSignal live on `omnisignal.xyz`.

## Confirmed Launch Values

- Domain: `omnisignal.xyz`
- Domain provider: `.xyz`
- Current parked nameservers: `parking1.gen.xyz`, `parking2.gen.xyz`
- GitHub repo: `https://github.com/fadiarab34-lgtm/omnisignal-backend.git`
- Premium receiving wallet: `0x839D8ADD3C28b6467813E4d0475801AB7d432C53`
- Premium payment: Base USDC, 25 USDC

## Where API Keys Go

Do not paste private keys into the website code or into chat.

Use these places:

- Backend secrets: Railway or Render environment variables.
- Frontend public URLs: Vercel environment variables.
- Local testing only: root `.env`, copied from `.env.example`.

Backend-only secrets:

- `DATABASE_URL`
- `REDIS_URL`
- `OPENAI_API_KEY`
- `TWELVE_DATA_API_KEY`
- `FINNHUB_API_KEY`
- `COINGECKO_API_KEY`
- `ALPHA_VANTAGE_API_KEY`
- `PREMIUM_TREASURY_ADDRESS`
- `PREMIUM_PAYMENT_TOKEN_ADDRESS`
- `EVM_RPC_URL`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_WEBHOOK_SECRET`
- `JWT_SECRET`
- `HYPERLIQUID_AGENT_PRIVATE_KEY`

Frontend variables:

- `NEXT_PUBLIC_API_URL=https://api.omnisignal.xyz`
- `NEXT_PUBLIC_WS_URL=wss://api.omnisignal.xyz/market/live`

## Recommended Launch Setup

Use this simple vendor split:

- Domain: `omnisignal.xyz`
- Frontend: Vercel
- Backend: Railway
- Database: Railway Postgres
- Redis: Railway Redis
- Payments: MetaMask wallet transfer verified by backend

## Step 1: Buy The Domain

Done: `omnisignal.xyz` has been purchased.

Do not change DNS yet. First create the deployments so Vercel and Railway can tell you the exact DNS records.

## Step 2: Create Accounts

Create accounts for:

- Vercel
- Railway
- Telegram
- OpenAI
- Twelve Data
- Finnhub
- CoinGecko
- Alpha Vantage

Hyperliquid can stay in safe simulation mode until testnet credentials are ready.

## Step 3: Deploy Backend On Railway

Create a Railway project with:

- Web service for `apps/api`
- Postgres database
- Redis database

Backend build command:

```bash
pnpm install --frozen-lockfile && pnpm --filter @omnisignal/api build
```

Backend start command:

```bash
pnpm --filter @omnisignal/api start
```

Migration command:

```bash
pnpm --filter @omnisignal/api prisma:migrate
```

Set backend environment variables from `.env.example`.

## Step 4: Add API Domain

In Railway, add the custom domain:

```text
api.omnisignal.xyz
```

Railway will show a DNS record. Add that record where you bought the domain.

Then set:

```text
BACKEND_URL=https://api.omnisignal.xyz
API_URL=https://api.omnisignal.xyz
FRONTEND_URL=https://omnisignal.xyz
CORS_ALLOWED_ORIGINS=https://omnisignal.xyz,https://www.omnisignal.xyz
```

## Step 5: Deploy Frontend On Vercel

Create a Vercel project from the monorepo.

Recommended settings:

```text
Root Directory: .
Install Command: pnpm install --frozen-lockfile
Build Command: pnpm --filter @omnisignal/web build
Output Directory: apps/web/.next
```

Set frontend variables:

```text
NEXT_PUBLIC_API_URL=https://api.omnisignal.xyz
NEXT_PUBLIC_WS_URL=wss://api.omnisignal.xyz/market/live
```

## Step 6: Add Website Domain

In Vercel, add:

```text
omnisignal.xyz
www.omnisignal.xyz
```

Vercel will show DNS records. Add them at the domain provider.

## Step 7: Configure $25 MetaMask Premium Payment

Choose the wallet where subscription payments should arrive. This should be a treasury wallet you control, not a user wallet.

Recommended launch setup:

```text
Network: Base
Token: USDC
Price: 25 USDC
```

Set these backend env variables:

```text
PREMIUM_PRICE_USD=25
PREMIUM_SUBSCRIPTION_DAYS=30
PREMIUM_TREASURY_ADDRESS=0x839D8ADD3C28b6467813E4d0475801AB7d432C53
PREMIUM_PAYMENT_NETWORK_NAME=Base
PREMIUM_PAYMENT_CHAIN_ID=8453
PREMIUM_PAYMENT_TOKEN_SYMBOL=USDC
PREMIUM_PAYMENT_TOKEN_ADDRESS=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
PREMIUM_PAYMENT_TOKEN_DECIMALS=6
EVM_RPC_URL=your Base RPC URL
```

The flow is:

1. User connects MetaMask.
2. User clicks `Premium $25`.
3. MetaMask sends the token transfer to your treasury wallet.
4. Backend verifies the transaction on-chain.
5. OmniSignal stores Premium for that wallet.

## Step 8: Configure Telegram AI

Create a Telegram bot through BotFather.

Set backend env variables:

```text
TELEGRAM_BOT_TOKEN=from BotFather
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_WEBHOOK_SECRET=random long secret
```

Set Telegram webhook to:

```text
https://api.omnisignal.xyz/messaging/telegram/webhook
```

Use the secret token header with the same `TELEGRAM_WEBHOOK_SECRET`.

## Step 9: Keep Trading Safe

Use these launch defaults:

```text
DISABLE_TRADING=true
TRADING_MODE=simulation
ENABLE_MAINNET_TRADING=false
```

Only enable Hyperliquid testnet after credentials are configured and tested.

## What I Need From You

Needed before launch:

- Which deployment account you want to use: Vercel plus Railway is recommended.
- API keys from OpenAI and at least one market provider.
- Telegram bot token if you want Telegram AI at launch.
- Permission to connect the code repo to Vercel and Railway.

Do not send live secrets in chat. Put them directly into the host environment-variable screens.
