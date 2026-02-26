// Complete profile endpoint
function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export async function completeProfile({ phone_number, first_name, last_name, email }) {
  const yoposUrl = process.env.NEXT_PUBLIC_YOPOS_URL || "https://rajjuice.yopos.io";

  const headers = {
    "Content-Type": "application/json",
    "url": yoposUrl,
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  console.log('token',token);
  const res = await fetch("https://admin.yopos.io/api/complete/profile", {
    method: "POST",
    headers,
    body: JSON.stringify({ phone_number, first_name, last_name, email }),
  });

  if (!res.ok) throw new Error(`Complete Profile API error: ${res.status}`);

  return res.json();
}

import { getSessionId } from "./sessionId";

// function getAuthToken() {
//   if (typeof window === 'undefined') return null;
//   return localStorage.getItem('auth_token');
// }

export async function sendChatMessage(message) {
  const sessionId = getSessionId();

  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch("/api/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({ message, session_id: sessionId }),
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  return res.json();
}

export async function addToCart(orderItem) {
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch("/api/cart", {
    method: "POST",
    headers,
    body: JSON.stringify(orderItem),
  });

  if (!res.ok) {
    throw new Error(`Cart API error: ${res.status}`);
  }

  return res.json();
}

export async function getCart() {
  const headers = { "Content-Type": "application/json" };
  const token = getAuthToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch("/api/cart", {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    throw new Error(`Cart API error: ${res.status}`);
  }

  return res.json();
}

// External auth endpoints

export async function loginUser({ phone_number, customer_name = "", phone_code = "+91" }) {
  const yoposUrl = process.env.NEXT_PUBLIC_YOPOS_URL || "https://rajjuice.yopos.io";
  const res = await fetch("https://admin.yopos.io/api/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "url": yoposUrl,
    },
    body: JSON.stringify({ phone_number, customer_name, phone_code }),
  });

  if (!res.ok) throw new Error(`Login API error: ${res.status}`);
  return res.json();
}


export async function verifyOtp({ otp, phone_number }) {
  const yoposUrl = process.env.NEXT_PUBLIC_YOPOS_URL || "https://rajjuice.yopos.io";
  const res = await fetch("https://admin.yopos.io/api/verify-otp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "url": yoposUrl,
    },
    body: JSON.stringify({ otp, phone_number }),
  });


  if (!res.ok) throw new Error(`Verify OTP API error: ${res.status}`);
  return res.json();
}
