import { describe, expect, it } from "vitest";
import { createMessagingLinkCode } from "./routes";

describe("premium billing helpers", () => {
  it("creates short Telegram link codes for premium messaging setup", () => {
    const code = createMessagingLinkCode();

    expect(code).toMatch(/^[A-F0-9]{8}$/);
  });
});
