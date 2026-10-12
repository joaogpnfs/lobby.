"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// ponytail: comparison helper; delete once option A or B is chosen.
export function DesignSwitch() {
  const path = usePathname();
  const options = [
    { href: "/", label: "Opção A" },
    { href: "/b", label: "Opção B" },
  ];
  return (
    <nav
      aria-label="Comparar versões do site"
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 z-40 flex -translate-x-1/2 gap-1 rounded-full border border-hairline bg-canvas/90 p-1 text-sm shadow-lg backdrop-blur"
    >
      {options.map((o) => (
        <Link
          key={o.href}
          href={o.href}
          aria-current={path === o.href ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 font-medium transition-colors ${
            path === o.href ? "bg-ink text-canvas" : "text-slate hover:text-ink"
          }`}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
