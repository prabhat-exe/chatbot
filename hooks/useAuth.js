import { useEffect, useState } from "react";
import { loginUser, verifyOtp as verifyOtpApi } from "../utils/api";

export function useAuth() {
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('auth_token');
      if (t) setToken(t);
    }
  }, []);

  const login = async ({ phone_number, customer_name = "", phone_code = "+91" }) => {
    const res = await loginUser({ phone_number, customer_name, phone_code });
    return res; // res.success etc.
  };

  const verifyOtp = async ({ otp, phone_number }) => {
    const res = await verifyOtpApi({ otp, phone_number });
    if (res && res.token) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', res.token);
      }
      setToken(res.token);
       if (res.user_data) {
        localStorage.setItem(
          'user_data',
          JSON.stringify(res.user_data)
        );
      }
    }
    // console.log('verifyOtp response', res.user_data);
    return res;
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
    setToken(null);
  };

  return {
    isLoggedIn: !!token,
    token,
    login,
    verifyOtp,
    logout,
  };
}

export default useAuth;
