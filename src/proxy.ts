import { NextResponse, type NextRequest } from "next/server";

import { hasValidBasicAuthorization } from "@/lib/server/basic-auth";

export function proxy(request: NextRequest) {
  const isAuthorized = hasValidBasicAuthorization(
    request.headers.get("authorization"),
    process.env.BASIC_AUTH_USER,
    process.env.BASIC_AUTH_PASSWORD,
  );

  if (isAuthorized) {
    return NextResponse.next();
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "Cache-Control": "no-store",
      "WWW-Authenticate":
        'Basic realm="Liver Store Portfolio", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/|favicon.ico|robots.txt).*)"],
};
