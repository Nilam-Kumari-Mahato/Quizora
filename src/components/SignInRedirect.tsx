import { useEffect, useRef } from "react";

import { useNavigate, useLocation } from "react-router-dom";


export function SignInRedirect() {

  const navigate = useNavigate();
  const location = useLocation();
  const hasRedirected = useRef(false);

  useEffect(() => {
   
    if ( !hasRedirected.current) {
      
      const protectedPaths = ["/dashboard", "/host", "/play", "/quiz"];
      const isOnProtectedPath = protectedPaths.some(path => location.pathname.startsWith(path));

      if (!isOnProtectedPath) {
        hasRedirected.current = true;
        navigate("/dashboard");
      }
    }
  }, [navigate, location.pathname]);

  return null; 
}
