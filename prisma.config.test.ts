// @vitest-environment node

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("dotenv/config", () => ({}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("Prisma CLI connection", () => {
  it("migrationはruntime用pool接続よりDIRECT_URLを優先する", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/runtime");
    vi.stubEnv("DIRECT_URL", "postgresql://localhost/migration");
    const { default: config } = await import("./prisma.config");
    expect(config.datasource?.url).toBe("postgresql://localhost/migration");
  });

  it("ローカルでは空のDIRECT_URLからDATABASE_URLへfallbackする", async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://localhost/local");
    vi.stubEnv("DIRECT_URL", "");
    const { default: config } = await import("./prisma.config");
    expect(config.datasource?.url).toBe("postgresql://localhost/local");
  });

  it("環境変数なしでもDB接続不要のClient生成を設定できる", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    vi.stubEnv("DIRECT_URL", undefined);
    const { default: config } = await import("./prisma.config");
    expect(config.datasource?.url).toBe("postgresql://localhost/liver_store");
  });
});
