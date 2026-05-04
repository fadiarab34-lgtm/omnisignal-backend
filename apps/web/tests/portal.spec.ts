import { expect, test } from "@playwright/test";

test("homepage navigates to portal", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Open Portal" }).click();
  await expect(page.getByText("Global Intelligence")).toBeVisible();
});

test("portfolio is hidden before wallet connection", async ({ page }) => {
  await page.goto("/portal/portfolio");
  await expect(page.getByText("Connect your wallet to view portfolios.")).toBeVisible();
  await expect(page.getByText("No portfolio yet.")).not.toBeVisible();
});

test("connect wallet flow uses EIP-1193 at the test layer", async ({ page }) => {
  await page.route("**/auth/wallet/nonce?**", (route) => route.fulfill({ json: { message: "OmniSignal wallet verification\nNonce: test" } }));
  await page.route("**/auth/wallet/verify", (route) => route.fulfill({ json: { token: "test-token", wallet: { address: "0x1111111111111111111111111111111111111111", chainId: "0x1" } } }));
  await page.addInitScript(() => {
    Object.defineProperty(window, "ethereum", {
      value: {
        request: async ({ method }: { method: string }) => {
          if (method === "eth_requestAccounts") return ["0x1111111111111111111111111111111111111111"];
          if (method === "eth_chainId") return "0x1";
          if (method === "personal_sign") return "0xsigned";
          return null;
        },
        on: () => undefined,
        removeListener: () => undefined
      }
    });
  });
  await page.goto("/portal/portfolio");
  await page.getByRole("button", { name: "Connect Wallet" }).click();
  await expect(page.getByRole("button", { name: /0x1111/ })).toBeVisible();
});

test("intelligence heatmap shows provider data or an unavailable state", async ({ page }) => {
  await page.route("**/market/heatmap?**", (route) => route.fulfill({
    json: {
      assets: [{ symbol: "BTC", name: "Bitcoin", assetClass: "crypto", price: 60000, changePercent24h: 1.5, provider: "coinGecko" }],
      errors: []
    }
  }));
  await page.goto("/portal/intelligence");
  await expect(page.getByText("BTC")).toBeVisible();
});

test("universe opens from a real portfolio response", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("omnisignal.jwt", "test-token");
    localStorage.setItem("omnisignal.wallet", "0x1111111111111111111111111111111111111111");
  });
  await page.route("**/portfolio/p1", (route) => route.fulfill({ json: { portfolio: portfolioFixture } }));
  await page.route("**/market/candles?**", (route) => route.fulfill({ json: { candles: [] } }));
  await page.goto("/portal/portfolio/p1/universe");
  await expect(page.getByText("Simulation Mode")).toBeVisible();
  await expect(page.getByText("BTC")).toBeVisible();
});

const portfolioFixture = {
  id: "p1",
  name: "Verified Portfolio",
  mode: "simulation",
  totalValue: 1000,
  dailyChangeAmount: 15,
  dailyChangePercent: 1.5,
  riskScore: 42,
  aiNudges: [],
  positions: [{
    id: "pos1",
    symbol: "BTC",
    name: "Bitcoin",
    assetClass: "crypto",
    quantity: 0.02,
    currentPrice: 50000,
    marketValue: 1000,
    allocationPercent: 100,
    unrealizedPnl: 50,
    dailyChangePercent: 1.5
  }]
};
