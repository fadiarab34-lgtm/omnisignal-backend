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
const PRODUCT_IMAGES = [
  "https://cdn.shopify.com/s/files/1/0640/3846/9846/files/Swatch_Audemars_Piguet_Royal_Pop_Collection_Pocket_Watch_Huit_Blanc_1_webp.png?quality=75&v=1778746913%3Fwidth%3D3840",
  "https://cdn.shopify.com/s/files/1/0640/3846/9846/files/Swatch_Audemars_Piguet_Royal_Pop_Collection_Pocket_Watch_Huit_Blanc_2_webp.png?quality=75&v=1778746913%3Fwidth%3D3840",
  "https://cdn.shopify.com/s/files/1/0640/3846/9846/files/Swatch_Audemars_Piguet_Royal_Pop_Collection_Pocket_Watch_Huit_Blanc_3_webp.png?quality=75&v=1778746913%3Fwidth%3D3840"
];

export default function WatchStorePage() {
  const [account, setAccount] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerContact, setBuyerContact] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [status, setStatus] = useState("");
  const [txHash, setTxHash] = useState("");
  const [busy, setBusy] = useState(false);
  const [selectedImage, setSelectedImage] = useState(PRODUCT_IMAGES[0]);

  const shortAccount = useMemo(() => {
    if (!account) return "";
    return `${account.slice(0, 6)}...${account.slice(-4)}`;
  }, [account]);

  const checkoutStage = txHash ? 4 : account && buyerName && buyerContact && shippingCity ? 3 : account ? 2 : 1;

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

  async function copyReceivingWallet() {
    await navigator.clipboard.writeText(TREASURY_ADDRESS);
    setStatus("Receiving wallet copied.");
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
      <div className="commerce-announcement">
        Private crypto checkout. Pay on Base with USDC. No Stripe, no card processor.
      </div>

      <header className="watch-header">
        <a className="watch-brand" href="#top"><span />OmniSignal</a>
        <nav>
          <a href="#product">Product</a>
          <a href="#checkout">Checkout</a>
          <a href="#delivery">Delivery</a>
        </nav>
        <button onClick={connectWallet}>{account ? shortAccount : "Connect Wallet"}</button>
      </header>

      <section className="commerce-hero" id="top">
        <div className="product-gallery" id="product">
          <div className="gallery-main">
            <img src={selectedImage} alt={PRODUCT_NAME} />
            <span className="gallery-badge">Royal Pop / Eight White</span>
          </div>
          <div className="gallery-thumbs">
            {PRODUCT_IMAGES.map((image, index) => (
              <button
                key={image}
                className={selectedImage === image ? "active" : ""}
                onClick={() => setSelectedImage(image)}
                aria-label={`View product image ${index + 1}`}
              >
                <img src={image} alt="" />
              </button>
            ))}
          </div>
        </div>

        <div className="buy-panel">
          <div className="breadcrumb">Home / Watches / Crypto checkout</div>
          <div className="product-badges">
            <span>New release</span>
            <span>Base USDC</span>
            <span>MetaMask</span>
          </div>
          <h1>{PRODUCT_NAME}</h1>
          <p className="product-intro">
            A clean resale checkout for the white Royal Pop pocket watch. Pay from your wallet, keep
            the on-chain receipt, and we confirm fulfillment against your contact details.
          </p>

          <div className="price-card">
            <div>
              <span>OmniSignal price</span>
              <strong>AED {SELL_PRICE_AED.toLocaleString("en-US")}</strong>
            </div>
            <div>
              <span>Crypto due</span>
              <strong>{USDC_PRICE.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC</strong>
            </div>
            <p>Reference listing observed at AED {SOURCE_PRICE_AED.toLocaleString("en-US")}; this checkout is set at double that price.</p>
          </div>

          <div className="buy-actions">
            <a href="#checkout">Proceed to checkout</a>
            <button onClick={connectWallet}>{account ? `Wallet ${shortAccount}` : "Connect MetaMask"}</button>
          </div>

          <div className="proof-grid">
            <div><b>Network</b><span>Base mainnet</span></div>
            <div><b>Token</b><span>USDC</span></div>
            <div><b>Receipt</b><span>BaseScan transaction</span></div>
          </div>
        </div>
      </section>

      <section className="checkout-section" id="checkout">
        <div className="checkout-left">
          <div className="section-label">Secure crypto checkout</div>
          <h2>Complete the order in four steps.</h2>
          <div className="checkout-steps">
            <Step number={1} label="Connect wallet" active={checkoutStage >= 1} complete={Boolean(account)} />
            <Step number={2} label="Add delivery details" active={checkoutStage >= 2} complete={Boolean(buyerName && buyerContact && shippingCity)} />
            <Step number={3} label="Approve USDC payment" active={checkoutStage >= 3} complete={Boolean(txHash)} />
            <Step number={4} label="Keep on-chain receipt" active={checkoutStage >= 4} complete={Boolean(txHash)} />
          </div>

          <div className="checkout-card">
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

            <div className="wallet-box">
              <div>
                <span>Receiving wallet</span>
                <b>{TREASURY_ADDRESS}</b>
              </div>
              <button onClick={copyReceivingWallet}>Copy</button>
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
        </div>

        <aside className="order-summary">
          <h3>Order summary</h3>
          <div className="summary-product">
            <img src={PRODUCT_IMAGES[0]} alt="" />
            <div>
              <b>Eight White Royal Pop</b>
              <span>Qty 1 / Independent resale listing</span>
            </div>
          </div>
          <SummaryRow label="Product price" value={`AED ${SELL_PRICE_AED.toLocaleString("en-US")}`} />
          <SummaryRow label="Crypto amount" value={`${USDC_PRICE.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC`} />
          <SummaryRow label="Network" value="Base" />
          <SummaryRow label="Token contract" value={`${BASE_USDC.slice(0, 8)}...${BASE_USDC.slice(-6)}`} />
          <p>Order is matched to the wallet transaction and the delivery contact entered above.</p>
        </aside>
      </section>

      <section className="delivery-grid" id="delivery">
        <article>
          <span>01</span>
          <h3>Wallet-native checkout</h3>
          <p>The buyer pays with MetaMask on Base. The site never asks for a seed phrase or private key.</p>
        </article>
        <article>
          <span>02</span>
          <h3>On-chain proof</h3>
          <p>The transaction hash is the receipt. Buyers can verify it directly on BaseScan.</p>
        </article>
        <article>
          <span>03</span>
          <h3>Manual fulfillment</h3>
          <p>Delivery is confirmed after payment and buyer details are reviewed. No affiliation with Swatch or Audemars Piguet.</p>
        </article>
      </section>
    </main>
  );
}

function Step({ number, label, active, complete }: { number: number; label: string; active: boolean; complete: boolean }) {
  return (
    <div className={`checkout-step ${active ? "active" : ""} ${complete ? "complete" : ""}`}>
      <b>{complete ? "OK" : number}</b>
      <span>{label}</span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return <div className="summary-row"><span>{label}</span><b>{value}</b></div>;
}

function encodeUsdcTransfer(to: string, amount: bigint) {
  const method = "a9059cbb";
  const address = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const value = amount.toString(16).padStart(64, "0");
  return `0x${method}${address}${value}`;
}
