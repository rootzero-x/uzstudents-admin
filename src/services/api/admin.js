const BASE =
  import.meta.env.VITE_ADMIN_API_BASE ||
  "https://694fc8f1e1918.myxvest1.ru/uzstudents/api/admin";

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

export const adminApi = {
  // auth
  login: (body) =>
    req("/auth/login", { method: "POST", body: JSON.stringify(body) }),
  verify2fa: (body) =>
    req("/auth/verify-2fa", { method: "POST", body: JSON.stringify(body) }),
  requestApproval: (body) =>
    req("/auth/request-approval", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  me: () => req("/auth/me"),
  logout: () => req("/auth/logout", { method: "POST" }),

  // dashboard
  summary: () => req("/summary"),

  // admins + rbac
  listAdmins: () => req("/admins/list"),
  createAdmin: (body) =>
    req("/admins/create", { method: "POST", body: JSON.stringify(body) }),
  updateAdmin: (body) =>
    req("/admins/update", { method: "PATCH", body: JSON.stringify(body) }),
  deleteAdmin: (body) =>
    req("/admins/delete", { method: "DELETE", body: JSON.stringify(body) }),

  listRoles: () => req("/rbac/roles"),
  listPermissions: () => req("/rbac/permissions"),
  setAdminRoles: (body) =>
    req("/rbac/set-admin-roles", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  setRolePermissions: (body) =>
    req("/rbac/set-role-permissions", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // users (students)
  listUsers: () => req("/users/list"),
  updateUser: (body) =>
    req("/users/update", { method: "PATCH", body: JSON.stringify(body) }),
  deleteUser: (body) =>
    req("/users/delete", { method: "DELETE", body: JSON.stringify(body) }),

  // teachers (separate table)
  listTeachers: () => req("/teachers/list"),
  createTeacher: (body) =>
    req("/teachers/create", { method: "POST", body: JSON.stringify(body) }), // {user_id}
  updateTeacher: (body) =>
    req("/teachers/update", { method: "PATCH", body: JSON.stringify(body) }),
  deleteTeacher: (body) =>
    req("/teachers/delete", { method: "DELETE", body: JSON.stringify(body) }),

  // settings
  changePassword: (body) =>
    req("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  change2fa: (body) =>
    req("/auth/change-2fa", { method: "POST", body: JSON.stringify(body) }),
};
