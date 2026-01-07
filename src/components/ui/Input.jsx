export default function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      {label ? (
        <div className="text-xs text-slate-300 mb-1">{label}</div>
      ) : null}
      <input
        className={
          "w-full rounded-2xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm outline-none " +
          "focus:ring-2 focus:ring-white/15 placeholder:text-slate-500 " +
          className
        }
        {...props}
      />
    </label>
  );
}
