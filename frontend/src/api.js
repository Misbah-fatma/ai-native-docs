function apiBase() {
  if (typeof window !== "undefined") {
    const host = window.location.hostname;
    if (host !== "localhost" && host !== "127.0.0.1") {
      return "";
    }
  }
  return import.meta.env.VITE_API_URL || "http://localhost:4000";
}

const API = apiBase();
const TOKEN_KEY = "ink_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function api(path, init) {
  const headers = new Headers(init?.headers);
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!isForm && init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${API}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof payload.error === "string" ? payload.error : "Something went wrong.");
  }
  return payload;
}

export async function downloadAuthFile(path, filename) {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const response = await fetch(`${API}${path}`, { headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(typeof payload.error === "string" ? payload.error : "Could not download that file.");
  }
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(href);
}

export function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function formatUpdated(iso) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  if (diff < minute) return "Just now";
  if (diff < hour) return `${Math.floor(diff / minute)}m ago`;
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export const DEMO_ACCOUNTS = [
  {
    name: "Alex Rivera",
    email: "alex@ajaia.dev",
    password: "demo1234",
    label: "Owner",
    detail: "Has owned docs, including one already shared with Jordan.",
  },
  {
    name: "Jordan Chen",
    email: "jordan@ajaia.dev",
    password: "demo1234",
    label: "Shared editor",
    detail: "Can open Alex’s Q3 notes and has a private design doc.",
  },
  {
    name: "Sam Okonkwo",
    email: "sam@ajaia.dev",
    password: "demo1234",
    label: "Teammate",
    detail: "Starts with nothing shared. Use Sam to test a new share.",
  },
];
