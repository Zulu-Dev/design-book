type TeammatePresenceProps = {
  name: string | null;
  online: boolean;
};

export function TeammatePresence({ name, online }: TeammatePresenceProps) {
  if (!name) return null;

  return (
    <span
      className="flex items-center gap-1.5 text-xs text-zinc-400"
      title={online ? `${name} is on the catalog` : `${name} is offline`}
    >
      <span
        className={`h-2 w-2 rounded-full ${
          online ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-zinc-600"
        }`}
        aria-hidden
      />
      <span className={online ? "text-zinc-300" : ""}>
        {name} {online ? "online" : "offline"}
      </span>
    </span>
  );
}
