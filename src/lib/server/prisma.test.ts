// @vitest-environment node

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getPrisma } from "./prisma";

describe("getPrisma", () => {
  beforeAll(() => {
    vi.stubEnv(
      "DATABASE_URL",
      "postgresql://postgres:postgres@localhost:5432/storefront_test",
    );
    vi.stubEnv("NODE_ENV", "production");
  });

  afterAll(async () => {
    await getPrisma().$disconnect();
    vi.unstubAllEnvs();
  });

  it("productionでも同じPrisma Clientを再利用する", () => {
    expect(getPrisma()).toBe(getPrisma());
  });
});
