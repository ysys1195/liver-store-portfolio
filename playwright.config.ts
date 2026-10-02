import { defineConfig, devices } from "@playwright/test";

const databaseUrl = process.env.E2E_DATABASE_URL;
const port = process.env.E2E_PORT;
const authUser = process.env.E2E_AUTH_USER;
const authPassword = process.env.E2E_AUTH_PASSWORD;
if (
  !databaseUrl ||
  !port ||
  !/^\d{2,5}$/.test(port) ||
  !authUser ||
  !authPassword
) {
  throw new Error(
    "Use pnpm test:e2e to provision an isolated database and server.",
  );
}
const db = new URL(databaseUrl);
if (
  db.protocol !== "postgresql:" ||
  db.hostname !== "127.0.0.1" ||
  db.pathname !== "/issue10_e2e" ||
  db.search ||
  process.env.DATABASE_URL !== databaseUrl ||
  process.env.VERCEL ||
  process.env.NODE_ENV === "production"
) {
  throw new Error(
    "Playwright requires the isolated local issue10_e2e database.",
  );
}

const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    ...devices["Desktop Chrome"],
    httpCredentials: {
      username: authUser,
      password: authPassword,
    },
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm exec next dev --hostname 127.0.0.1 --port ${port}`,
    url: `${baseURL}/robots.txt`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: databaseUrl,
      DIRECT_URL: "",
      BASIC_AUTH_USER: authUser,
      BASIC_AUTH_PASSWORD: authPassword,
      DISABLE_BASIC_AUTH: "false",
      ENABLE_FLASH_SALE_DEMO: "false",
    },
  },
});
