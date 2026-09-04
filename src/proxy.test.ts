// @vitest-environment node

import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { config, proxy } from "./proxy";

const request = (authorization?: string) =>
  new NextRequest("https://example.test/", {
    headers: authorization ? { authorization } : undefined,
  });

describe("proxy", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a generic Basic authentication challenge when unauthorized", async () => {
    vi.stubEnv("BASIC_AUTH_USER", "viewer");
    vi.stubEnv("BASIC_AUTH_PASSWORD", "secret");

    const response = proxy(request());

    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toBe(
      'Basic realm="Liver Store Portfolio", charset="UTF-8"',
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.text()).resolves.not.toContain("secret");
  });

  it("allows a request with matching server-side credentials", () => {
    vi.stubEnv("BASIC_AUTH_USER", "viewer");
    vi.stubEnv("BASIC_AUTH_PASSWORD", "secret");
    const authorization = `Basic ${Buffer.from("viewer:secret").toString("base64")}`;

    const response = proxy(request(authorization));

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("fails closed when credentials are not configured", () => {
    vi.stubEnv("BASIC_AUTH_USER", "");
    vi.stubEnv("BASIC_AUTH_PASSWORD", "");

    expect(proxy(request()).status).toBe(401);
  });

  it("allows public image files to bypass the authentication matcher", () => {
    expect(config.matcher[0]).toContain("images/");
  });
});
