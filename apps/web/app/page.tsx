"use client";

import { useMemo, useState } from "react";

const PRODUCT_NAME = "Swatch Audemars Piguet Royal Pop Collection Pocket Watch \"Eight White\"";
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

const COLOR_OPTIONS = [
  { name: "Eight White", active: true, color: "#f7f7f2" },
  { name: "Otto Rosso", active: false, color: "#d63b38" },
  { name: "Green Eight", active: false, color: "#297b51" },
  { name: "Orenji Hachi", active: false, color: "#f39a33" },
  { name: "Lan Ba", active: false, color: "#326ed8" },
  { name: "Ocho Negro", active: false, color: "#111111" }
];

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
      <div className="mk-top">
        <a href="#checkout">Private crypto checkout / Base USDC accepted / On-chain receipt</a>
        <nav>
          <a href="#sell">Sell Now</a>
          <a href="#stores">Find a Store</a>
          <a href="#help">Help</a>
          <a href="#journal">Blog</a>
          <a href="#region">UAE / AED</a>
        </nav>
      </div>

      <header className="mk-header">
        <div className="mk-left-actions">
          <button className="mk-menu" aria-label="Open menu">Menu</button>
          <a href="#watches">Shop Watches</a>
        </div>
        <a className="mk-logo" href="#top">
          <b>OmniSignal</b>
          <span>Authenticated Collectibles</span>
        </a>
        <div className="mk-actions">
          <form className="mk-searchbox">
            <input aria-label="Search products" placeholder="Search brand, model, reference..." />
            <button type="button">Search</button>
          </form>
          <button className="mk-wallet" onClick={connectWallet}>{account ? shortAccount : "Connect Wallet"}</button>
          <button className="mk-cart">Cart 0</button>
        </div>
      </header>

      <nav className="mk-nav">
        <a href="#sale">Summer Sale</a>
        <a href="#new">New Releases</a>
        <a href="#sneakers">Sneakers</a>
        <a href="#bags">Bags</a>
        <a href="#streetwear">Streetwear</a>
        <a href="#accessories">Accessories</a>
        <a className="active" href="#watches">Watches</a>
        <a href="#collectibles">Collectibles</a>
        <a href="#crypto">Crypto Checkout</a>
      </nav>

      <section className="mk-product" id="top">
        <div className="mk-gallery">
          {PRODUCT_IMAGES.map((image, index) => (
            <figure className={index === 0 ? "mk-photo large" : "mk-photo"} key={image}>
              <img src={image} alt={`${PRODUCT_NAME} product view ${index + 1}`} />
              {index === 0 && <span>New</span>}
            </figure>
          ))}
        </div>

        <aside className="mk-buybox">
          <div className="mk-breadcrumb">Home / Accessories / Watches / Swatch x Audemars Piguet</div>
          <h1>{PRODUCT_NAME}</h1>
          <div className="mk-price">
            <span>From</span>
            <strong>AED {SELL_PRICE_AED.toLocaleString("en-US")}</strong>
          </div>

          <div className="mk-option-head">
            <span>Option</span>
            <b>Eight White</b>
          </div>
          <div className="mk-options">
            {COLOR_OPTIONS.map((option) => (
              <button className={option.active ? "active" : ""} key={option.name} title={option.name}>
                <span style={{ background: option.color }} />
              </button>
            ))}
          </div>

          <div className="mk-paypanel" id="checkout">
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

          <button className="mk-add" onClick={payWithUsdc} disabled={busy}>
            {busy ? "Opening MetaMask..." : "Pay with crypto"}
          </button>
          <button className="mk-connect" onClick={connectWallet}>
            {account ? `Wallet ${shortAccount}` : "Connect MetaMask"}
          </button>

          <div className="mk-loyalty">OmniSignal checkout: {USDC_PRICE.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC on Base.</div>
          <div className="mk-splitpay">No Stripe. No card processor. Buyer pays directly from wallet.</div>

          <div className="mk-wallet-box">
            <span>Receiving wallet</span>
            <b>{TREASURY_ADDRESS}</b>
            <button onClick={copyReceivingWallet}>Copy wallet</button>
          </div>
          {status && <p className="mk-status">{status}</p>}
          {txHash && (
            <a className="mk-receipt" href={`${BASE_EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">
              View transaction receipt
            </a>
          )}
        </aside>
      </section>

      <section className="mk-content">
        <article>
          <h2>Discover this product</h2>
          <p>
            The Royal Pop Pocket Watch "Eight White" brings a crisp white finish to a collectible
            pocket watch format with Royal Oak inspired octagonal design elements.
          </p>
          <ul>
            <li>Eight White colorway with clean pop inspired detailing</li>
            <li>Royal Oak inspired octagonal design elements</li>
            <li>Unique pocket watch format with collectible appeal</li>
            <li>Crypto-only OmniSignal checkout on Base USDC</li>
          </ul>
        </article>
        <details open>
          <summary>Authenticity</summary>
          <p>Every order is reviewed before fulfillment. This is an independent resale listing.</p>
        </details>
        <details>
          <summary>Shipping and returns</summary>
          <p>Delivery is confirmed after the on-chain payment and buyer contact details are matched.</p>
        </details>
        <details>
          <summary>Payment methods</summary>
          <p>MetaMask, Base mainnet, and USDC. The site never asks for seed phrases or private keys.</p>
        </details>
      </section>

      <section className="mk-newsletter">
        <div>
          <h2>Do not miss out on the latest.</h2>
          <p>Get first access to new watch drops, crypto checkout releases, and private listings.</p>
        </div>
        <form>
          <input placeholder="Enter your email" />
          <button type="button">Submit</button>
        </form>
      </section>

      <footer className="mk-footer">
        <div>
          <h3>About OmniSignal</h3>
          <p>Crypto-native checkout for collectible watches and rare pieces.</p>
        </div>
        <div>
          <h3>Customer Care</h3>
          <a href="#help">Shipping and delivery</a>
          <a href="#help">FAQ</a>
          <a href="#help">Contact us</a>
        </div>
        <div>
          <h3>Payment</h3>
          <p>Base USDC, MetaMask, on-chain receipt.</p>
        </div>
      </footer>
    </main>
  );
}

function encodeUsdcTransfer(to: string, amount: bigint) {
  const method = "a9059cbb";
  const address = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const value = amount.toString(16).padStart(64, "0");
  return `0x${method}${address}${value}`;
}
