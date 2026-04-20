export async function GET(req) {
  const aiBaseUrl = process.env.AI_SERVICE_URL || "http://0.0.0.0:8000";
  const { searchParams } = new URL(req.url);
  const restaurantId = searchParams.get("restaurant_id");
  const query = restaurantId ? `?restaurant_id=${encodeURIComponent(restaurantId)}` : "";

  const res = await fetch(`${aiBaseUrl}/meal-plan/options${query}`, {
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
