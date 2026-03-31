import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";
import { SplashScreen } from "./ui/SplashScreen";

export default function ConfirmOAuthPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("Synchronizing Identity...");

  useEffect(() => {
    // Supabase returns the access_token in hash fragment or query params depending on flow
    const hash = window.location.hash; 
    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (access_token) {
      setStatus("Acknowledging Manifesto...");
      supabase.auth
        .setSession({ access_token, refresh_token: refresh_token || "" })
        .then(({ error }) => {
          if (!error) {
            setStatus("Redirecting to Journal...");
            // Small delay to allow the animation ritual to feel deliberate
            setTimeout(() => {
              navigate("/user/dashboard");
            }, 800);
          } else {
            console.error("Error setting session:", error);
            setStatus("Synchronization Failure.");
          }
        });
    } else {
      // If no token in hash, check query params (PKCE flow)
      const queryParams = new URLSearchParams(window.location.search);
      const code = queryParams.get("code");
      if (!code) {
        setStatus("Invalid Identity Token.");
        setTimeout(() => navigate("/login"), 2000);
      }
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <SplashScreen isVisible={true} />
      <div className="fixed bottom-24 z-10000 text-center animate-reveal">
         <p className="text-[10px] font-technical font-black uppercase tracking-[0.4em] text-primary">
           {status}
         </p>
      </div>
    </div>
  );
}
