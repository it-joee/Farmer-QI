import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@farmeriq/shared";
import { getCurrentUser, SKIP_AUTH, USER_CHANGED_EVENT } from "../auth";
import { apiFetch, SESSION_EXPIRED_EVENT } from "../lib/api-client";

export function useAuthUser(): User | null {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());
  const navigate = useNavigate();

  // Redirect to login with an expired flag whenever any API call gets a 401
  useEffect(() => {
    function handleExpired() {
      setUser(null);
      navigate("/login?expired=1", { replace: true });
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, [navigate]);

  useEffect(() => {
    function refresh() {
      setUser(getCurrentUser());
    }

    window.addEventListener(USER_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);

    // Fetch latest user profile from API if logged in with real token
    if (!SKIP_AUTH && localStorage.getItem("farmeriq_token")) {
      apiFetch("/api/auth/me")
        .then((res) => {
          if (res.ok) return res.json();
          // 401 is handled globally by SESSION_EXPIRED_EVENT — skip here
          return null;
        })
        .then((data: { user: User } | null) => {
          if (data?.user) {
            const currentRaw = localStorage.getItem("farmeriq_user");
            const freshJson = JSON.stringify(data.user);
            if (currentRaw !== freshJson) {
              localStorage.setItem("farmeriq_user", freshJson);
              setUser(data.user);
            }
          }
        })
        .catch(() => {
          /* Keep cached user if offline */
        });
    }

    return () => {
      window.removeEventListener(USER_CHANGED_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return user;
}

export function useRequireAuth() {
  const navigate = useNavigate();
  const user = useAuthUser();

  useEffect(() => {
    if (!user) {
      navigate("/login", { replace: true });
    }
  }, [user, navigate]);

  return user;
}
