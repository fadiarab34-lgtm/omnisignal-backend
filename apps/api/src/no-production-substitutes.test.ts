import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

describe("production substitute audit", () => {
  it("keeps forbidden substitute wording out of production source files", () => {
    const root = join(__dirname, "../../..");
    const files = walk(join(root, "apps")).concat(walk(join(root, "packages")))
      .filter((file) => /src\/.*\.(ts|tsx)$/.test(file) && !file.endsWith(".test.ts"));
    const offenders = files.flatMap((file) => {
      const text = readFileSync(file, "utf8");
      const match = text.match(/\b(fake|placeholder|hardcoded sample)\b/i);
      return match ? [`${file}: ${match[0]}`] : [];
    });
    expect(offenders).toEqual([]);
  });
});

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
