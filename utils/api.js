import { getSessionId } from "./sessionId";

function getAuthToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("auth_token");
}

export async function completeProfile({ phone_number, first_name, last_name, email }) {
  const headers = { "Content-Type": "application/json" };

  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch("/api/auth/complete-profile", {
    method: "POST",
    headers,
    body: JSON.stringify({ phone_number, first_name, last_name, email }),
  });

  if (!res.ok) throw new Error(`Complete Profile API error: ${res.status}`);
  return res.json();
}

export async function sendChatMessage(message, restaurantId) {
  const sessionId = getSessionId();
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  // console.log("Sending message to API:", { message, sessionId, restaurantId });
  const res = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({
      message,
      session_id: sessionId,
      restaurant_id: restaurantId,
    }),
  });
  // console.log("Response from API:", res);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function fetchRestaurants() {
  const res = await fetch("/api/restaurants", {
    method: "GET",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Restaurants API error: ${res.status}`);
  return res.json();
}

export async function fetchMealPlanOptions() {
  const res = await fetch("/api/meal-plan/options", { method: "GET" });
  if (!res.ok) throw new Error(`Meal plan options API error: ${res.status}`);
  return res.json();
}

export async function generateMealPlan(payload) {
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch("/api/meal-plan/generate", {
    method: "POST",
    headers,
    body: JSON.stringify({
      ...payload,
      session_id: getSessionId(),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Meal plan generate API error: ${res.status} ${text}`);
  }
  // console.log(res.json());
  return res.json();
}

export async function placeOrder(payload) {
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch("/api/orders/place", {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Order API error: ${res.status} ${text}`);
  }
  return res.json();
}

export async function addToCart(orderItem) {
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch("/api/cart", {
    method: "POST",
    headers,
    body: JSON.stringify(orderItem),
  });

  if (!res.ok) throw new Error(`Cart API error: ${res.status}`);
  return res.json();
}

export async function getCart() {
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch("/api/cart", {
    method: "GET",
    headers,
  });

  if (!res.ok) throw new Error(`Cart API error: ${res.status}`);
  return res.json();
}

export async function loginUser({ phone_number, customer_name = "", phone_code = "+91" }) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone_number, customer_name, phone_code }),
  });

  if (!res.ok) throw new Error(`Login API error: ${res.status}`);
  return res.json();
}

export async function verifyOtp({ otp, phone_number }) {
  const res = await fetch("/api/auth/verify-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ otp, phone_number }),
  });

  if (!res.ok) throw new Error(`Verify OTP API error: ${res.status}`);
  return res.json();
}
