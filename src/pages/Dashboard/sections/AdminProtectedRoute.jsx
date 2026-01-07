import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAdminAuth } from "../../../context/AdminAuthContext";

export default function AdminProtectedRoute() {
  const { isAuthed, booting } = useAdminAuth();
  const loc = useLocation();

  if (booting) {
    return (
      <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden">
        {/* background glow */}
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

        <div className="relative min-h-screen grid place-items-center px-6">
          <div className="w-full max-w-md">
            {/* badge */}
            <div className="mx-auto w-fit inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              admin.uzstudents.uz • Secure Access
            </div>

            {/* card */}
            <div className="mt-4 rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/30 overflow-hidden">
              {/* shimmer bar */}
              <div className="h-[2px] w-full bg-white/10 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.2s_infinite] bg-gradient-to-r from-transparent via-white/35 to-transparent" />
              </div>

              <div className="p-6">
                <div className="flex items-center gap-3">
                  {/* spinner */}
                  <div className="relative h-11 w-11 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
                    <div className="h-5 w-5 rounded-full border-2 border-white/25 border-t-white/80 animate-spin" />
                  </div>

                  <div className="min-w-0">
                    <div className="text-lg font-extrabold tracking-tight">
                      Loading dashboard
                    </div>
                    <div className="text-xs text-white/60 mt-0.5 leading-relaxed">
                      Checking session, permissions, and security state…
                    </div>
                  </div>
                </div>

                {/* skeleton lines */}
                <div className="mt-5 space-y-3">
                  <SkeletonLine w="w-10/12" />
                  <SkeletonLine w="w-8/12" />
                  <SkeletonLine w="w-6/12" />
                </div>

                {/* progress */}
                <div className="mt-5">
                  <div className="flex items-center justify-between text-[11px] text-white/55">
                    <span>Authenticating</span>
                    <span className="font-medium">please wait</span>
                  </div>

                  <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-2/5 rounded-full bg-white/40 animate-[bar_1.1s_ease-in-out_infinite]" />
                  </div>

                  <div className="mt-3 text-[11px] text-white/50">
                    Tip: if this takes too long, refresh once.
                  </div>
                </div>
              </div>
            </div>

            {/* footer note */}
            <div className="mt-4 text-center text-[11px] text-white/45">
              Protected route • UzStudents Admin
            </div>
          </div>
        </div>

        {/* keyframes */}
        <style>{`
          @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes bar {
            0% { transform: translateX(-25%); opacity: .65; }
            50% { transform: translateX(35%); opacity: 1; }
            100% { transform: translateX(120%); opacity: .65; }
          }
        `}</style>
      </div>
    );
  }

  return isAuthed ? (
    <Outlet />
  ) : (
    <Navigate to="/" replace state={{ from: loc.pathname }} />
  );
}

function SkeletonLine({ w = "w-full" }) {
  return (
    <div className={`h-3 ${w} rounded-full bg-white/10 overflow-hidden`}>
      <div className="h-full w-full -translate-x-full animate-[shimmer_1.35s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
    </div>
  );
}
