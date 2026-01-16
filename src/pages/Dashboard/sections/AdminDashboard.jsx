// src/pages/Admin/Dashboard/AdminDashboard.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../../components/ui/Button";
import { adminApi } from "../../../services/api/admin";
import { useAdminAuth } from "../../../context/AdminAuthContext";

/**
 * ✅ FINAL AdminDashboard.jsx
 * - Overview: shows ALL tables from /summary, clickable -> /db/table?name=...
 * - Students: server-side search + cursor pagination (infinite scroll). NO "Make teacher".
 * - Student edit: can change password (optional).
 * - Teachers: server-side search + cursor pagination, create/edit/delete, detail modal with groups,
 *             group code edit, group delete, active toggle.
 * - Admins: create/edit/delete with temp_password + temp_twofa
 * - RBAC UI: admin create => role_ids (optional)
 * - Fix: a.is_owner / a.is_active string bo‘lsa ham to‘g‘ri ishlaydi (Number(...) === 1)
 * - Modal: max-height + body scroll (ekranga sig‘adi)
 *
 * NOTE: This file assumes adminApi supports these methods:
 *  - summary()
 *  - dbTable({ name })
 *  - listAdmins()
 *  - listRoles()                // ✅ RBAC roles list
 *  - listUsers({ q, limit, cursor })
 *  - updateUser({ id, full_name, email, email_verified, new_password? })
 *  - deleteUser({ id })
 *  - listTeachers({ q, limit, cursor })
 *  - teacherDetail({ id })  OR getTeacherDetail({ id })
 *  - createTeacher({ full_name, login, email, phone, password })
 *  - updateTeacher({ id, full_name?, login?, email?, phone?, is_active?, password? })
 *  - deleteTeacher({ id })
 *  - updateTeacherGroup({ id, name?, code?, is_active? })
 *  - deleteTeacherGroup({ id })
 *  - createAdmin({ username, email, temp_password, temp_twofa, role_ids, password?, twofa? })
 *  - updateAdmin({ id, email, is_active })
 *  - deleteAdmin({ id })
 *  - changePassword({ current_password, new_password })
 *  - change2fa({ current_twofa, new_twofa })
 */

const PAGE_SIZE = 60;

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function useDebouncedValue(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return v;
}

