import { demoErrorResponse, getDemoState } from "@/lib/server/flash-sale";
export const runtime = "nodejs";
export async function GET() {
  try {
    return Response.json(await getDemoState(), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    return demoErrorResponse(error);
  }
}
