import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../utils/supabase";

export default function ConfirmOAuthPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase returns the access_token in hash fragment
    const hash = window.location.hash; // example: #access_token=...
    const params = new URLSearchParams(hash.substring(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");

    if (access_token) {
      supabase.auth
        .setSession({ access_token, refresh_token })
        .then(({ error }) => {
          if (!error) {
            navigate("/user/dashboard"); // redirect after successful login
          } else {
            console.error("Error setting session:", error);
          }
        });
    }
  }, [navigate]);

  return <div>Logging in with Google...</div>;
}
