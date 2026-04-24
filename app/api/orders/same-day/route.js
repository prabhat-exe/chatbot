export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    const laravelApiBase = process.env.LARAVEL_API_BASE_URL || "http://127.0.0.1:8001/api";

    const headers = {
      Accept: "application/json",
    };
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const res = await fetch(`${laravelApiBase}/orders/same-day`, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    const data = await res.json();
    if (!res.ok) {
      return Response.json(
        { success: false, error: `Laravel same day orders API error: ${res.status}`, details: data },
        { status: res.status }
      );
    }

    return Response.json(data);
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: "Same day orders fetch failed",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
