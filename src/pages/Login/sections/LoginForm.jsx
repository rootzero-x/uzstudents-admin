import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { adminApi } from "../../../services/api/admin";
import AdminShell from "../../../components/ui/AdminShell";

export default function LoginForm() {
  const nav = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [suspiciousAnyStep, setSuspiciousAnyStep] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const r = await adminApi.login({ username, password });

      nav("/2fa", {
        state: {
          challenge_id: r.challenge_id,
          suspicious_any_step: suspiciousAnyStep,
        },
        replace: true,
      });
    } catch (e2) {
      setErr(e2?.message || "Invalid credentials");
      if (e2?.data?.suspicious) setSuspiciousAnyStep(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminShell>
      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-16">
        <div className="w-full grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
          {/* LEFT */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              admin.uzstudents.uz • Secure Access
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
              Admin <span className="text-white/70">Login</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              Kirish 2 bosqich: <b>Password</b> → <b>2FA</b>. Agar 2 marta xato
              urinish bo'lsa, xavfsizlik uchun <b>Email approval</b> ishga
              tushadi.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Feature
                title="Strict RBAC"
                desc="Owner bypass, others permission-based."
              />
              <Feature
                title="Smart Lockout"
                desc="5m → 10m → 20m ... escalation."
              />
            </div>

            {suspiciousAnyStep ? (
              <div className="mt-6 rounded-2xl border border-amber-400/15 bg-amber-400/10 px-4 py-3 text-xs text-amber-100/90 backdrop-blur">
                ⚠️ Suspicious attempts detected. Successful login may require
                owner email approval.
              </div>
            ) : null}
          </div>

          {/* RIGHT: FORM */}
          <div className="lg:flex lg:justify-end">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">Sign in</div>
                <div className="text-xs text-white/60">UzStudents Admin</div>
              </div>

              {err ? (
                <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
                  {err}
                </div>
              ) : null}

              <form onSubmit={submit} className="mt-5 space-y-3">
                <Input
                  label="Username"
                  placeholder="Enter your username"
                  value={username}
                  autoComplete="username"
                  onChange={(e) => setUsername(e.target.value)}
                />
                <Input
                  label="Password"
                  placeholder="Enter your password"
                  type="password"
                  value={password}
                  autoComplete="current-password"
                  onChange={(e) => setPassword(e.target.value)}
                />

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Checking..." : "Continue"}
                </Button>

                <div className="mt-2 text-[11px] text-white/55 leading-relaxed">
                  By continuing, you agree to security monitoring. Owner
                  accounts have full access.
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

function Feature({ title, desc }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
      <div className="text-sm font-bold">{title}</div>
      <div className="mt-2 text-xs leading-relaxed text-white/70">{desc}</div>
    </div>
  );
}
