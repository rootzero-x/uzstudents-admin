import { useEffect, useMemo, useState } from "react";
import Button from "../../../components/ui/Button";
import { adminApi } from "../../../services/api/admin";
import { useAdminAuth } from "../../../context/AdminAuthContext";

export default function AdminDashboard() {
  const { admin, logout, hasPerm, boot } = useAdminAuth();

  const [tab, setTab] = useState("overview"); // overview/admins/users/teachers/settings
  const [q, setQ] = useState("");

  const [summary, setSummary] = useState(null);
  const [admins, setAdmins] = useState([]);
  const [users, setUsers] = useState([]);
  const [teachers, setTeachers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [err, setErr] = useState("");

  // modals
  const [modal, setModal] = useState(null); // {type, payload}
  const closeModal = () => setModal(null);

  const load = async ({ soft = false } = {}) => {
    setErr("");
    soft ? setRefreshing(true) : setLoading(true);

    try {
      const reqs = [adminApi.summary()];
      const needAdmins = hasPerm("admin.manage_admins") || admin?.is_owner;
      const needUsers = hasPerm("admin.manage_users") || hasPerm("admin.manage_students") || admin?.is_owner;
      const needTeachers = hasPerm("admin.manage_teachers") || admin?.is_owner;

      if (needAdmins) reqs.push(adminApi.listAdmins());
      if (needUsers) reqs.push(adminApi.listUsers());
      if (needTeachers) reqs.push(adminApi.listTeachers());

      const results = await Promise.all(reqs);

      const s = results[0];
      setSummary(s.summary);

      let idx = 1;
      if (needAdmins) {
        const a = results[idx++]; setAdmins(a.admins || []);
      } else setAdmins([]);

      if (needUsers) {
        const u = results[idx++]; setUsers(u.users || []);
      } else setUsers([]);

      if (needTeachers) {
        const t = results[idx++]; setTeachers(t.teachers || []);
      } else setTeachers([]);

    } catch (e) {
      setErr(e?.message || "Failed to load");
    } finally {
      soft ? setRefreshing(false) : setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredUsers = useMemo(() => {
    const list = users || [];
    if (!q.trim()) return list;
    const t = q.toLowerCase();
    return list.filter(
      (x) =>
        String(x.email || "").toLowerCase().includes(t) ||
        String(x.full_name || "").toLowerCase().includes(t)
    );
  }, [users, q]);

  const filteredTeachers = useMemo(() => {
    const list = teachers || [];
    if (!q.trim()) return list;
    const t = q.toLowerCase();
    return list.filter(
      (x) =>
        String(x.email || "").toLowerCase().includes(t) ||
        String(x.full_name || "").toLowerCase().includes(t) ||
        String(x.teacher_code || "").toLowerCase().includes(t)
    );
  }, [teachers, q]);

  const canManageAdmins = admin?.is_owner || hasPerm("admin.manage_admins");
  const canManageUsers = admin?.is_owner || hasPerm("admin.manage_users") || hasPerm("admin.manage_students");
  const canManageTeachers = admin?.is_owner || hasPerm("admin.manage_teachers");
  const canManageSettings = admin?.is_owner || hasPerm("admin.manage_settings");

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
            Welcome, <b>{admin?.username}</b>. Owner: {admin?.is_owner ? "YES" : "NO"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => load({ soft: true })} disabled={refreshing}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              await logout();
              // route guard qaytaradi
              window.location.href = "/";
            }}
          >
            Logout
          </Button>
        </div>
      </div>

      {/* tabs */}
      <div className="mt-8 flex flex-wrap gap-2">
        <Tab active={tab === "overview"} onClick={() => setTab("overview")}>Overview</Tab>
        <Tab active={tab === "admins"} onClick={() => setTab("admins")}>Admins</Tab>
        <Tab active={tab === "users"} onClick={() => setTab("users")}>Students</Tab>
        <Tab active={tab === "teachers"} onClick={() => setTab("teachers")}>Teachers</Tab>
        <Tab active={tab === "settings"} onClick={() => setTab("settings")}>Settings</Tab>
      </div>

      {err ? (
        <div className="mt-6 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
          {err}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Skeleton /><Skeleton /><Skeleton />
        </div>
      ) : (
        <>
          {tab === "overview" ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card title="Database Tables" desc="Snapshot">
                <div className="space-y-2 text-sm">
                  {summary?.db_tables ? (
                    Object.entries(summary.db_tables).map(([k, v]) => (
                      <Row key={k} label={k} value={v} />
                    ))
                  ) : (
                    <div className="text-white/60 text-xs">No data</div>
                  )}
                </div>
              </Card>

              <Card title="Security" desc="Rules">
                <ul className="text-xs text-white/70 space-y-2 leading-relaxed">
                  <li>• Password → 2FA → suspicious → Email approval</li>
                  <li>• Lockout escalation (5m → 10m → 20m ...)</li>
                  <li>• Strict RBAC: owner bypass, others permission-based</li>
                </ul>
              </Card>

              <Card title="Quick Actions" desc="Manage core modules">
                <div className="grid gap-2">
                  <Button onClick={() => setTab("admins")} className="w-full" disabled={!canManageAdmins}>
                    Manage Admins
                  </Button>
                  <Button onClick={() => setTab("teachers")} className="w-full" disabled={!canManageTeachers}>
                    Manage Teachers
                  </Button>
                  <Button onClick={() => setTab("users")} className="w-full" disabled={!canManageUsers}>
                    Manage Students
                  </Button>
                </div>
              </Card>
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
                    <Button size="sm" onClick={() => setModal({ type: "admin_create" })}>
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
                        <th className="text-left py-3">Owner</th>
                        <th className="text-left py-3">Active</th>
                        <th className="text-left py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/90">
                      {admins.map((a) => (
                        <tr key={a.id} className="border-b border-white/5">
                          <td className="py-3 font-semibold">{a.username}</td>
                          <td className="py-3 text-white/70">{a.email}</td>
                          <td className="py-3">
                            <Pill tone={a.is_owner ? "emerald" : "white"}>{a.is_owner ? "OWNER" : "ADMIN"}</Pill>
                          </td>
                          <td className="py-3">
                            <Pill tone={a.is_active ? "emerald" : "red"}>{a.is_active ? "ACTIVE" : "DISABLED"}</Pill>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageAdmins}
                                onClick={() => setModal({ type: "admin_edit", payload: a })}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageAdmins || a.is_owner}
                                onClick={() => setModal({ type: "admin_delete", payload: a })}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
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
                desc="Edit / delete users"
                right={
                  canManageUsers ? <Pill tone="emerald">MANAGE</Pill> : <Pill tone="red">NO PERMISSION</Pill>
                }
              >
                <Search value={q} onChange={setQ} />
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead className="text-white/70">
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3">Name</th>
                        <th className="text-left py-3">Email</th>
                        <th className="text-left py-3">Provider</th>
                        <th className="text-left py-3">Verified</th>
                        <th className="text-left py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/90">
                      {filteredUsers.map((u) => (
                        <tr key={u.id} className="border-b border-white/5">
                          <td className="py-3 font-semibold">{u.full_name}</td>
                          <td className="py-3 text-white/70">{u.email}</td>
                          <td className="py-3">
                            <Pill tone="white">{u.provider === "google" ? "Google" : "Email"}</Pill>
                          </td>
                          <td className="py-3">
                            <Pill tone={u.email_verified ? "emerald" : "red"}>{u.email_verified ? "YES" : "NO"}</Pill>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageUsers}
                                onClick={() => setModal({ type: "user_edit", payload: u })}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageUsers}
                                onClick={() => setModal({ type: "user_delete", payload: u })}
                              >
                                Delete
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageTeachers}
                                onClick={() => setModal({ type: "teacher_create_from_user", payload: u })}
                              >
                                Make Teacher
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : null}

          {/* TEACHERS */}
          {tab === "teachers" ? (
            <div className="mt-6">
              <Card
                title="Teachers"
                desc="Teachers table (separate from users)"
                right={
                  canManageTeachers ? <Pill tone="emerald">MANAGE</Pill> : <Pill tone="red">NO PERMISSION</Pill>
                }
              >
                <Search value={q} onChange={setQ} />
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-sm">
                    <thead className="text-white/70">
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3">Name</th>
                        <th className="text-left py-3">Email</th>
                        <th className="text-left py-3">Teacher Code</th>
                        <th className="text-left py-3">Active</th>
                        <th className="text-left py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-white/90">
                      {filteredTeachers.map((t) => (
                        <tr key={t.id} className="border-b border-white/5">
                          <td className="py-3 font-semibold">{t.full_name}</td>
                          <td className="py-3 text-white/70">{t.email}</td>
                          <td className="py-3">
                            <Pill tone="white">{t.teacher_code || "—"}</Pill>
                          </td>
                          <td className="py-3">
                            <Pill tone={t.is_active ? "emerald" : "red"}>{t.is_active ? "ACTIVE" : "DISABLED"}</Pill>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageTeachers}
                                onClick={() => setModal({ type: "teacher_edit", payload: t })}
                              >
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!canManageTeachers}
                                onClick={() => setModal({ type: "teacher_delete", payload: t })}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : null}

          {/* SETTINGS */}
          {tab === "settings" ? (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <Card title="Security Settings" desc="Change your password / 2FA" right={canManageSettings ? null : <Pill tone="red">NO PERMISSION</Pill>}>
                <div className="grid gap-2">
                  <Button disabled={!canManageSettings} onClick={() => setModal({ type: "change_password" })}>
                    Change Password
                  </Button>
                  <Button disabled={!canManageSettings} onClick={() => setModal({ type: "change_2fa" })}>
                    Change 2FA
                  </Button>
                </div>
              </Card>

              <Card title="Session" desc="Refresh auth state">
                <div className="grid gap-2">
                  <Button onClick={boot}>Re-check Session (me)</Button>
                  <Button variant="ghost" onClick={() => load({ soft: true })}>
                    Reload Dashboard Data
                  </Button>
                </div>
              </Card>
            </div>
          ) : null}
        </>
      )}

      {/* MODALS (minimal, pro) */}
      {modal ? (
        <Modal onClose={closeModal} title={modalTitle(modal.type)}>
          <ModalBody
            modal={modal}
            close={closeModal}
            refresh={() => load({ soft: true })}
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

/* ================= UI bits ================= */
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

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2">
      <span className="text-white/70 text-xs">{label}</span>
      <span className="text-white/90 text-xs font-semibold">{value ?? "—"}</span>
    </div>
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

function Search({ value, onChange }) {
  return (
    <div className="mt-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search name/email/code..."
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

/* ================= Modal ================= */
function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/85 backdrop-blur p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="text-sm font-bold">{title}</div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-white/10"
          >
            ✕
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

function modalTitle(type) {
  const m = {
    admin_create: "Add Admin",
    admin_edit: "Edit Admin",
    admin_delete: "Delete Admin",
    user_edit: "Edit Student",
    user_delete: "Delete Student",
    teacher_create_from_user: "Create Teacher",
    teacher_edit: "Edit Teacher",
    teacher_delete: "Delete Teacher",
    change_password: "Change Password",
    change_2fa: "Change 2FA",
  };
  return m[type] || "Modal";
}

/* ================= Modal Body (CRUD actions) ================= */
function ModalBody({
  modal,
  close,
  refresh,
  canManageAdmins,
  canManageUsers,
  canManageTeachers,
  canManageSettings,
}) {
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // forms
  const [form, setForm] = useState(() => {
    const p = modal.payload || {};
    return {
      username: p.username || "",
      email: p.email || "",
      is_active: p.is_active ?? 1,

      full_name: p.full_name || "",
      email_verified: p.email_verified ?? 0,

      teacher_code: p.teacher_code || "",
      t_active: p.is_active ?? 1,

      new_password: "",
      new_twofa: "",
    };
  });

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const act = async (fn) => {
    setErr("");
    setLoading(true);
    try {
      await fn();
      await refresh();
      close();
    } catch (e) {
      setErr(e?.message || "Action failed");
    } finally {
      setLoading(false);
    }
  };

  // ADMIN CREATE
  if (modal.type === "admin_create") {
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}
        <Field label="Username" value={form.username} onChange={(v) => set("username", v)} />
        <Field label="Email" value={form.email} onChange={(v) => set("email", v)} />
        <Field label="Temp Password" value={form.new_password} onChange={(v) => set("new_password", v)} />
        <Field label="Temp 2FA" value={form.new_twofa} onChange={(v) => set("new_twofa", v)} />
        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageAdmins}
            onClick={() =>
              act(() =>
                adminApi.createAdmin({
                  username: form.username.trim(),
                  email: form.email.trim(),
                  temp_password: form.new_password,
                  temp_twofa: form.new_twofa,
                })
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
        <SelectBool label="Active" value={form.is_active} onChange={(v) => set("is_active", v)} />
        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageAdmins}
            onClick={() =>
              act(() =>
                adminApi.updateAdmin({
                  id: a.id,
                  email: form.email.trim(),
                  is_active: Number(form.is_active),
                })
              )
            }
          >
            {loading ? "Saving..." : "Save"}
          </Button>
          <Button variant="ghost" className="w-full" onClick={close}>
            Close
          </Button>
        </div>
        <div className="text-[11px] text-white/55">
          Permissions/roles UI’ni ham qo‘shamiz (RBAC endpoints tayyor bo‘lsa).
        </div>
      </div>
    );
  }

  // ADMIN DELETE
  if (modal.type === "admin_delete") {
    const a = modal.payload;
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}
        <div className="rounded-xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
          Delete admin: <b>{a.username}</b> ?
        </div>
        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageAdmins}
            onClick={() => act(() => adminApi.deleteAdmin({ id: a.id }))}
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

  // USER EDIT
  if (modal.type === "user_edit") {
    const u = modal.payload;
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
          Editing user ID: <b className="text-white">{u.id}</b>
        </div>
        <Field label="Full name" value={form.full_name} onChange={(v) => set("full_name", v)} />
        <Field label="Email" value={form.email} onChange={(v) => set("email", v)} />
        <SelectBool label="Email Verified" value={form.email_verified} onChange={(v) => set("email_verified", v)} />
        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageUsers}
            onClick={() =>
              act(() =>
                adminApi.updateUser({
                  id: u.id,
                  full_name: form.full_name.trim(),
                  email: form.email.trim(),
                  email_verified: Number(form.email_verified),
                })
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
            onClick={() => act(() => adminApi.deleteUser({ id: u.id }))}
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

  // TEACHER CREATE FROM USER
  if (modal.type === "teacher_create_from_user") {
    const u = modal.payload;
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
          Create teacher from: <b className="text-white">{u.full_name}</b> ({u.email})
        </div>
        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageTeachers}
            onClick={() => act(() => adminApi.createTeacher({ user_id: u.id }))}
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

  // TEACHER EDIT
  if (modal.type === "teacher_edit") {
    const t = modal.payload;
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
          Editing teacher: <b className="text-white">{t.email}</b>
        </div>
        <Field label="Teacher code" value={form.teacher_code} onChange={(v) => set("teacher_code", v)} />
        <SelectBool label="Active" value={form.t_active} onChange={(v) => set("t_active", v)} />
        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageTeachers}
            onClick={() =>
              act(() =>
                adminApi.updateTeacher({
                  id: t.id,
                  teacher_code: form.teacher_code.trim(),
                  is_active: Number(form.t_active),
                })
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

  // TEACHER DELETE
  if (modal.type === "teacher_delete") {
    const t = modal.payload;
    return (
      <div className="space-y-3">
        {err ? <ErrorBox msg={err} /> : null}
        <div className="rounded-xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
          Delete teacher <b>{t.email}</b> ?
        </div>
        <div className="flex gap-2">
          <Button
            className="w-full"
            disabled={loading || !canManageTeachers}
            onClick={() => act(() => adminApi.deleteTeacher({ id: t.id }))}
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
            act(() =>
              adminApi.changePassword({
                current_password: form.current_password,
                new_password: form.new_password,
              })
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
        Security note: after update, all sessions will be revoked and you’ll need
        to login again.
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
            act(() =>
              adminApi.change2fa({
                current_twofa: form.current_twofa,
                new_twofa: form.new_twofa,
              })
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
        Security note: after update, all sessions will be revoked and you’ll need
        to login again.
      </div>
    </div>
  );
}

  return <div className="text-xs text-white/70">Unknown modal.</div>;
}

function ErrorBox({ msg }) {
  return (
    <div className="rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
      {msg}
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <div className="text-xs text-white/70 mb-2">{label}</div>
      <input
        value={value}
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
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-2 outline-none focus:ring-2 focus:ring-white/15 text-white"
      >
        <option value={1}>Yes</option>
        <option value={0}>No</option>
      </select>
    </label>
  );
}
