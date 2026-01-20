import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from "axios";
import { apiUrl } from "./api";

/**
 * Base Axios Instance
 */
const api: AxiosInstance = axios.create({
  baseURL: apiUrl.BASE_URL,
  timeout: 10000, // 10 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * REQUEST INTERCEPTOR
 * Attach token to headers
 */
api.interceptors.request.use(
  (config: any) => {
    // const token = localStorage.getItem("token");

    // if (token && config.headers) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

/**
 * RESPONSE INTERCEPTOR
 * Handle errors globally
 */
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;

      switch (status) {
        case 401:
          console.error("Unauthorized – token expired");
          localStorage.removeItem("token");
          window.location.href = "/login";
          break;

        case 403:
          console.error("Forbidden");
          break;

        case 500:
          console.error("Server error");
          break;

        default:
          console.error("API error");
      }
    } else if (error.code === "ECONNABORTED") {
      console.error("Request timeout");
    }

    return Promise.reject(error);
  }
);

export default api;
