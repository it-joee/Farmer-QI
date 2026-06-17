import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@farmeriq/shared";
import { getCurrentUser, USER_CHANGED_EVENT } from "../auth";

export function useAuthUser(): User | null {
  const [user, setUser] = useState<User | null>(() => getCurrentUser());

  useEffect(() => {
    function refresh() {
      setUser(getCurrentUser());
    }

    window.addEventListener(USER_CHANGED_EVENT, refresh);
    window.addEventListener("storage", refresh);
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
