import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { createServer } from "node:net";

if (process.env.VERCEL || process.env.NODE_ENV === "production") {
  throw new Error(
    "E2E setup is local/CI only; production and Preview are blocked.",
  );
}

const project = `liver-store-issue10-e2e-${process.pid}`;
const dbUser = `issue10_${randomBytes(4).toString("hex")}`;
const dbPassword = randomBytes(24).toString("hex");
const authUser = `viewer_${randomBytes(4).toString("hex")}`;
const authPassword = randomBytes(24).toString("hex");
const composeEnv = {
  ...process.env,
  E2E_DB_USER: dbUser,
  E2E_DB_PASSWORD: dbPassword,
};
const compose = ["compose", "-f", "compose.e2e.yaml", "-p", project];
let activeChild;
let interruptedSignal;
let cleaningUp = false;

function interrupt(signal) {
  if (interruptedSignal || cleaningUp) return;
  interruptedSignal = signal;
  if (!activeChild) return;
  try {
    // pnpm and Playwright may spawn descendants; stop the whole child group.
    if (process.platform !== "win32" && activeChild.pid)
      process.kill(-activeChild.pid, signal);
    else activeChild.kill(signal);
  } catch {
    activeChild.kill(signal);
  }
}

const onSigint = () => interrupt("SIGINT");
const onSigterm = () => interrupt("SIGTERM");
process.on("SIGINT", onSigint);
process.on("SIGTERM", onSigterm);

function run(
  command,
  args,
  env = process.env,
  capture = false,
  duringCleanup = false,
) {
  if (interruptedSignal && !duringCleanup)
    return Promise.reject(new Error(`Interrupted by ${interruptedSignal}`));
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env,
      stdio: capture ? ["inherit", "pipe", "inherit"] : "inherit",
      detached: process.platform !== "win32",
    });
    activeChild = child;
    let output = "";
    if (capture) child.stdout.on("data", (chunk) => (output += chunk));
    child.once("error", (error) => {
      if (activeChild === child) activeChild = undefined;
      reject(error);
    });
    child.once("close", (code, signal) => {
      if (activeChild === child) activeChild = undefined;
      if (interruptedSignal && !duringCleanup)
        reject(new Error(`Interrupted by ${interruptedSignal}`));
      else if (code !== 0)
        reject(new Error(`${command} failed (${signal ?? code})`));
      else resolve(output.trim());
    });
  });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string")
        return reject(new Error("No port"));
      server.close(() => resolve(address.port));
    });
  });
}

let started = false;
try {
  started = true;
  await run("docker", [...compose, "up", "-d", "--wait"], composeEnv);
  const published = await run(
    "docker",
    [...compose, "port", "postgres", "5432"],
    composeEnv,
    true,
  );
  const match = /^127\.0\.0\.1:(\d+)$/.exec(published);
  if (!match) throw new Error("E2E PostgreSQL must bind only to loopback.");
  const databaseUrl = `postgresql://${dbUser}:${dbPassword}@127.0.0.1:${match[1]}/issue10_e2e`;
  const testDatabaseUrl = (name) =>
    databaseUrl.replace(/\/issue10_e2e$/, `/${name}`);
  const env = {
    ...composeEnv,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: "",
    E2E_DATABASE_URL: databaseUrl,
    E2E_PORT: String(await freePort()),
    E2E_AUTH_USER: authUser,
    E2E_AUTH_PASSWORD: authPassword,
    BASIC_AUTH_USER: authUser,
    BASIC_AUTH_PASSWORD: authPassword,
    DISABLE_BASIC_AUTH: "false",
    ENABLE_FLASH_SALE_DEMO: "false",
  };
  await run("pnpm", ["exec", "prisma", "migrate", "deploy"], env);
  await run("pnpm", ["exec", "prisma", "db", "seed"], env);
  for (const name of ["issue8_test", "issue9_test"]) {
    await run(
      "docker",
      [...compose, "exec", "-T", "postgres", "createdb", "-U", dbUser, name],
      composeEnv,
    );
    await run("pnpm", ["exec", "prisma", "migrate", "deploy"], {
      ...env,
      DATABASE_URL: testDatabaseUrl(name),
    });
  }
  await run(
    "pnpm",
    [
      "exec",
      "vitest",
      "run",
      "src/lib/server/orders.integration.test.ts",
      "src/lib/server/flash-sale.integration.test.ts",
    ],
    {
      ...env,
      ORDER_TEST_DATABASE_URL: testDatabaseUrl("issue8_test"),
      FLASH_SALE_TEST_DATABASE_URL: testDatabaseUrl("issue9_test"),
    },
  );
  await run(
    "pnpm",
    ["exec", "playwright", "test", ...process.argv.slice(2)],
    env,
  );
} catch (error) {
  if (!interruptedSignal) throw error;
} finally {
  cleaningUp = true;
  try {
    if (started)
      await run(
        "docker",
        [...compose, "down", "--volumes"],
        composeEnv,
        false,
        true,
      );
  } finally {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
  }
}
if (interruptedSignal) {
  process.stderr.write(
    `Interrupted by ${interruptedSignal}; test database removed.\n`,
  );
  process.exitCode = interruptedSignal === "SIGINT" ? 130 : 143;
}
