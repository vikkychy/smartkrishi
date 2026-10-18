import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("smart-krishi-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default api;

export function getImageUrl(imagePath) {
  if (!imagePath) return "";
  if (/^https?:\/\//i.test(imagePath)) return imagePath;
  return new URL(imagePath, api.defaults.baseURL).toString();
}
