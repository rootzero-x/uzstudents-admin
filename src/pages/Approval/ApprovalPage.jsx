import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import Button from "../../components/ui/Button";
import { adminApi } from "../../services/api/admin";

export default function ApprovalPage() {
  const loc = useLocation();
  const nav = useNavigate();
  const admin_id = loc.state?.admin_id;

  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState("");

  const disabled = useMemo(
    () => loading || sent || !admin_id,
    [loading, sent, admin_id]
  );

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
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
      {/* background glow (same premium theme) */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-40 left-10 h-[520px] w-[520px] rounded-full bg-indigo-400/10 blur-3xl" />
        <div className="absolute -bottom-40 right-10 h-[520px] w-[520px] rounded-full bg-sky-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.06] via-transparent to-transparent" />
      </div>

      {/* grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div
          className="h-full w-full"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage:
              "radial-gradient(ellipse at center, black 45%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 45%, transparent 72%)",
          }}
        />
      </div>

      {/* content */}
      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
        <div className="w-full grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          {/* left */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
              admin.uzstudents.uz • Security Step
            </div>

            <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
              Email <span className="text-white/70">Approval</span>
            </h1>

            <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/70 sm:text-base">
              Shubhali urinishlar aniqlandi. Owner emailga tasdiqlash linki
              yuboriladi. Tasdiqlangandan so‘ng dashboard ochiladi.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Feature
                title="Link expires"
                desc="Tasdiqlash linki 15 daqiqa ichida tugaydi."
              />
              <Feature
                title="Audit-ready"
                desc="IP va device ma’lumotlari email ichida bo‘ladi."
              />
            </div>

            {!admin_id ? (
              <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs text-amber-100/90">
                ⚠️ Session ma’lumotlari topilmadi. Login’dan qayta urinib
                ko‘ring.
              </div>
            ) : null}
          </div>

          {/* right card */}
          <div className="lg:flex lg:justify-end">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl shadow-2xl shadow-black/30">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-extrabold">
                    Approve access request
                  </div>
                  <div className="mt-1 text-xs text-white/55">
                    Owner tasdiqlamaguncha dashboardga kirish bloklanadi.
                  </div>
                </div>
                <button
                  onClick={() => nav("/", { replace: true })}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white/70 hover:bg-white/10 transition"
                  title="Back to login"
                >
                  Back
                </button>
              </div>

              {err ? (
                <div className="mt-4 rounded-2xl border border-red-400/15 bg-red-400/10 px-4 py-3 text-xs text-red-100/90">
                  {err}
                </div>
              ) : null}

              {sent ? (
                <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/10 px-4 py-3 text-xs text-emerald-100/90">
                  ✅ Email yuborildi. Inbox/spam tekshiring.
                </div>
              ) : (
                <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/70">
                  Tasdiqlash emailini yuboring va owner linkni tasdiqlasin.
                </div>
              )}

              <div className="mt-5 space-y-3">
                <Button onClick={send} disabled={disabled} className="w-full">
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
                  Agar bu urinish sizniki bo‘lmasa, emaildagi linkni{" "}
                  <b>tasdiqlamang</b>.
                </div>
              </div>

              <div className="mt-6 grid gap-2">
                <MiniItem label="Expires" value="15 minutes" />
                <MiniItem label="Security" value="IP + Device logged" />
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

function MiniItem({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs">
      <span className="text-white/60">{label}</span>
      <span className="font-semibold text-white/85">{value}</span>
    </div>
  );
}
