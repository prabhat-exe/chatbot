export async function POST(req) {
  const body = await req.json();
  const aiBaseUrl = process.env.AI_SERVICE_URL || "http://0.0.0.0:8000";

  const res = await fetch(`${aiBaseUrl}/meal-plan/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    return Response.json(
      { error: `AI API error: ${res.status}`, details: text },
      { status: res.status }
    );
  }

  const apiData = await res.json();

  return Response.json({
    success: apiData.success,
    intent: apiData.intent,
    reply: apiData.reply || apiData.response,
    response: apiData.response,
    category_data: apiData.category_data || [],
    categories: apiData.categories || [],
    meal_plan: apiData.meal_plan || null,
    data: apiData.data || {},
    conversation_history: apiData.conversation_history || [],
    error: apiData.error || null,
  });
}
