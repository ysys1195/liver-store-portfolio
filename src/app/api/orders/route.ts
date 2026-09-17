import { orderRequestSchema, OrderError, orderMessages } from "@/lib/orders";
import { createOrder } from "@/lib/server/orders";

export const runtime = "nodejs";
export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const parsed = orderRequestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success)
    return Response.json(
      { code: "INVALID_REQUEST", message: orderMessages.INVALID_REQUEST },
      { status: 400, headers },
    );
  try {
    const result = await createOrder(parsed.data);
    return Response.json(result, {
      status: result.replayed ? 200 : 201,
      headers,
    });
  } catch (error) {
    const safe =
      error instanceof OrderError
        ? error
        : new OrderError("INTERNAL_ERROR", 500);
    return Response.json(
      { code: safe.code, message: safe.message },
      { status: safe.status, headers },
    );
  }
}
