import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@farmeriq/shared";
import { getCurrentUser, SKIP_AUTH, USER_CHANGED_EVENT } from "../auth";
import { apiFetch } from "../lib/api-client";

export function useAuthUser(): User | null {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

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
          throw new Error("Failed to fetch current user");
        })
        .then((data: { user: User }) => {
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
