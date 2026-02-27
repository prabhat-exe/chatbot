export async function POST(request) {
  try {
    const body = await request.json();
    const authHeader = request.headers.get("authorization");
    const laravelApiBase = process.env.LARAVEL_API_BASE_URL || "http://127.0.0.1:8001/api";

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    if (authHeader) {
      headers.Authorization = authHeader;
    }

    const res = await fetch(`${laravelApiBase}/complete/profile`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "Profile update failed",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
