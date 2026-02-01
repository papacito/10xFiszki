import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

const getStoredTokens = () => {
  if (typeof window === "undefined") {
    return null;
  }
  const accessToken = window.localStorage.getItem("access_token");
  const refreshToken = window.localStorage.getItem("refresh_token");
  return accessToken || refreshToken ? { accessToken, refreshToken } : null;
};

export default function LogoutButton() {
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const syncSession = () => setHasSession(Boolean(getStoredTokens()));
    syncSession();

    const handleAuthChange = () => syncSession();
    window.addEventListener("auth:changed", handleAuthChange);
    return () => {
      window.removeEventListener("auth:changed", handleAuthChange);
    };
  }, []);

  const handleLogout = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem("access_token");
    window.localStorage.removeItem("refresh_token");
    window.localStorage.removeItem("auth_user");
    setHasSession(false);
    window.location.assign("/auth");
  }, []);

  return (
    <Button type="button" variant="outline" onClick={handleLogout} disabled={!hasSession}>
      Logout
    </Button>
  );
}
