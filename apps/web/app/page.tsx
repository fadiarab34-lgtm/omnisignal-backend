"use client";

import { useMemo, useState } from "react";

const PRODUCT_NAME = "Swatch x Audemars Piguet Royal Pop Pocket Watch Eight White";
const SOURCE_PRICE_AED = 9700;
const SELL_PRICE_AED = SOURCE_PRICE_AED * 2;
const AED_USD_RATE = 3.6725;
const USDC_PRICE = SELL_PRICE_AED / AED_USD_RATE;
const USDC_UNITS = 5_282_510_000n;
const BASE_CHAIN_ID = "0x2105";
const BASE_CHAIN_NAME = "Base";
const BASE_RPC_URL = "https://mainnet.base.org";
const BASE_EXPLORER = "https://basescan.org";
const BASE_USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const TREASURY_ADDRESS = "0x839D8ADD3C28b6467813E4d0475801AB7d432C53";
const PRODUCT_IMAGE =
  "https://cdn.shopify.com/s/files/1/0640/3846/9846/files/Swatch_Audemars_Piguet_Royal_Pop_Collection_Pocket_Watch_Huit_Blanc_1_webp.png?quality=75&v=1778746913%3Fwidth%3D3840";

export default function WatchStorePage() {
  const [account, setAccount] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [busy, setBusy] = useState(false);

  const shortAccount = useMemo(() => {
    if (!account) return "";
    return `${account.slice(0, 6)}...${account.slice(-4)}`;
  }, [account]);

  async function connectWallet() {
    try {
      setStatus("");
      if (!window.ethereum) {
        setStatus("MetaMask is not installed. Install MetaMask, add Base, then return to checkout.");
        return;
      }
      const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
      setAccount(accounts[0] ?? "");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Wallet connection was rejected.");
    }
  }

  async function switchToBase() {
    if (!window.ethereum) throw new Error("MetaMask is not installed.");
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: BASE_CHAIN_ID }] });
    } catch (error) {
      const code = typeof error === "object" && error && "code" in error ? (error as { code?: number }).code : undefined;
      if (code !== 4902) throw error;
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: BASE_CHAIN_ID,
          chainName: BASE_CHAIN_NAME,
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [BASE_RPC_URL],
          blockExplorerUrls: [BASE_EXPLORER]
        }]
      });
    }
  }

  async function payWithUsdc() {
    try {
      setBusy(true);
      setStatus("");
      setTxHash("");
      if (!buyerName.trim() || !buyerContact.trim() || !shippingCity.trim()) {
        setStatus("Add your name, contact, and delivery city before sending payment.");
        return;
      }
      if (!window.ethereum) {
        setStatus("MetaMask is required for crypto checkout.");
        return;
      }
      let from = account;
      if (!from) {
        const accounts = (await window.ethereum.request({ method: "eth_requestAccounts" })) as string[];
        from = accounts[0] ?? "";
        setAccount(from);
      }
      if (!from) throw new Error("No wallet selected.");
      await switchToBase();
      const hash = (await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{
          from,
          to: BASE_USDC,
          value: "0x0",
          data: encodeUsdcTransfer(TREASURY_ADDRESS, USDC_UNITS)
        }]
      })) as string;
      setTxHash(hash);
      setStatus("Payment sent. Keep the transaction hash as your receipt while the order is confirmed on-chain.");
      window.localStorage.setItem("omnisignal-watch-order", JSON.stringify({
        product: PRODUCT_NAME,
        buyerName,
        buyerContact,
        shippingCity,
        wallet: from,
        txHash: hash,
        amountAed: SELL_PRICE_AED,
        amountUsdc: Number(USDC_PRICE.toFixed(2)),
        createdAt: new Date().toISOString()
      }));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Payment was not completed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="watch-page">
      <header className="watch-header">
        <a className="watch-brand" href="#top"><span />OmniSignal</a>
        <nav>
          <a href="#watch">Watch</a>
          <a href="#checkout">Crypto checkout</a>
          <a href="#details">Details</a>
        </nav>
        <button onClick={connectWallet}>{account ? shortAccount : "Connect Wallet"}</button>
      </header>

      <section className="watch-hero" id="top">
        <div className="watch-copy">
          <p className="watch-kicker">Crypto-only private checkout</p>
          <h1>Eight White Royal Pop, sold through OmniSignal.</h1>
          <p>
            A one-page purchase experience for the Swatch x Audemars Piguet Royal Pop Pocket Watch
            "Eight White". Pay directly from MetaMask in Base USDC.
          </p>
          <div className="watch-price-line">
            <div>
              <span>Price</span>
              <strong>AED {SELL_PRICE_AED.toLocaleString("en-US")}</strong>
            </div>
            <div>
              <span>Crypto checkout</span>
              <strong>{USDC_PRICE.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC</strong>
            </div>
          </div>
          <div className="watch-actions">
            <a href="#checkout">Buy with crypto</a>
            <a href="#details">View details</a>
          </div>
        </div>

        <div className="watch-product-card" id="watch">
          <div className="watch-image-shell">
            <img src={PRODUCT_IMAGE} alt={PRODUCT_NAME} />
          </div>
          <div className="watch-card-meta">
            <span>New release</span>
            <h2>{PRODUCT_NAME}</h2>
            <p>White colorway, pocket watch format, Royal Oak inspired octagonal design language.</p>
          </div>
        </div>
      </section>

      <section className="watch-strip">
        <span>Base USDC</span>
        <span>No Stripe</span>
        <span>MetaMask checkout</span>
        <span>On-chain receipt</span>
        <span>Authenticity checked before delivery</span>
      </section>

      <section className="watch-checkout-grid" id="checkout">
        <div className="checkout-card">
          <p className="watch-kicker">Checkout</p>
          <h2>Pay with MetaMask</h2>
          <p className="checkout-note">
            The payment sends {USDC_PRICE.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC on Base
            to the OmniSignal receiving wallet.
          </p>
          <div className="field-grid">
            <label>
              Full name
              <input value={buyerName} onChange={(event) => setBuyerName(event.target.value)} placeholder="Your name" />
            </label>
            <label>
              WhatsApp or email
              <input value={buyerContact} onChange={(event) => setBuyerContact(event.target.value)} placeholder="Contact for delivery" />
            </label>
            <label>
              Delivery city
              <input value={shippingCity} onChange={(event) => setShippingCity(event.target.value)} placeholder="Dubai, Abu Dhabi, Riyadh..." />
            </label>
          </div>
          <div className="checkout-buttons">
            <button className="ghost-button" onClick={connectWallet}>{account ? `Wallet ${shortAccount}` : "Connect MetaMask"}</button>
            <button className="pay-button" onClick={payWithUsdc} disabled={busy}>{busy ? "Opening wallet..." : "Pay with Base USDC"}</button>
          </div>
          {status && <p className="checkout-status">{status}</p>}
          {txHash && (
            <a className="tx-link" href={`${BASE_EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">
              View transaction receipt
            </a>
          )}
        </div>

        <aside className="order-summary">
          <h3>Order summary</h3>
          <div><span>Product</span><b>Eight White Royal Pop</b></div>
          <div><span>Source reference</span><b>AED {SOURCE_PRICE_AED.toLocaleString("en-US")}</b></div>
          <div><span>OmniSignal price</span><b>AED {SELL_PRICE_AED.toLocaleString("en-US")}</b></div>
          <div><span>Network</span><b>Base</b></div>
          <div><span>Token</span><b>USDC</b></div>
          <div><span>Receiving wallet</span><b>{TREASURY_ADDRESS.slice(0, 8)}...{TREASURY_ADDRESS.slice(-6)}</b></div>
          <p>
            Delivery is confirmed after the Base transaction is visible on-chain and the buyer contact details
            are matched to the receipt.
          </p>
        </aside>
      </section>

      <section className="watch-details" id="details">
        <article>
          <span>Product</span>
          <h3>Eight White pocket watch</h3>
          <p>Clean white finish, collectible Royal Pop format, and octagonal Royal Oak inspired design elements.</p>
        </article>
        <article>
          <span>Payment</span>
          <h3>Crypto only</h3>
          <p>MetaMask sends Base USDC directly to the receiving wallet. No card checkout and no Stripe flow.</p>
        </article>
        <article>
          <span>Resale note</span>
          <h3>Independent listing</h3>
          <p>OmniSignal is not affiliated with Swatch or Audemars Piguet. Brand names identify the resale item.</p>
        </article>
      </section>
    </main>
  );
}

function encodeUsdcTransfer(to: string, amount: bigint) {
  const method = "a9059cbb";
  const address = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const value = amount.toString(16).padStart(64, "0");
  return `0x${method}${address}${value}`;
}
