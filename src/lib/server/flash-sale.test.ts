// @vitest-environment node
import { expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { isDemoEnabled } from "./flash-sale";
const env = {
  NODE_ENV: "development",
  ENABLE_FLASH_SALE_DEMO: "true",
  DATABASE_URL:
    "postgresql://local:local@127.0.0.1:5432/liver_store_demo?schema=public",
} as NodeJS.ProcessEnv;
it("allows only explicit local isolated demo configuration", () => {
  expect(isDemoEnabled(env)).toBe(true);
});
it.each([
  { ENABLE_FLASH_SALE_DEMO: undefined },
  { NODE_ENV: "production" },
  { VERCEL: "1" },
  { DATABASE_URL: "postgresql://local:local@neon.example/liver_store_demo" },
  { DATABASE_URL: "postgresql://local:local@localhost/production" },
  {
    DATABASE_URL:
      "postgresql://local:local@localhost/liver_store_demo?host=neon.example",
  },
  {
    DATABASE_URL:
      "postgresql://local:local@localhost/liver_store_demo?dbname=production",
  },
  { DATABASE_URL: "not a URL" },
  { DATABASE_URL: undefined },
])("fails closed for unsafe environment %s", (overrides) => {
  expect(isDemoEnabled({ ...env, ...overrides })).toBe(false);
});
