export async function GET() {
  try {
    const laravelApiBase = process.env.LARAVEL_API_BASE_URL || "http://127.0.0.1:8001/api";
    const res = await fetch(`${laravelApiBase}/restaurants`, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    const payload = await res.json();
    if (!res.ok) {
      return Response.json(
        { success: false, error: `Laravel API error: ${res.status}`, details: payload },
        { status: res.status }
      );
    }

    return Response.json(payload);
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: "Failed to load restaurants",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
