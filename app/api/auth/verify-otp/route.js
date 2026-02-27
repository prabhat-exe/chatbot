export async function POST(request) {
  try {
    const body = await request.json();
    const laravelApiBase = process.env.LARAVEL_API_BASE_URL || "http://127.0.0.1:8001/api";

    const res = await fetch(`${laravelApiBase}/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (error) {
    return Response.json(
      {
        success: false,
        message: "OTP verification failed",
        error: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
