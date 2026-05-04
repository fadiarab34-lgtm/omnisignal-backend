import { describe, expect, it } from "vitest";
import { Wallet } from "ethers";

describe("wallet signature verification primitives", () => {
  it("recovers a signed nonce message address", async () => {
    const wallet = Wallet.createRandom();
    const message = "OmniSignal wallet verification\nNonce: unit-test";
    const signature = await wallet.signMessage(message);
    const recovered = await import("ethers").then(({ verifyMessage, getAddress }) => getAddress(verifyMessage(message, signature)));
    expect(recovered).toBe(wallet.address);
  });
});
