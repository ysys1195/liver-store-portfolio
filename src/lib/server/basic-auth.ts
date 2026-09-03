import { timingSafeEqual } from "node:crypto";

type Credentials = {
  username: string;
  password: string;
};

function safeEqual(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);

  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function parseBasicAuthorization(header: string | null): Credentials | null {
  const match = header?.match(/^Basic ([A-Za-z0-9+/]+={0,2})$/i);

  if (!match) {
    return null;
  }

  try {
    const decoded = Buffer.from(match[1], "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");

    if (separatorIndex < 0) {
      return null;
    }

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

export function hasValidBasicAuthorization(
  header: string | null,
  expectedUsername: string | undefined,
  expectedPassword: string | undefined,
): boolean {
  if (!expectedUsername || !expectedPassword) {
    return false;
  }

  const credentials = parseBasicAuthorization(header);

  if (!credentials) {
    return false;
  }

  const usernameMatches = safeEqual(credentials.username, expectedUsername);
  const passwordMatches = safeEqual(credentials.password, expectedPassword);

  return usernameMatches && passwordMatches;
}