function formatBytes(n) {
  const x = Number(n || 0);
  if (!x) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = x;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/* =========================
   Main Component
========================= */
export default function AdminDashboard() {
  const { admin, logout, hasPerm, boot } = useAdminAuth();

  const isOwnerSelf = Number(admin?.is_owner) === 1;

  const [tab, setTab] = useState("overview"); // overview/admins/users/teachers/settings
  const [qUsers, setQUsers] = useState("");
  const [qTeachers, setQTeachers] = useState("");

  const dqUsers = useDebouncedValue(qUsers, 350);
  const dqTeachers = useDebouncedValue(qTeachers, 350);

  const usersSeenRef = useRef(new Set());
  const usersLastCursorRef = useRef(null);

  const [summary, setSummary] = useState(null);
  const [admins, setAdmins] = useState([]);

  // users list (cursor pagination)
  const [users, setUsers] = useState([]);
  const [usersCursor, setUsersCursor] = useState(null);
  const [usersHasMore, setUsersHasMore] = useState(false);
  const [usersBusy, setUsersBusy] = useState(false);

  // teachers list (cursor pagination)
  const [teachers, setTeachers] = useState([]);
  const [teachersCursor, setTeachersCursor] = useState(null);
  const [teachersHasMore, setTeachersHasMore] = useState(false);
  const [teachersBusy, setTeachersBusy] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  // modals
  const [modal, setModal] = useState(null); // {type, payload}
  const closeModal = () => setModal(null);

  const canManageAdmins = isOwnerSelf || hasPerm("admin.manage_admins");
  const canManageUsers =
    isOwnerSelf ||
    hasPerm("admin.manage_users") ||
    hasPerm("admin.manage_students");
  const canManageTeachers = isOwnerSelf || hasPerm("admin.manage_teachers");
  const canManageSettings = isOwnerSelf || hasPerm("admin.manage_settings");

  const loadBase = async ({ soft = false } = {}) => {
    setErr("");
    soft ? setRefreshing(true) : setLoading(true);
    try {
      const reqs = [adminApi.summary()];
      const needAdmins = canManageAdmins;
      if (needAdmins) reqs.push(adminApi.listAdmins());

      const results = await Promise.all(reqs);
      const s = results[0];
      setSummary(s?.summary || null);

      if (needAdmins) {
        const a = results[1];
        setAdmins(a?.admins || []);
      } else {
        setAdmins([]);
      }
    } catch (e) {
      setErr(e?.message || "Failed to load");
    } finally {
      soft ? setRefreshing(false) : setLoading(false);
    }
  };

  const resetUsers = () => {
    setUsers([]);
    setUsersCursor(null);
    setUsersHasMore(false);
    usersSeenRef.current = new Set();
    usersLastCursorRef.current = null;
  };

  const resetTeachers = () => {
    setTeachers([]);
    setTeachersCursor(null);
    setTeachersHasMore(false);
  };

  const loadUsersPage = async ({ cursor = null, append = false } = {}) => {
    if (!canManageUsers) return;
    if (usersBusy) return;

    const cursorKey = String(cursor ?? "");
    if (append && usersLastCursorRef.current === cursorKey) return;
    usersLastCursorRef.current = cursorKey;

    setUsersBusy(true);
    setErr("");
    try {
      const res = await adminApi.listUsers({
        q: dqUsers?.trim() || "",
        limit: 200,
        cursor,
      });

      const rows = Array.isArray(res?.users) ? res.users : [];
      const next = res?.next_cursor ?? null;

      const fresh = [];
      for (const r of rows) {
        const id = Number(r?.id || 0);
        if (!id) continue;
        if (usersSeenRef.current.has(id)) continue;
        usersSeenRef.current.add(id);
        fresh.push(r);
      }

      const noProgress =
        (append && fresh.length === 0) ||
        (append && String(next ?? "") === String(cursor ?? ""));

      if (append) {
        setUsers((prev) => [...prev, ...fresh]);
      } else {
        usersSeenRef.current = new Set(fresh.map((x) => Number(x.id)));
        setUsers(fresh);
      }

      const moreFromApi = !!res?.has_more;
      setUsersCursor(next);
      setUsersHasMore(noProgress ? false : moreFromApi);
    } catch (e) {
      setErr(e?.message || "Failed to load users");
      setUsersHasMore(false);
    } finally {
      setUsersBusy(false);
    }
  };

  const loadTeachersPage = async ({ cursor = null, append = false } = {}) => {
    if (!canManageTeachers) return;
    if (teachersBusy) return;
    setTeachersBusy(true);
    setErr("");
    try {
      const res = await adminApi.listTeachers({
        q: dqTeachers?.trim() || "",
        limit: PAGE_SIZE,
        cursor,
      });

      const rows = res?.teachers || [];
      const next = res?.next_cursor ?? null;
      const more = !!res?.has_more;

      setTeachers((prev) => (append ? [...prev, ...rows] : rows));
      setTeachersCursor(next);
      setTeachersHasMore(more);
    } catch (e) {
      setErr(e?.message || "Failed to load teachers");
    } finally {
      setTeachersBusy(false);
    }
  };

  useEffect(() => {
    loadBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tab !== "users") return;
    resetUsers();
    loadUsersPage({ cursor: null, append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, dqUsers]);

  useEffect(() => {
    if (tab !== "teachers") return;
    resetTeachers();
    loadTeachersPage({ cursor: null, append: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, dqTeachers]);

  const usersSentinelRef = useRef(null);
  const teachersSentinelRef = useRef(null);

  useEffect(() => {
    if (tab !== "users") return;
    const el = usersSentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!usersHasMore) return;
        if (usersBusy) return;
        if (!usersCursor) return;
        loadUsersPage({ cursor: usersCursor, append: true });
      },
      { root: null, rootMargin: "700px 0px", threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, usersHasMore, usersBusy, usersCursor, dqUsers]);

  useEffect(() => {
    if (tab !== "teachers") return;
    const el = teachersSentinelRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (!teachersHasMore) return;
        if (teachersBusy) return;
        if (!teachersCursor) return;
        loadTeachersPage({ cursor: teachersCursor, append: true });
      },
      { root: null, rootMargin: "700px 0px", threshold: 0 }
    );

    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, teachersHasMore, teachersBusy, teachersCursor, dqTeachers]);

  const overviewTables = useMemo(() => {
    const m = summary?.db_tables || {};
    const entries = Object.entries(m);
    entries.sort((a, b) => {
      const av = Number(a[1] ?? -1);
      const bv = Number(b[1] ?? -1);
      if (bv !== av) return bv - av;
      return String(a[0]).localeCompare(String(b[0]));
    });
    return entries;
  }, [summary]);

  return (
    <div className="relative mx-auto min-h-screen w-full max-w-7xl px-6 py-10">
      {/* top row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            admin.uzstudents.uz • Control Center
          </div>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight sm:text-5xl">
            Admin <span className="text-white/70">Dashboard</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            Welcome, <b>{admin?.username}</b>. Owner: {isOwnerSelf ? "YES" : "NO"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => loadBase({ soft: true })}
            disabled={refreshing}
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await logout();
              window.location.href = "/";
            }}
          >
            Logout
          </Button>
        </div>
      </div>

      {/* tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        <Tab active={tab === "overview"} onClick={() => setTab("overview")}>
          Overview
        </Tab>
        <Tab active={tab === "admins"} onClick={() => setTab("admins")}>
          Admins
        </Tab>
        <Tab active={tab === "users"} onClick={() => setTab("users")}>
          Students
        </Tab>
        <Tab active={tab === "teachers"} onClick={() => setTab("teachers")}>
          Teachers
        </Tab>
        <Tab active={tab === "settings"} onClick={() => setTab("settings")}>
          Settings
        </Tab>
      </div>

      {err ? (
        <div className="mt-6 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton />
          <Skeleton />
          <Skeleton />
        </div>
      ) : (
        <>
          {/* OVERVIEW */}
          {tab === "overview" ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
              <Card
                title="Database Tables"
                desc={`All tables (${
                  summary?.tables_total ?? (overviewTables.length || 0)
                }) • Click for details`}
                right={
                  <Pill tone="white">
                    Server:{" "}
                    <span className="ml-1 text-white/90">
                      {summary?.db_name || "DB"}
                    </span>
                  </Pill>
                }
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  {overviewTables?.length ? (
                    overviewTables.map(([k, v]) => (
                      <RowClickable
                        key={k}
                        label={k}
                        value={v}
                        onClick={() =>
                          setModal({ type: "db_table", payload: { name: k } })
                        }
                      />
                    ))
                  ) : (
                    <div className="text-white/60 text-xs">No data</div>
                  )}
                </div>

                <div className="mt-5 text-[11px] text-white/55 leading-relaxed">
                  Tip: table ustiga bossangiz schema (columns), meta
                  (engine/size), va sample rows ko‘rinadi.
                </div>
              </Card>

              <div className="grid gap-4">
                <Card title="Security" desc="Rules">
                  <ul className="text-xs text-white/70 space-y-2 leading-relaxed">
                    <li>• Password → 2FA → suspicious → Email approval</li>
                    <li>• Lockout escalation (5m → 10m → 20m ...)</li>
                    <li>• Strict RBAC: owner bypass, others permission-based</li>
                  </ul>
                </Card>

                <Card title="Quick Actions" desc="Root operations">
                  <div className="grid gap-2">
                    <Button
                      onClick={() => setTab("admins")}
                      className="w-full"
                      disabled={!canManageAdmins}
                    >
                      Manage Admins
                    </Button>
                    <Button
                      onClick={() => setTab("teachers")}
                      className="w-full"
                      disabled={!canManageTeachers}
                    >
                      Manage Teachers
                    </Button>
                    <Button
                      onClick={() => setTab("users")}
                      className="w-full"
                      disabled={!canManageUsers}
                    >
                      Manage Students
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          ) : null}

          {/* ADMINS */}
          {tab === "admins" ? (
            <div className="mt-6">
              <Card
                title="Admins"
                desc="Create / update / delete admins (permission controlled)"
                right={
                  canManageAdmins ? (
                    <Button
                      size="sm"
                      onClick={() => setModal({ type: "admin_create" })}
                    >
                      + Add Admin
                    </Button>
                  ) : (
                    <Pill tone="red">NO PERMISSION</Pill>
                  )
                }
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-white/70">
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3">Username</th>
                        <th className="text-left py-3">Email</th>
                        <th className="text-left py-3">Role</th>
                        <th className="text-left py-3">Active</th>
                        <th className="text-left py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/90">
                      {(admins || []).map((a) => {
                        const isOwner = Number(a?.is_owner) === 1; // ✅ FIX: "0"/"1"
                        const isActive = Number(a?.is_active) === 1; // ✅ FIX: "0"/"1"
                        return (
                          <tr key={a.id} className="border-b border-white/5">
                            <td className="py-3 font-semibold">{a.username}</td>
                            <td className="py-3 text-white/70">{a.email}</td>
                            <td className="py-3">
                              <Pill tone={isOwner ? "emerald" : "white"}>
                                {isOwner ? "OWNER" : "ADMIN"}
                              </Pill>
                            </td>
                            <td className="py-3">
                              <Pill tone={isActive ? "emerald" : "red"}>
                                {isActive ? "ACTIVE" : "DISABLED"}
                              </Pill>
                            </td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={!canManageAdmins}
                                  onClick={() =>
                                    setModal({ type: "admin_edit", payload: a })
                                  }
                                >
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  disabled={!canManageAdmins || isOwner} // ✅ FIX
                                  onClick={() =>
                                    setModal({
                                      type: "admin_delete",
                                      payload: a,
                                    })
                                  }
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {!admins?.length ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="py-6 text-center text-xs text-white/55"
                          >
                            No admins found.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : null}

          {/* STUDENTS */}
          {tab === "users" ? (
            <div className="mt-6">
              <Card
                title="Students (Users)"
                desc={`Server-side pagination • Loaded: ${users.length}${
                  usersHasMore ? "+" : ""
                }`}
                right={
                  canManageUsers ? (
                    <Pill tone="emerald">MANAGE</Pill>
                  ) : (
                    <Pill tone="red">NO PERMISSION</Pill>
                  )
                }
              >
                <Search
                  value={qUsers}
                  onChange={setQUsers}
                  placeholder="Search student name/email..."
                />
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead className="text-white/70">
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3">Name</th>
                        <th className="text-left py-3">Email</th>
                        <th className="text-left py-3">Provider</th>
                        <th className="text-left py-3">Verified</th>
                        <th className="text-left py-3">Created</th>
                        <th className="text-left py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/90">
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-white/5">
                          <td className="py-3 font-semibold">
                            {u.full_name || "—"}
                          </td>
                          <td className="py-3 text-white/70">{u.email}</td>
                          <td className="py-3">
                            <Pill tone="white">
                              {u.provider === "google" ? "Google" : "Email"}
                            </Pill>
                          </td>
                          <td className="py-3">
                            <Pill
                              tone={Number(u.email_verified) === 1 ? "emerald" : "red"}
                            >
                              {Number(u.email_verified) === 1 ? "YES" : "NO"}
                            </Pill>
                          </td>
                          <td className="py-3 text-white/60 text-xs">
                            {u.created_at ? String(u.created_at) : "—"}
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageUsers}
                                onClick={() =>
                                  setModal({ type: "user_edit", payload: u })
                                }
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageUsers}
                                onClick={() =>
                                  setModal({ type: "user_delete", payload: u })
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {!users.length && !usersBusy ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-8 text-center text-xs text-white/55"
                          >
                            No users found.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div ref={usersSentinelRef} />

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-[11px] text-white/55">
                    {usersBusy
                      ? "Loading more..."
                      : usersHasMore
                      ? "Scroll to load more"
                      : "End of list"}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      resetUsers();
                      loadUsersPage({ cursor: null, append: false });
                    }}
                    disabled={usersBusy || !canManageUsers}
                  >
                    Reload
                  </Button>
                </div>
              </Card>
            </div>
          ) : null}

          {/* TEACHERS */}
          {tab === "teachers" ? (
            <div className="mt-6">
              <Card
                title="Teachers"
                desc={`Teachers + Groups control • Loaded: ${teachers.length}${
                  teachersHasMore ? "+" : ""
                }`}
                right={
                  canManageTeachers ? (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => setModal({ type: "teacher_create" })}
                      >
                        + Add Teacher
                      </Button>
                      <Pill tone="emerald">MANAGE</Pill>
                    </div>
                  ) : (
                    <Pill tone="red">NO PERMISSION</Pill>
                  )
                }
              >
                <Search
                  value={qTeachers}
                  onChange={setQTeachers}
                  placeholder="Search teacher name/email/login..."
                />
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead className="text-white/70">
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3">Full name</th>
                        <th className="text-left py-3">Login</th>
                        <th className="text-left py-3">Email</th>
                        <th className="text-left py-3">Phone</th>
                        <th className="text-left py-3">Active</th>
                        <th className="text-left py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/90">
                      {teachers.map((t) => (
                        <tr key={t.id} className="border-b border-white/5">
                          <td className="py-3 font-semibold">
                            {t.full_name || "—"}
                          </td>
                          <td className="py-3 text-white/70">
                            {t.login || "—"}
                          </td>
                          <td className="py-3 text-white/70">{t.email}</td>
                          <td className="py-3 text-white/70">
                            {t.phone || "—"}
                          </td>
                          <td className="py-3">
                            <Pill
                              tone={Number(t.is_active) === 1 ? "emerald" : "red"}
                            >
                              {Number(t.is_active) === 1 ? "ACTIVE" : "DISABLED"}
                            </Pill>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageTeachers}
                                onClick={() =>
                                  setModal({
                                    type: "teacher_detail",
                                    payload: { id: t.id },
                                  })
                                }
                              >
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageTeachers}
                                onClick={() =>
                                  setModal({ type: "teacher_edit", payload: t })
                                }
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageTeachers}
                                onClick={() =>
                                  setModal({
                                    type: "teacher_delete",
                                    payload: t,
                                  })
                                }
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {!teachers.length && !teachersBusy ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="py-8 text-center text-xs text-white/55"
                          >
                            No teachers found.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>

                <div ref={teachersSentinelRef} />

                <div className="mt-4 flex items-center justify-between">
                  <div className="text-[11px] text-white/55">
                    {teachersBusy
                      ? "Loading more..."
                      : teachersHasMore
                      ? "Scroll to load more"
                      : "End of list"}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      resetTeachers();
                      loadTeachersPage({ cursor: null, append: false });
                    }}
                    disabled={teachersBusy || !canManageTeachers}
                  >
                    Reload
                  </Button>
                </div>
              </Card>
            </div>
          ) : null}

          {/* SETTINGS */}
          {tab === "settings" ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card
                title="Security Settings"
                desc="Change your password / 2FA"
                right={
                  canManageSettings ? null : (
                    <Pill tone="red">NO PERMISSION</Pill>
                  )
                }
              >
                <div className="grid gap-2">
                  <Button
                    disabled={!canManageSettings}
                    onClick={() => setModal({ type: "change_password" })}
                  >
                    Change Password
                  </Button>
                  <Button
                    disabled={!canManageSettings}
                    onClick={() => setModal({ type: "change_2fa" })}
                  >
                    Change 2FA
                  </Button>
                </div>
              </Card>

              <Card title="Session" desc="Refresh auth state">
                <div className="grid gap-2">
                  <Button onClick={boot}>Re-check Session (me)</Button>
                  <Button
                    variant="ghost"
                    onClick={() => loadBase({ soft: true })}
                  >
                    Reload Summary & Admins
                  </Button>
                </div>
              </Card>
            </div>
          ) : null}
        </>
      )}

      {/* MODALS */}
      {modal ? (
        <Modal
          onClose={closeModal}
          title={modalTitle(modal.type)}
          size={modalSize(modal.type)}
        >
          <ModalBody
            modal={modal}
            close={closeModal}
            openModal={setModal} // ✅ needed for nested modal opens (group edit/delete)
            refreshBase={() => loadBase({ soft: true })}
            refreshUsers={() => loadUsersPage({ cursor: null, append: false })}
            refreshTeachers={() => loadTeachersPage({ cursor: null, append: false })}
            canManageAdmins={canManageAdmins}
            canManageUsers={canManageUsers}
            canManageTeachers={canManageTeachers}
            canManageSettings={canManageSettings}
          />
        </Modal>
      ) : null}
    </div>
  );
}

