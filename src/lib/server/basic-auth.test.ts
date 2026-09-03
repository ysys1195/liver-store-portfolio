// @vitest-environment node

import { describe, expect, it } from "vitest";

import { hasValidBasicAuthorization } from "./basic-auth";

const authorization = (value: string) =>
  `Basic ${Buffer.from(value).toString("base64")}`;

describe("hasValidBasicAuthorization", () => {
  it("accepts matching credentials", () => {
    expect(
      hasValidBasicAuthorization(
        authorization("viewer:secret"),
        "viewer",
        "secret",
      ),
    ).toBe(true);
  });

  it.each([
    [null, "viewer", "secret"],
    ["Bearer token", "viewer", "secret"],
    ["Basic !!!", "viewer", "secret"],
    [authorization("viewer:wrong"), "viewer", "secret"],
    [authorization("wrong:secret"), "viewer", "secret"],
    [authorization("viewer:secret"), undefined, "secret"],
    [authorization("viewer:secret"), "viewer", undefined],
  ])(
    "rejects missing, malformed, or incorrect credentials",
    (header, user, password) => {
      expect(hasValidBasicAuthorization(header, user, password)).toBe(false);
    },
  );

  it("allows a colon in the password", () => {
    expect(
      hasValidBasicAuthorization(
        authorization("viewer:secret:part"),
        "viewer",
        "secret:part",
      ),
    ).toBe(true);
  });

  it("treats the authentication scheme as case-insensitive", () => {
    expect(
      hasValidBasicAuthorization(
        authorization("viewer:secret").replace("Basic", "basic"),
        "viewer",
        "secret",
      ),
    ).toBe(true);
  });
});
