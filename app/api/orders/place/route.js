export async function POST(request) {
  try {
    const payload = await request.json();
    const authHeader = request.headers.get("authorization");
    const laravelApiBase = process.env.LARAVEL_API_BASE_URL || "http://127.0.0.1:8001/api";

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const res = await fetch(`${laravelApiBase}/orders/place`, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return Response.json(
        { success: false, error: `Laravel order API error: ${res.status}`, details: data },
        { status: res.status }
      );
    }

    return Response.json(data);
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: "Order placement failed",
        details: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
