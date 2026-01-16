const BASE =
  import.meta.env.VITE_ADMIN_API_BASE ||
  "https://694fc8f1e1918.myxvest1.ru/uzstudents/api/admin";

function qs(params = {}) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    const s = String(v);
    if (!s.trim()) return;
    sp.set(k, s);
  });
  const q = sp.toString();
  return q ? `?${q}` : "";
}

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {}

  if (!res.ok || data?.ok === false) {
    const err = new Error(data?.message || `Request failed (${res.status})`);
    err.data = data;
    err.status = res.status;
    throw err;
  }
  return data;
}

// (optional) fallback helper
async function reqWithFallback(path, { primaryMethod, body }) {
  try {
    return await req(path, { method: primaryMethod, body: JSON.stringify(body) });
  } catch (e) {
    const s = Number(e?.status || 0);
    const shouldFallback = s === 0 || s === 403 || s === 404 || s === 405;
    if (!shouldFallback) throw e;
    return await req(path, { method: "POST", body: JSON.stringify(body) });
  }
}

export const adminApi = {
  // auth
  login: (body) => req("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  verify2fa: (body) => req("/auth/verify-2fa", { method: "POST", body: JSON.stringify(body) }),
  requestApproval: (body) =>
    req("/auth/request-approval", { method: "POST", body: JSON.stringify(body) }),
  me: () => req("/auth/me"),
  logout: () => req("/auth/logout", { method: "POST" }),

  // summary
  summary: () => req("/summary"),

  // db
  dbTable: ({ name }) => req(`/db/table${qs({ name })}`),

  // admins + rbac
  listAdmins: () => req("/admins/list"),
  createAdmin: (body) => req("/admins/create", { method: "POST", body: JSON.stringify(body) }),

  // ✅ hosting PATCH bloklasa ham 100% ishlashi uchun POST ishlatamiz
  updateAdmin: (body) => req("/admins/update", { method: "POST", body: JSON.stringify(body) }),
  deleteAdmin: (body) => req("/admins/delete", { method: "POST", body: JSON.stringify(body) }),

  // agar xohlasang fallback variant:
  // updateAdmin: (body) => reqWithFallback("/admins/update", { primaryMethod: "PATCH", body }),
  // deleteAdmin: (body) => reqWithFallback("/admins/delete", { primaryMethod: "DELETE", body }),

  listRoles: () => req("/rbac/roles"),
  listPermissions: () => req("/rbac/permissions"),
  setAdminRoles: (body) =>
    req("/rbac/set-admin-roles", { method: "POST", body: JSON.stringify(body) }),
  setRolePermissions: (body) =>
    req("/rbac/set-role-permissions", { method: "POST", body: JSON.stringify(body) }),

  // users
  listUsers: ({ q, limit = 200, cursor } = {}) => req(`/users/list${qs({ q, limit, cursor })}`),

  // ✅ update/delete POST (DELETE body muammosi yo‘qoladi)
  updateUser: (body) => req("/users/update", { method: "POST", body: JSON.stringify(body) }),
  deleteUser: (body) => req("/users/delete", { method: "POST", body: JSON.stringify(body) }),

  // teachers
  listTeachers: ({ q, limit = 200, cursor } = {}) =>
    req(`/teachers/list${qs({ q, limit, cursor })}`),

  createTeacher: (body) => req("/teachers/create", { method: "POST", body: JSON.stringify(body) }),

  // ✅ update/delete POST
  updateTeacher: (body) => req("/teachers/update", { method: "POST", body: JSON.stringify(body) }),
  deleteTeacher: (body) => req("/teachers/delete", { method: "POST", body: JSON.stringify(body) }),

  teacherDetail: ({ id }) => req(`/teachers/detail${qs({ id })}`),
  teacherGroups: ({ teacher_id }) => req(`/teachers/groups${qs({ teacher_id })}`),

  updateTeacherGroup: (body) =>
    req("/teachers/group/update", { method: "POST", body: JSON.stringify(body) }),
  deleteTeacherGroup: (body) =>
    req("/teachers/group/delete", { method: "POST", body: JSON.stringify(body) }),

  // settings
  changePassword: (body) =>
    req("/auth/change-password", { method: "POST", body: JSON.stringify(body) }),
  change2fa: (body) => req("/auth/change-2fa", { method: "POST", body: JSON.stringify(body) }),
};
