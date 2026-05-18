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

const OPTIONS = ["Eight White", "Otto Rosso", "Green Eight", "Orenji Hachi", "Lan Ba", "Ocho Negro"];

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
    <>
      <div className="utility-bar">
        <a href="#checkout">Private Base USDC checkout / on-chain receipt / no card processor</a>
      </div>

      <div className="top-bar">
        <div className="container">
          <a href="#sell">Sell Now</a>
          <a href="#stores">Find a Store</a>
          <a href="#help">Help</a>
          <a href="#journal">Blog</a>
          <a href="#region">UAE / AED</a>
        </div>
      </div>

      <header className="site-header">
        <div className="container">
          <nav className="nav-left">
            <a href="#menu">Menu</a>
            <a href="#watches">Shop Watches</a>
          </nav>
          <a className="logo" href="#top">
            OmniSignal
            <small>Authenticated Collectibles</small>
          </a>
          <nav className="nav-right">
            <button onClick={connectWallet}>{account ? shortAccount : "Connect Wallet"}</button>
            <a className="cart-pill" href="#checkout">Cart 0</a>
          </nav>
        </div>
      </header>

      <nav className="cat-nav">
        <div className="container">
          <ul>
            <li><a href="#sale">Summer Sale</a></li>
            <li><a href="#new">New Releases</a></li>
            <li><a href="#sneakers">Sneakers</a></li>
            <li><a href="#bags">Bags</a></li>
            <li><a href="#streetwear">Streetwear</a></li>
            <li><a href="#accessories">Accessories</a></li>
            <li><a href="#watches">Watches</a></li>
            <li><a href="#crypto">Crypto Checkout</a></li>
          </ul>
        </div>
      </nav>

      <main id="top" className="container">
        <div className="breadcrumb">
          <a href="#home">Home</a> / <a href="#accessories">Accessories</a> / Watches / Swatch x Audemars Piguet
        </div>

        <section className="product">
          <div className="gallery">
            <div className="main">
              <img src={selectedImage} alt={PRODUCT_NAME} />
              <span className="tag-new">New</span>
            </div>
            <div className="thumbs">
              {PRODUCT_IMAGES.map((image, index) => (
                <button
                  className={selectedImage === image ? "active" : ""}
                  key={image}
                  onClick={() => setSelectedImage(image)}
                  aria-label={`View product image ${index + 1}`}
                >
                  <img src={image} alt="" />
                </button>
              ))}
            </div>
          </div>

          <aside className="buy-panel" id="checkout">
            <div className="eyebrow">Swatch x Audemars Piguet / Royal Pop</div>
            <h1>{PRODUCT_NAME}</h1>

            <div className="price-row">
              <span className="label">From</span>
              <span className="price">AED {SELL_PRICE_AED.toLocaleString("en-US")}</span>
            </div>

            <div className="field">
              <label>Option</label>
              <div className="option-chips">
                {OPTIONS.map((option) => (
                  <button className={option === "Eight White" ? "active" : ""} key={option}>{option}</button>
                ))}
              </div>
            </div>

            <div className="field">
              <label>Full name</label>
              <input value={buyerName} onChange={(event) => setBuyerName(event.target.value)} placeholder="Your name" />
            </div>
            <div className="field">
              <label>WhatsApp or email</label>
              <input value={buyerContact} onChange={(event) => setBuyerContact(event.target.value)} placeholder="Contact for delivery" />
            </div>
            <div className="field">
              <label>Delivery city</label>
              <input value={shippingCity} onChange={(event) => setShippingCity(event.target.value)} placeholder="Dubai, Abu Dhabi, Riyadh..." />
            </div>

            <button className="btn btn-primary" onClick={payWithUsdc} disabled={busy}>
              {busy ? "Opening MetaMask..." : "Pay with crypto"}
            </button>
            <button className="btn btn-secondary" onClick={connectWallet}>
              {account ? `Wallet ${shortAccount}` : "Connect MetaMask"}
            </button>

            <div className="crypto-box">
              <div className="line">OmniSignal crypto checkout</div>
              <strong>{USDC_PRICE.toLocaleString("en-US", { maximumFractionDigits: 2 })} USDC on Base</strong>
              <p className="line">No Stripe. No card processor. Buyer pays directly from wallet.</p>
              <div className="wallet">
                <span>{TREASURY_ADDRESS}</span>
                <button onClick={copyReceivingWallet}>Copy</button>
              </div>
            </div>

            {status && <p className="crypto-box">{status}</p>}
            {txHash && (
              <a className="btn btn-secondary" href={`${BASE_EXPLORER}/tx/${txHash}`} target="_blank" rel="noreferrer">
                View transaction receipt
              </a>
            )}
          </aside>
        </section>
      </main>

      <section className="section">
        <div className="container">
          <h3>Discover this product</h3>
          <h2>Eight White, presented as a collectible watch checkout for crypto-native buyers.</h2>
          <p>
            The Royal Pop Pocket Watch "Eight White" brings a crisp white finish to a collectible
            pocket watch format with Royal Oak inspired octagonal design elements.
          </p>
          <ul className="bullets">
            <li>Eight White colorway with clean pop inspired detailing</li>
            <li>Royal Oak inspired octagonal design elements</li>
            <li>Unique pocket watch format with collectible appeal</li>
            <li>Crypto-only OmniSignal checkout on Base USDC</li>
          </ul>

          <div className="info-grid">
            <div>
              <h3>Authenticity</h3>
              <p>Every order is reviewed before fulfillment. This is an independent resale listing.</p>
            </div>
            <div>
              <h3>Shipping</h3>
              <p>Delivery is confirmed after the on-chain payment and buyer contact details are matched.</p>
            </div>
            <div>
              <h3>Payment</h3>
              <p>MetaMask, Base mainnet, and USDC. The site never asks for seed phrases or private keys.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="newsletter">
        <div className="container">
          <h2>Do not miss the next private watch drop.</h2>
          <p>Get first access to new watch drops, crypto checkout releases, and private listings.</p>
          <form>
            <input placeholder="Enter your email" />
            <button type="button">Submit</button>
          </form>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="cols">
            <div>
              <h4>About OmniSignal</h4>
              <p>Crypto-native checkout for collectible watches and rare pieces.</p>
            </div>
            <div>
              <h4>Customer Care</h4>
              <ul>
                <li><a href="#help">Shipping and delivery</a></li>
                <li><a href="#help">FAQ</a></li>
                <li><a href="#help">Contact us</a></li>
              </ul>
            </div>
            <div>
              <h4>Payment</h4>
              <p>Base USDC, MetaMask, on-chain receipt.</p>
            </div>
          </div>
          <div className="colophon">
            <span>OmniSignal</span>
            <span>Independent resale listing</span>
          </div>
        </div>
      </footer>
    </>
  );
}

function encodeUsdcTransfer(to: string, amount: bigint) {
  const method = "a9059cbb";
  const address = to.toLowerCase().replace(/^0x/, "").padStart(64, "0");
  const value = amount.toString(16).padStart(64, "0");
  return `0x${method}${address}${value}`;
}
