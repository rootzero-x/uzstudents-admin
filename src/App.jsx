export default function App() {
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
            maskImage: "radial-gradient(ellipse at center, black 45%, transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 45%, transparent 72%)",
          }}
        />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-6xl items-center px-6 py-16">
        <div className="w-full">
          {/* top badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/80 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            admin.uzstudents.uz • Admin Panel
          </div>

          <h1 className="mt-6 text-4xl font-extrabold tracking-tight sm:text-6xl">
            Coming <span className="text-white/70">Soon</span>
          </h1>

          <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/70 sm:text-base">
            UzStudents Admin Panel ustida ishlayapmiz. Bu yerda teacher account
            yaratish, RBAC boshqaruvi, course/group nazorati, audit log va xavfsizlik
            sozlamalari bo‘ladi.
          </p>

          {/* cards */}
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Secure Admin Access",
                desc: "Only approved admins. Session security & strict RBAC.",
              },
              {
                title: "Teacher Account Creation",
                desc: "Teacher signup yopiq. Admin yaratadi va reset link beradi.",
              },
              {
                title: "Audit & Control",
                desc: "Logs, permissions, groups, anti-spam, join code rotate.",
              },
            ].map((c) => (
              <div
                key={c.title}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur"
              >
                <div className="text-sm font-bold">{c.title}</div>
                <div className="mt-2 text-xs leading-relaxed text-white/70">
                  {c.desc}
                </div>
              </div>
            ))}
          </div>

          {/* bottom */}
          <div className="mt-10 flex flex-wrap items-center gap-3 text-xs text-white/60">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">
              TailwindCSS 3.4
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">
              Nunito Font
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 backdrop-blur">
              Production-ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
