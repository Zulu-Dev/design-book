import Link from "next/link";

export function AppHeader({
  active,
}: {
  active?: "swipe" | "catalog" | "library";
}) {
  const links = [
    { href: "/swipe", label: "Swipe", key: "swipe" as const },
    { href: "/catalog", label: "Catalog", key: "catalog" as const },
    { href: "/library", label: "Keepers", key: "library" as const },
  ];

  return (
    <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
      <Link href="/" className="text-sm font-semibold tracking-wide text-zinc-100">
        Design Book
      </Link>
      <nav className="flex gap-2 text-sm">
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
      </nav>
    </header>
  );
}
