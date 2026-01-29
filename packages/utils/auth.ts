import api from "./api";

export const login = (data: { email: string; password: string }) =>
  api.post("/auth/login", data);

export const register = (data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}) => api.post("/auth/register", data);

export const getMe = () => api.get("/auth/me");