/* =========================
   UI bits
========================= */
function Tab({ active, children, onClick }) {
  return (
    <button
      onClick={onClick}
      className={[
        "rounded-full px-4 py-2 text-xs font-semibold border backdrop-blur transition",
        active
          ? "border-white/15 bg-white/10 text-white"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function Card({ title, desc, right, children }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-bold">{title}</div>
          {desc ? <div className="mt-2 text-xs text-white/60">{desc}</div> : null}
        </div>
        {right ? <div>{right}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}

function RowClickable({ label, value, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group w-full text-left flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10"
    >
      <span className="text-white/70 text-xs">{label}</span>
      <span className="text-white/90 text-xs font-semibold">
        {value ?? "—"}{" "}
        <span className="ml-2 text-white/35 group-hover:text-white/60">→</span>
      </span>
    </button>
  );
}

function Pill({ tone = "white", children }) {
  const map = {
    white: "border-white/10 bg-white/5 text-white/80",
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-100",
    red: "border-red-400/20 bg-red-400/10 text-red-100",
  };
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-bold tracking-wide",
        map[tone] || map.white,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

function Search({ value, onChange, placeholder = "Search..." }) {
  return (
    <div className="mt-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full sm:max-w-sm rounded-2xl bg-white/5 border border-white/10 px-4 py-2 outline-none focus:ring-2 focus:ring-white/15 text-white placeholder:text-white/40"
      />
    </div>
  );
}

function Skeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
      <div className="h-4 w-32 rounded bg-white/10 animate-pulse" />
      <div className="mt-3 h-3 w-48 rounded bg-white/10 animate-pulse" />
      <div className="mt-6 space-y-2">
        <div className="h-10 rounded-xl bg-white/10 animate-pulse" />
        <div className="h-10 rounded-xl bg-white/10 animate-pulse" />
        <div className="h-10 rounded-xl bg-white/10 animate-pulse" />
      </div>
    </div>
  );
}

/* =========================
   Modal (✅ FINAL: max-height + inner scroll)
========================= */
function Modal({ title, children, onClose, size = "lg" }) {
  const sizes = {
    sm: "max-w-md",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={[
          "relative w-full",
          sizes[size] || sizes.lg,
          "rounded-2xl border border-white/10 bg-slate-950/85 backdrop-blur",
          "shadow-[0_30px_120px_rgba(0,0,0,0.55)]",
          "flex flex-col",
          "max-h-[85vh]", // ✅ ekran sig‘adi
        ].join(" ")}
      >
        {/* header */}
        <div className="flex items-start justify-between gap-3 p-6 pb-4 border-b border-white/10">
          <div className="text-sm font-bold">{title}</div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
          >
            ✕
          </button>
        </div>

        {/* body scroll */}
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

function modalTitle(type) {
  const m = {
    db_table: "Database Table",
    admin_create: "Add Admin",
    admin_edit: "Edit Admin",
    admin_delete: "Delete Admin",
    user_edit: "Edit Student",
    user_delete: "Delete Student",
    teacher_create: "Add Teacher",
    teacher_detail: "Teacher Details",
    teacher_edit: "Edit Teacher",
    teacher_delete: "Delete Teacher",
    group_edit: "Edit Group",
    group_delete: "Delete Group",
    change_password: "Change Password",
    change_2fa: "Change 2FA",
  };
  return m[type] || "Modal";
}

function modalSize(type) {
  if (type === "db_table") return "xl";
  if (type === "teacher_detail") return "xl";
  return "lg";
}

/* =========================
   Modal Body
========================= */
function ModalBody({
  modal,
  close,
  openModal,
  refreshBase,
  refreshUsers,
  refreshTeachers,
  canManageAdmins,
  canManageUsers,
  canManageTeachers,
  canManageSettings,
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // DB table detail
  const [dbDetail, setDbDetail] = useState(null);
  const [dbBusy, setDbBusy] = useState(false);

  // Teacher detail
  const [teacherDetail, setTeacherDetail] = useState(null);
  const [teacherGroups, setTeacherGroups] = useState([]);
  const [groupStats, setGroupStats] = useState({});
  const [detailBusy, setDetailBusy] = useState(false);

  // ✅ RBAC roles
  const [roles, setRoles] = useState([]);
  const [roleIds, setRoleIds] = useState([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await adminApi.listRoles();
        if (!alive) return;
        setRoles(r?.roles || []);
      } catch {
        // roles bo‘lmasa ham create ishlashi mumkin
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // create modal ochilganda roleIds reset
  useEffect(() => {
    if (modal.type === "admin_create") setRoleIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modal.type]);

  // forms
  const [form, setForm] = useState(() => {
    const p = modal.payload || {};
    return {
      // admin
      username: p.username || "",
      email: p.email || "",
      is_active: p.is_active ?? 1,
      temp_password: "",
      temp_twofa: "",

      // user
      full_name: p.full_name || "",
      email_verified: p.email_verified ?? 0,
      new_password: "",

      // teacher
      t_full_name: p.full_name || "",
      t_login: p.login || "",
      t_email: p.email || "",
      t_phone: p.phone || "",
      t_active: p.is_active ?? 1,
      t_password: "",

      // group
      g_name: p.name || "",
      g_code: p.code || "",
      g_active: p.is_active ?? 1,

      // settings
      current_password: "",
      current_twofa: "",
      new_twofa: "",
    };
  });

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const act = async (fn, after = async () => {}) => {
    setErr("");
    setLoading(true);
    try {
      await fn();
      await after();
      close();
    } catch (e) {
      setErr(e?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  // Load DB table detail on open
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (modal.type !== "db_table") return;
      const name = modal.payload?.name;
      if (!name) return;
      setDbBusy(true);
      setErr("");
      try {
        const res = await adminApi.dbTable({ name });
        if (!alive) return;
        setDbDetail(res || null);
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load table details");
      } finally {
        if (alive) setDbBusy(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [modal.type, modal.payload]);

  // Load Teacher detail on open
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (modal.type !== "teacher_detail") return;
      const id = Number(modal.payload?.id || 0);
      if (!id) return;
      setDetailBusy(true);
      setErr("");
      try {
        const res =
          (adminApi.teacherDetail && (await adminApi.teacherDetail({ id }))) ||
          (adminApi.getTeacherDetail && (await adminApi.getTeacherDetail({ id })));

        if (!alive) return;
        setTeacherDetail(res?.teacher || null);
        setTeacherGroups(res?.groups || []);
        setGroupStats(res?.group_stats || {});
      } catch (e) {
        if (!alive) return;
        setErr(e?.message || "Failed to load teacher details");
      } finally {
        if (alive) setDetailBusy(false);
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, [modal.type, modal.payload]);

  // DB TABLE modal
  if (modal.type === "db_table") {
    const t = modal.payload?.name || "table";
    const cols = dbDetail?.columns || [];
    const rows = dbDetail?.rows || [];
    const meta = dbDetail?.meta || null;

    return (
      <div className="space-y-4">
        {err ? <ErrorBox msg={err} /> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-white/70">
            Table: <b className="text-white">{t}</b>
          </div>
          <div className="flex flex-wrap gap-2">
            <Pill tone="white">
              Engine:{" "}
              <span className="ml-1 text-white/90">{meta?.engine || "—"}</span>
            </Pill>
            <Pill tone="white">
              Collation:{" "}
              <span className="ml-1 text-white/90">
                {meta?.table_collation || "—"}
              </span>
            </Pill>
            <Pill tone="white">
              Size:{" "}
              <span className="ml-1 text-white/90">
                {formatBytes((meta?.data_length || 0) + (meta?.index_length || 0))}
              </span>
            </Pill>
          </div>
        </div>

        {dbBusy ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-xs text-white/70">
            Loading details...
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-bold text-white/90">Columns</div>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-white/60">
                    <tr className="border-b border-white/10">
                      <th className="text-left py-2">Field</th>
                      <th className="text-left py-2">Type</th>
                      <th className="text-left py-2">Null</th>
                      <th className="text-left py-2">Key</th>
                      <th className="text-left py-2">Default</th>
                      <th className="text-left py-2">Extra</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/85">
                    {cols.map((c, i) => (
                      <tr key={i} className="border-b border-white/5">
                        <td className="py-2 font-semibold">{c.Field}</td>
                        <td className="py-2 text-white/70">{c.Type}</td>
                        <td className="py-2 text-white/70">{c.Null}</td>
                        <td className="py-2 text-white/70">{c.Key}</td>
                        <td className="py-2 text-white/70">
                          {String(c.Default ?? "—")}
                        </td>
                        <td className="py-2 text-white/70">
                          {String(c.Extra ?? "—")}
                        </td>
                      </tr>
                    ))}
                    {!cols.length ? (
                      <tr>
                        <td colSpan={6} className="py-4 text-center text-white/55">
                          No column data.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="text-xs font-bold text-white/90">Sample rows</div>
              <div className="mt-3 max-h-[280px] overflow-auto rounded-xl border border-white/10 bg-black/20 p-3">
                <pre className="text-[11px] text-white/80 whitespace-pre-wrap break-words">
                  {rows?.length ? JSON.stringify(rows, null, 2) : "No sample rows."}
                </pre>
              </div>
              <div className="mt-3 text-[11px] text-white/50">
                For safety, this view is read-only and shows limited rows.
              </div>
            </div>
          </>
        )}

        <div className="flex gap-2">
          <Button className="w-full" onClick={close}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  // ADMIN CREATE (✅ role_ids UI)
  if (modal.type === "admin_create") {
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}
        <Field
          label="Username"
          value={form.username}
          onChange={(v) => set("username", v)}
        />
        <Field label="Email" value={form.email} onChange={(v) => set("email", v)} />
        <Field
          label="Temp Password"
          type="password"
          value={form.temp_password}
          onChange={(v) => set("temp_password", v)}
          placeholder="Temporary password"
        />
        <Field
          label="Temp 2FA"
          type="password"
          value={form.temp_twofa}
          onChange={(v) => set("temp_twofa", v)}
          placeholder="Temporary 2FA"
        />

        {/* ✅ Role picker (optional) */}
        <RolePicker roles={roles} value={roleIds} onChange={setRoleIds} />

        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={
              loading ||
              !canManageAdmins ||
              !String(form.username).trim() ||
              !String(form.email).trim() ||
              !String(form.temp_password).trim() ||
              !String(form.temp_twofa).trim()
            }
            onClick={() =>
              act(
                () =>
                  adminApi.createAdmin({
                    username: form.username.trim(),
                    email: form.email.trim(),
                    temp_password: form.temp_password,
                    temp_twofa: form.temp_twofa,
                    role_ids: roleIds, // ✅ RBAC
                    // compatibility keys (if you kept old names)
                    password: form.temp_password,
                    twofa: form.temp_twofa,
                  }),
                refreshBase
              )
            }
          >
            {loading ? "Creating..." : "Create Admin"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // ADMIN EDIT
  if (modal.type === "admin_edit") {
    const a = modal.payload;
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
          Editing: <b className="text-white">{a.username}</b>
        </div>
        <Field label="Email" value={form.email} onChange={(v) => set("email", v)} />
        <SelectBool
          label="Active"
          value={form.is_active}
          onChange={(v) => set("is_active", v)}
        />
        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageAdmins}
            onClick={() =>
              act(
                () =>
                  adminApi.updateAdmin({
                    id: a.id,
                    email: form.email.trim(),
                    is_active: Number(form.is_active),
                  }),
                refreshBase
              )
            }
          >
            {loading ? "Saving..." : "Save"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={close}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  // ADMIN DELETE
  if (modal.type === "admin_delete") {
    const a = modal.payload;
    const isOwner = Number(a?.is_owner) === 1; // ✅ safety guard
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}
        <div className="rounded-xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
          Delete admin: <b>{a.username}</b> ?
        </div>
        {isOwner ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
            Owner admin cannot be deleted.
          </div>
        ) : null}
        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageAdmins || isOwner}
            onClick={() => act(() => adminApi.deleteAdmin({ id: a.id }), refreshBase)}
          >
            {loading ? "Deleting..." : "Yes, Delete"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // USER EDIT (with optional password reset)
  if (modal.type === "user_edit") {
    const u = modal.payload;
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}

        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
          Editing user: <b className="text-white">{u.email}</b> (ID: {u.id})
        </div>

        <Field
          label="Full name"
          value={form.full_name}
          onChange={(v) => set("full_name", v)}
        />
        <Field label="Email" value={form.email} onChange={(v) => set("email", v)} />
        <SelectBool
          label="Email Verified"
          value={form.email_verified}
          onChange={(v) => set("email_verified", v)}
        />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-bold text-white/90">Password update</div>
          <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
            If you enter a new password, it will replace the current one. Leave
            empty to keep unchanged.
          </div>
          <div className="mt-3">
            <Field
              label="New password (optional)"
              type="password"
              value={form.new_password}
              onChange={(v) => set("new_password", v)}
              placeholder="Min 6 chars (recommended stronger)"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageUsers || !String(form.email || "").trim()}
            onClick={() =>
              act(
                () =>
                  adminApi.updateUser({
                    id: u.id,
                    full_name: String(form.full_name || "").trim(),
                    email: String(form.email || "").trim(),
                    email_verified: Number(form.email_verified),
                    new_password: String(form.new_password || "").trim() || undefined,
                  }),
                refreshUsers
              )
            }
          >
            {loading ? "Saving..." : "Save"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={close}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  // USER DELETE
  if (modal.type === "user_delete") {
    const u = modal.payload;
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}
        <div className="rounded-xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
          Delete user <b>{u.email}</b> ?
        </div>
        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageUsers}
            onClick={() => act(() => adminApi.deleteUser({ id: u.id }), refreshUsers)}
          >
            {loading ? "Deleting..." : "Yes, Delete"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // TEACHER CREATE
  if (modal.type === "teacher_create") {
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}

        <Field
          label="Full name"
          value={form.t_full_name}
          onChange={(v) => set("t_full_name", v)}
        />
        <Field label="Login" value={form.t_login} onChange={(v) => set("t_login", v)} />
        <Field label="Email" value={form.t_email} onChange={(v) => set("t_email", v)} />
        <Field
          label="Phone (optional)"
          value={form.t_phone}
          onChange={(v) => set("t_phone", v)}
        />
        <Field
          label="Password"
          type="password"
          value={form.t_password}
          onChange={(v) => set("t_password", v)}
          placeholder="Min 6 chars"
        />

        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={
              loading ||
              !canManageTeachers ||
              !String(form.t_full_name || "").trim() ||
              !String(form.t_login || "").trim() ||
              !String(form.t_email || "").trim() ||
              !String(form.t_password || "").trim()
            }
            onClick={() =>
              act(
                () =>
                  adminApi.createTeacher({
                    full_name: String(form.t_full_name || "").trim(),
                    login: String(form.t_login || "").trim(),
                    email: String(form.t_email || "").trim(),
                    phone: String(form.t_phone || "").trim(),
                    password: String(form.t_password || ""),
                  }),
                refreshTeachers
              )
            }
          >
            {loading ? "Creating..." : "Create Teacher"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // TEACHER DETAIL (groups control)
  if (modal.type === "teacher_detail") {
    const t = teacherDetail;
    return (
      <div className="space-y-4">
        {err ? <ErrorBox msg={err} /> : null}

        {detailBusy ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-xs text-white/70">
            Loading teacher details...
          </div>
        ) : !t ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-xs text-white/70">
            No teacher data.
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm font-bold text-white/90">{t.full_name}</div>
                  <div className="mt-2 text-xs text-white/60">
                    <span className="text-white/70">Login:</span> {t.login} •{" "}
                    <span className="text-white/70">Email:</span> {t.email} •{" "}
                    <span className="text-white/70">Phone:</span> {t.phone || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Pill tone={Number(t.is_active) === 1 ? "emerald" : "red"}>
                    {Number(t.is_active) === 1 ? "ACTIVE" : "DISABLED"}
                  </Pill>
                  <Pill tone="white">ID: {t.id}</Pill>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-bold">Groups</div>
                  <div className="mt-2 text-xs text-white/60">
                    Teacher groups • codes • students • pending requests
                  </div>
                </div>
                <Pill tone="white">{teacherGroups.length} groups</Pill>
              </div>

              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-white/70">
                    <tr className="border-b border-white/10">
                      <th className="text-left py-3">Name</th>
                      <th className="text-left py-3">Code</th>
                      <th className="text-left py-3">Students</th>
                      <th className="text-left py-3">Pending</th>
                      <th className="text-left py-3">Active</th>
                      <th className="text-left py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="text-white/90">
                    {teacherGroups.map((g) => {
                      const st = groupStats?.[g.id] || {};
                      const gActive = Number(g.is_active) === 1;
                      return (
                        <tr key={g.id} className="border-b border-white/5">
                          <td className="py-3 font-semibold">{g.name}</td>
                          <td className="py-3">
                            <Pill tone="white">{g.code}</Pill>
                          </td>
                          <td className="py-3 text-white/80">
                            {Number(st.students ?? 0)}
                          </td>
                          <td className="py-3 text-white/80">
                            {Number(st.pending ?? 0)}
                          </td>
                          <td className="py-3">
                            <Pill tone={gActive ? "emerald" : "red"}>
                              {gActive ? "YES" : "NO"}
                            </Pill>
                          </td>
                          <td className="py-3">
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageTeachers}
                                onClick={() => openModal({ type: "group_edit", payload: g })}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageTeachers}
                                onClick={() => openModal({ type: "group_delete", payload: g })}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {!teacherGroups.length ? (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-xs text-white/55">
                          No groups found for this teacher.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex gap-2">
                <Button className="w-full" onClick={close}>
                  Close
                </Button>
              </div>

              <div className="mt-3 text-[11px] text-white/50 leading-relaxed">
                Group code’larni tahrirlashda uniqueness (UNI) bor — duplicate
                code bo‘lsa backend 409 qaytaradi.
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // TEACHER EDIT
  if (modal.type === "teacher_edit") {
    const t = modal.payload;
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}

        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
          Editing teacher: <b className="text-white">{t.email}</b> (ID: {t.id})
        </div>

        <Field
          label="Full name"
          value={form.t_full_name}
          onChange={(v) => set("t_full_name", v)}
        />
        <Field label="Login" value={form.t_login} onChange={(v) => set("t_login", v)} />
        <Field label="Email" value={form.t_email} onChange={(v) => set("t_email", v)} />
        <Field
          label="Phone (optional)"
          value={form.t_phone}
          onChange={(v) => set("t_phone", v)}
        />
        <SelectBool
          label="Active"
          value={form.t_active}
          onChange={(v) => set("t_active", v)}
        />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-xs font-bold text-white/90">Password update</div>
          <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
            Leave empty to keep current password.
          </div>
          <div className="mt-3">
            <Field
              label="New password (optional)"
              type="password"
              value={form.t_password}
              onChange={(v) => set("t_password", v)}
              placeholder="Min 6 chars"
            />
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageTeachers}
            onClick={() =>
              act(
                () =>
                  adminApi.updateTeacher({
                    id: t.id,
                    full_name: String(form.t_full_name || "").trim(),
                    login: String(form.t_login || "").trim(),
                    email: String(form.t_email || "").trim(),
                    phone: String(form.t_phone || "").trim(),
                    is_active: Number(form.t_active),
                    password: String(form.t_password || "").trim() || undefined,
                  }),
                refreshTeachers
              )
            }
          >
            {loading ? "Saving..." : "Save"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={close}>
            Close
          </Button>
        </div>

        <div className="text-[11px] text-white/55 leading-relaxed">
          Group boshqaruvi uchun “View” orqali teacher detail oching.
        </div>
      </div>
    );
  }

  // TEACHER DELETE
  if (modal.type === "teacher_delete") {
    const t = modal.payload;
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}
        <div className="rounded-xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
          Delete teacher <b>{t.email}</b> ?
        </div>
        <div className="text-[11px] text-white/55 leading-relaxed">
          Note: backend teacher delete ichida teacher_groups’ni ham o‘chirsa
          (cascade), teacher’ga tegishli group’lar ham ketadi.
        </div>
        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageTeachers}
            onClick={() => act(() => adminApi.deleteTeacher({ id: t.id }), refreshTeachers)}
          >
            {loading ? "Deleting..." : "Yes, Delete"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // GROUP EDIT (teacher_groups)
  if (modal.type === "group_edit") {
    const g = modal.payload;
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
          Editing group: <b className="text-white">{g.name}</b> (ID: {g.id})
        </div>

        <Field label="Group name" value={form.g_name} onChange={(v) => set("g_name", v)} />
        <Field label="Group code" value={form.g_code} onChange={(v) => set("g_code", v)} />
        <SelectBool
          label="Active"
          value={form.g_active}
          onChange={(v) => set("g_active", v)}
        />

        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={
              loading ||
              !canManageTeachers ||
              !String(form.g_name || "").trim() ||
              !String(form.g_code || "").trim()
            }
            onClick={() =>
              act(
                async () => {
                  await adminApi.updateTeacherGroup({
                    id: g.id,
                    name: String(form.g_name || "").trim(),
                    code: String(form.g_code || "").trim(),
                    is_active: Number(form.g_active),
                  });
                },
                async () => {
                  await refreshTeachers();
                }
              )
            }
          >
            {loading ? "Saving..." : "Save"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={close}>
            Cancel
          </Button>
        </div>

        <div className="text-[11px] text-white/50 leading-relaxed">
          Code unique bo‘lishi shart. Duplicate bo‘lsa 409 qaytadi.
        </div>
      </div>
    );
  }

  // GROUP DELETE
  if (modal.type === "group_delete") {
    const g = modal.payload;
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}
        <div className="rounded-xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
          Delete group <b>{g.name}</b> (<b>{g.code}</b>) ?
        </div>
        <div className="text-[11px] text-white/55 leading-relaxed">
          This will also delete related students/join-requests if backend cascade
          delete is enabled.
        </div>
        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageTeachers}
            onClick={() =>
              act(() => adminApi.deleteTeacherGroup({ id: g.id }), async () => {
                await refreshTeachers();
              })
            }
          >
            {loading ? "Deleting..." : "Yes, Delete"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={close}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // CHANGE PASSWORD
  if (modal.type === "change_password") {
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}

        <Field
          label="Current password"
          type="password"
          value={form.current_password}
          onChange={(v) => set("current_password", v)}
          placeholder="Enter current password"
        />

        <Field
          label="New password"
          type="password"
          value={form.new_password}
          onChange={(v) => set("new_password", v)}
          placeholder="Enter new password"
        />

        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={
              loading ||
              !canManageSettings ||
              !String(form.current_password || "").trim() ||
              !String(form.new_password || "").trim()
            }
            onClick={() =>
              act(
                () =>
                  adminApi.changePassword({
                    current_password: form.current_password,
                    new_password: form.new_password,
                  }),
                refreshBase
              )
            }
          >
            {loading ? "Updating..." : "Update Password"}
          </Button>

          <Button variant="ghost" className="w-full" onClick={close}>
            Cancel
          </Button>
        </div>

        <div className="text-[11px] text-white/50 leading-relaxed">
          Security note: after update, all sessions will be revoked and you’ll
          need to login again.
        </div>
      </div>
    );
  }

  // CHANGE 2FA
  if (modal.type === "change_2fa") {
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}

        <Field
          label="Current 2FA"
          type="password"
          value={form.current_twofa}
          onChange={(v) => set("current_twofa", v)}
          placeholder="Enter current 2FA code"
        />

        <Field
          label="New 2FA"
          type="password"
          value={form.new_twofa}
          onChange={(v) => set("new_twofa", v)}
          placeholder="Enter new 2FA code"
        />

        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={
              loading ||
              !canManageSettings ||
              !String(form.current_twofa || "").trim() ||
              !String(form.new_twofa || "").trim()
            }
            onClick={() =>
              act(
                () =>
                  adminApi.change2fa({
                    current_twofa: form.current_twofa,
                    new_twofa: form.new_twofa,
                  }),
                refreshBase
              )
            }
          >
            {loading ? "Updating..." : "Update 2FA"}
          </Button>

          <Button variant="ghost" className="w-full" onClick={close}>
            Cancel
          </Button>
        </div>

        <div className="text-[11px] text-white/50 leading-relaxed">
          Security note: after update, all sessions will be revoked and you’ll
          need to login again.
        </div>
      </div>
    );
  }

  return <div className="text-xs text-white/70">Unknown modal.</div>;
}

/* =========================
   RBAC Role Picker (UI)
========================= */
function RolePicker({ roles, value, onChange }) {
  const toggle = (id) => {
    const n = Number(id);
    if (!n) return;
    if (value.includes(n)) onChange(value.filter((x) => x !== n));
    else onChange([...value, n]);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs text-white/70 mb-3">Assign roles (optional)</div>

      {roles?.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {roles.map((r) => {
            const checked = value.includes(Number(r.id));
            return (
              <label
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white/90 truncate">
                    {r.name || `Role #${r.id}`}
                  </div>
                  {r.description ? (
                    <div className="text-[11px] text-white/55 truncate">
                      {r.description}
                    </div>
                  ) : null}
                </div>

                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(r.id)}
                  className="h-4 w-4 accent-white"
                />
              </label>
            );
          })}
        </div>
      ) : (
        <div className="text-[11px] text-white/55">
          Roles endpoint empty. (RBAC roles not configured yet)
        </div>
      )}
    </div>
  );
}

function ErrorBox({ msg }) {
  return (
    <div className="rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
      {msg}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder = "" }) {
  return (
    <label className="block">
      <div className="text-xs text-white/70 mb-2">{label}</div>
      <input
        value={value ?? ""}
        type={type}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-2 outline-none focus:ring-2 focus:ring-white/15 text-white placeholder:text-white/40"
      />
    </label>
  );
}

function SelectBool({ label, value, onChange }) {
  return (
    <label className="block">
      <div className="text-xs text-white/70 mb-2">{label}</div>
      <select
        value={Number(value)}
        onChange={(e) => onChange(clamp(Number(e.target.value), 0, 1))}
        className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-2 outline-none focus:ring-2 focus:ring-white/15 text-white"
      >
        <option value={1}>Yes</option>
        <option value={0}>No</option>
      </select>
    </label>
  );
}
