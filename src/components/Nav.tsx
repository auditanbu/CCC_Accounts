"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";

import { cn } from "@/lib/cn";
import { CricketIcon, HomeIcon, PeopleIcon, TrophyIcon } from "@/components/ui/Icons";

type Tab = {
  href: string;
  /** Short form for the phone tab bar, where five labels share the width. */
  label: string;
  /** Full name elsewhere — "Cups" alone did not read as "Tournaments". */
  longLabel?: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
};

const TABS: Tab[] = [
  { href: "/", label: "Home", icon: HomeIcon },
  { href: "/matches", label: "Matches", icon: CricketIcon },
  { href: "/players", label: "Players", icon: PeopleIcon },
  { href: "/tournaments", label: "Cups", longLabel: "Tournaments", icon: TrophyIcon },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Fixed glass tab bar — the primary navigation on phones. */
export function TabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="glass fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] sm:hidden"
      style={{ paddingBottom: "var(--safe-bottom)" }}
      aria-label="Primary"
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 transition-colors active:opacity-60",
                  active ? "text-ios-blue" : "text-label-secondary",
                )}
              >
                <Icon width={24} height={24} strokeWidth={active ? 2.1 : 1.7} />
                <span className="text-[10px] font-medium tracking-tight">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Inline nav pills shown in the header on tablet and up. */
export function DesktopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden items-center gap-1 sm:flex" aria-label="Primary">
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-lg px-3 py-1.5 text-[14px] font-medium transition-colors",
              active
                ? "bg-ios-blue/10 text-ios-blue"
                : "text-label-secondary hover:bg-black/[0.04] hover:text-label",
            )}
          >
            {tab.longLabel ?? tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
