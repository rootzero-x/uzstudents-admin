import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import Button from "../../components/ui/Button";
import { adminApi } from "../../services/api/admin";

export default function ApprovalPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const admin_id = loc.state?.admin_id;

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const send = async () => {
    setErr("");
    setLoading(true);
    try {
      await adminApi.requestApproval({ admin_id });
      setSent(true);
    } catch (e) {
      setErr(e?.message || "Failed to send approval email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative mx-auto flex min-h-screen w-full max-w-7xl items-center px-6 py-16">
      <div className="w-full grid gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
            Security Step • Owner Approval
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
            Email <span className="text-white/70">Approval</span>
          </h1>

          <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
            Shubhali urinishlar aniqlandi. Owner emailga tasdiqlash linki
            yuboriladi. Tasdiqlangandan so‘ng dashboard ochiladi.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Feature title="Link expires" desc="15 daqiqa ichida tugaydi." />
            <Feature title="Audit-ready" desc="IP/Device info emailda bor." />
          </div>
        </div>

        <div className="lg:flex lg:justify-end">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur">
            <div className="text-sm font-bold">Approve access request</div>

            {err ? (
              <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
                {err}
              </div>
            ) : null}

            {sent ? (
              <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-100/90">
                ✅ Email sent. Inbox/spam tekshiring.
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
                Owner tasdiqlamaguncha dashboardga kirish blok.
              </div>
            )}

            <div className="mt-5 space-y-3">
              <Button
                onClick={send}
                disabled={loading || sent}
                className="w-full"
              >
                {sent
                  ? "Email Sent ✅"
                  : loading
                  ? "Sending..."
                  : "Send Approval Email"}
              </Button>

              <Button
                variant="ghost"
                onClick={() => nav("/", { replace: true })}
                className="w-full"
              >
                Back to Login
              </Button>

              <div className="text-[11px] text-white/55 leading-relaxed">
                Agar bu urinish sizniki bo‘lmasa, emaildagi linkni tasdiqlamang.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
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
