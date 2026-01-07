import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import Input from "../../../components/ui/Input";
import Button from "../../../components/ui/Button";
import { adminApi } from "../../../services/api/admin";
import AdminShell from "../../../components/ui/AdminShell";
import { useAdminAuth } from "../../../context/AdminAuthContext";

export default function TwoFAForm() {
  const nav = useNavigate();
  const loc = useLocation();
  const { boot } = useAdminAuth();

  const challenge_id = loc.state?.challenge_id;
  const suspiciousFromPassword = !!loc.state?.suspicious_any_step;

  const [twofa, setTwofa] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [twoFails, setTwoFails] = useState(0);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const suspicious_any_step = suspiciousFromPassword || twoFails >= 2;
      const r = await adminApi.verify2fa({
        challenge_id,
        twofa,
        suspicious_any_step,
      });

      if (r.step === "email_approval_required") {
        nav("/approval", { state: { admin_id: r.admin_id }, replace: true });
        return;
      }

      // Boot session before navigating to dashboard
      await boot();
      nav("/dashboard", { replace: true });
    } catch (e2) {
      setErr(e2?.message || "2FA failed");
      setTwoFails((x) => x + 1);
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
              Step 2 • Two-Factor Verification
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
              2FA <span className="text-white/70">Verification</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              Ikkinchi bosqich: 2FA kodni kiriting. 2 marta xato bo'lsa, keyingi
              urinish to'g'ri bo'lsa ham <b>Email approval</b> ishga tushadi.
            </p>

            {suspiciousFromPassword ? (
              <div className="mt-6 rounded-2xl border border-amber-400/15 bg-amber-400/10 px-4 py-3 text-xs text-amber-100/90 backdrop-blur">
                ⚠️ Suspicious attempts detected in password step. Email approval
                may be required.
              </div>
            ) : null}

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Feature
                title="Secure Session"
                desc="Cookies + strict server checks."
              />
              <Feature
                title="Attempt Tracking"
                desc="Abuse protection & escalation."
              />
            </div>
          </div>

          {/* RIGHT */}
          <div className="lg:flex lg:justify-end">
            <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
              <div className="flex items-center justify-between">
                <div className="text-sm font-bold">Enter 2FA code</div>
                <div className="text-xs text-white/60">
                  Attempts: {twoFails}
                </div>
              </div>

              {!challenge_id ? (
                <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
                  Session expired. Go back to login.
                  <div className="mt-3">
                    <Button onClick={() => nav("/", { replace: true })}>
                      Back
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {err ? (
                    <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
                      {err}
                    </div>
                  ) : null}

                  <form onSubmit={submit} className="mt-5 space-y-3">
                    <Input
                      label="2FA Code"
                      placeholder="Enter your 2FA code"
                      value={twofa}
                      onChange={(e) => setTwofa(e.target.value)}
                    />

                    <Button type="submit" disabled={loading} className="w-full">
                      {loading ? "Verifying..." : "Login"}
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={() => nav("/", { replace: true })}
                    >
                      Back to Login
                    </Button>
                  </form>
                </>
              )}
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
