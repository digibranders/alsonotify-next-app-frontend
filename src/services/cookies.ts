import Cookies from "universal-cookie";

export const setToken = (token: string) => {
  const cookies = new Cookies();
  const isSecure = typeof window !== "undefined" && window.location.protocol === "https:";
  
  // sameSite: "lax" prevents silent drops during redirects across subdomains.
  const isProduction = typeof window !== "undefined" && window.location.hostname.includes('alsonotify.com');
  const domain = isProduction ? ".alsonotify.com" : window.location.hostname;
  
  cookies.set("_token", token, { 
    path: "/", 
    secure: isSecure, 
    sameSite: "lax",
    ...(isProduction && { domain })
  });
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
