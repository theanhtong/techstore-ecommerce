import axios from "axios";
import { useAuthStore } from "../store/useAuthStore";

export const client = axios.create({
  baseURL: "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
client.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle token refresh on 401 Unauthorized
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;
      const rt = useAuthStore.getState().refreshToken;
      if (rt) {
        try {
          const res = await axios.post("http://localhost:3000/api/auth/refresh", {
            refreshToken: rt,
          });
          const { accessToken, refreshToken } = res.data;
          useAuthStore.getState().setAuth(accessToken, refreshToken);
          
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          }
          return client(originalRequest);
        } catch (refreshError) {
          useAuthStore.getState().clearAuth();
          return Promise.reject(refreshError);
        }
      } else {
        useAuthStore.getState().clearAuth();
      }
    }
    return Promise.reject(error);
  }
);
