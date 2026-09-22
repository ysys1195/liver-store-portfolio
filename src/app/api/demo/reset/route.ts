import { z } from "zod";
import { DEMO_PRODUCT_ID } from "@/lib/flash-sale";
import {
  demoErrorResponse,
  requireDemoEnabled,
  resetDemo,
} from "@/lib/server/flash-sale";
export const runtime = "nodejs";
const schema = z.object({ productId: z.literal(DEMO_PRODUCT_ID) }).strict();
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  try {
    requireDemoEnabled();
    // Next may normalize request.url to its internal hostname. Compare the
    // browser Origin to Host, allowing only loopback hosts (also prevents DNS rebinding).
    let sameOrigin = false;
    try {
      const origin = new URL(request.headers.get("origin") ?? "");
      sameOrigin =
        ["http:", "https:"].includes(origin.protocol) &&
        ["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname) &&
        origin.host === request.headers.get("host") &&
        origin.protocol === new URL(request.url).protocol;
    } catch {
      /* Missing or malformed Origin fails closed. */
    }
    if (
      !sameOrigin ||
      request.headers.get("content-type")?.split(";")[0].trim() !==
        "application/json"
    )
      return Response.json({ code: "FORBIDDEN" }, { status: 403, headers });
    if (!schema.safeParse(await request.json().catch(() => null)).success)
      return Response.json(
        { code: "INVALID_REQUEST" },
        { status: 400, headers },
      );
    return Response.json(await resetDemo(), { headers });
  } catch (error) {
    return demoErrorResponse(error);
  }
}
