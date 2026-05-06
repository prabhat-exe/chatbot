export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const { id } = await params;
  const restaurantId = String(id || "").trim();

  if (!/^\d+$/.test(restaurantId)) {
    return Response.json(
      { success: false, ready: false, error: "Valid restaurant id is required" },
      { status: 400 }
    );
  }

  try {
    const laravelApiBase = process.env.LARAVEL_API_BASE_URL || "http://127.0.0.1:8001/api";
    const res = await fetch(`${laravelApiBase}/restaurants/${restaurantId}/embedding-status`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const payload = await res.json();

    return Response.json(payload, { status: res.status });
  } catch (error) {
    return Response.json(
      {
        success: false,
        ready: false,
        restaurant_id: Number(restaurantId),
        error: "Failed to check restaurant embeddings.",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
