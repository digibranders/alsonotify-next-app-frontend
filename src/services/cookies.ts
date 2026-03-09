import Cookies from "universal-cookie";

export const setToken = (token: string) => {
  const cookies = new Cookies();
  // Enable secure flag only when served over HTTPS (production)
  // This preserves local dev on http://localhost
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  // sameSite: "strict" reduces CSRF attack surface compared to "lax"
  // Note: true HttpOnly protection requires the backend to set the cookie via Set-Cookie header.
  // This is a P1 architectural item tracked separately.
  cookies.set("_token", token, { path: "/", secure: isSecure, sameSite: "strict" });
};

export const getToken = () => {
  const cookies = new Cookies();
  const token = cookies.get("_token");
  return token;
};

export const deleteToken = () => {
  const cookies = new Cookies();
  cookies.remove("_token", { path: "/", sameSite: "strict" });
  return true;
};
