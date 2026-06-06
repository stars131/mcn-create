"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/constants/navigation";
import { cn } from "@/lib/utils/cn";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-64 shrink-0 border-r border-border bg-surface lg:sticky lg:top-0 lg:block">
      <div className="flex h-16 items-center border-b border-border px-5">
        <div>
          <div className="text-sm font-semibold">ContentOS</div>
          <div className="text-xs text-muted-foreground">中文创作者工作流系统</div>
        </div>
      </div>
      <nav className="space-y-1 p-3">
        {navItems.map((item) => {
          const active = item.href.includes("#") ? false : pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-9 items-center gap-3 rounded-md px-3 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground",
                active && "bg-cyan-50 text-primary"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
