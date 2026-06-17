import Link from "next/link";
import { HeaderPresence } from "@/components/header-presence";

export function AppHeader({
  active,
}: {
  active?: "catalog" | "library";
}) {
  const links = [
    { href: "/catalog", label: "Catalog", key: "catalog" as const },
    { href: "/library", label: "Library", key: "library" as const },
  ];

  return (
    <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
      <Link href="/" className="text-sm font-semibold tracking-wide text-zinc-100">
        Design Book
      </Link>
      <nav className="flex items-center gap-3 text-sm">
        <HeaderPresence />
        <div className="flex gap-2">
        {links.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className={`rounded-full px-3 py-1.5 transition ${
              active === link.key
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {link.label}
          </Link>
        ))}
        </div>
      </nav>
    </header>
  );
}
