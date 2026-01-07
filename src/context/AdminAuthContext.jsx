import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { adminApi } from "../services/api/admin";

const Ctx = createContext(null);

export function AdminAuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [perms, setPerms] = useState([]);
  const [booting, setBooting] = useState(true);

  const isAuthed = !!admin;

  const hasPerm = (key) => {
    if (!admin) return false;
    if (admin.is_owner) return true;
    if (perms.includes("admin.full_access")) return true;
    return perms.includes(key);
  };

  const boot = async () => {
    setBooting(true);
    try {
      const r = await adminApi.me();
      setAdmin(r.admin || null);
      setPerms(Array.isArray(r.perms) ? r.perms : []);
    } catch {
      setAdmin(null);
      setPerms([]);
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    boot();
  }, []);

  const logout = async () => {
    try {
      await adminApi.logout();
    } catch {}
    setAdmin(null);
    setPerms([]);
  };

  const value = useMemo(
    () => ({
      admin,
      perms,
      isAuthed,
      booting,
      boot,
      setAdmin,
      setPerms,
      logout,
      hasPerm,
    }),
    [admin, perms, isAuthed, booting]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAdminAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  return v;
}
