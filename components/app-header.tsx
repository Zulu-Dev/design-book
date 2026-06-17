import Link from "next/link";

export function AppHeader({
  active,
}: {
  active?: "swipe" | "library";
}) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
      <Link href="/" className="text-sm font-semibold tracking-wide text-zinc-100">
        Design Book
      </Link>
      <nav className="flex gap-2 text-sm">
        <Link
          href="/swipe"
          className={`rounded-full px-3 py-1.5 transition ${
            active === "swipe"
              ? "bg-zinc-100 text-zinc-900"
              : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          Swipe
        </Link>
        <Link
          href="/library"
          className={`rounded-full px-3 py-1.5 transition ${
            active === "library"
              ? "bg-zinc-100 text-zinc-900"
              : "text-zinc-400 hover:text-zinc-100"
          }`}
        >
          Library
        </Link>
      </nav>
    </header>
  );
}
