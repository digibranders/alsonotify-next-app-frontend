import Cookies from "universal-cookie";

export const setToken = (token: string) => {
  const cookies = new Cookies();
  
  const hasWindow = typeof window !== "undefined";
  const protocol = hasWindow && window.location ? window.location.protocol : "";
  const hostname = hasWindow && window.location && window.location.hostname ? window.location.hostname : "";

  const isSecure = protocol === "https:";
  
  // sameSite: "lax" prevents silent drops during redirects across subdomains.
  const isProduction = hostname.includes('alsonotify.com');
  const domain = isProduction ? ".alsonotify.com" : hostname;
  
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
