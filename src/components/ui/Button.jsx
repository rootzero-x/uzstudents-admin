export default function Button({
  children,
  className = "",
  variant = "solid",
  size = "md",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-2xl font-semibold transition focus:outline-none focus:ring-2 focus:ring-white/15 disabled:opacity-60 disabled:cursor-not-allowed";
  const sizes = {
    sm: "px-3 py-2 text-sm",
    md: "px-4 py-2.5 text-sm",
  };
  const variants = {
    solid: "bg-white text-slate-950 hover:bg-white/90",
    ghost: "bg-white/5 text-white border border-white/10 hover:bg-white/10",
  };

  return (
    <button
      className={`${base} ${sizes[size] || sizes.md} ${variants[variant] || variants.solid} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
