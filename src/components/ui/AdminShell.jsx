export default function AdminShell({ children }) {
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

      <div className="relative">{children}</div>
    </div>
  );
}
