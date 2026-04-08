export async function GET() {
  const aiBaseUrl = process.env.AI_SERVICE_URL || "http://0.0.0.0:8000";

  const res = await fetch(`${aiBaseUrl}/meal-plan/options`, {
    method: "GET",
    headers: {
      accept: "application/json",
    },
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: `AI API error: ${res.status}`, details: text },
      { status: res.status }
    );
  }

  const apiData = await res.json();
  return Response.json(apiData);
}
