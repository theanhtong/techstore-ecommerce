import { create } from "zustand";
import { jwtDecode } from "jwt-decode";

interface User {
  id: string;
  email: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setAuth: (accessToken: string, refreshToken: string) => void;
  clearAuth: () => void;
}

const getInitialUser = (): User | null => {
  const token = localStorage.getItem("access_token");
  if (!token) return null;
  try {
    const decoded = jwtDecode<{ sub: string; email: string; role: string }>(token);
    return {
      id: decoded.sub,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    return null;
  }
};

export const useAuthStore = create<AuthState>((set) => ({
  user: getInitialUser(),
  accessToken: localStorage.getItem("access_token"),
  refreshToken: localStorage.getItem("refresh_token"),
  setAuth: (accessToken, refreshToken) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("refresh_token", refreshToken);
    try {
      const decoded = jwtDecode<{ sub: string; email: string; role: string }>(accessToken);
      const user = {
        id: decoded.sub,
        email: decoded.email,
        role: decoded.role,
      };
      set({ user, accessToken, refreshToken });
    } catch {
      set({ user: null, accessToken, refreshToken });
    }
  },
  clearAuth: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    set({ user: null, accessToken: null, refreshToken: null });
  },
}));
