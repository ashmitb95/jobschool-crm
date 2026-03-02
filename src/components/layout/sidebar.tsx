"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Kanban,
  MessageSquare,
  Settings,
} from "lucide-react";

const nav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Leads", href: "/leads", icon: Users },
  { label: "Pipeline", href: "/pipeline", icon: Kanban },
  { label: "Templates", href: "/templates", icon: MessageSquare },
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 border-r border-border bg-sidebar flex flex-col shrink-0">
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border">
        <div className="w-6 h-6 rounded-full bg-primary" />
        <span className="text-sm font-bold tracking-wider uppercase text-sidebar-foreground">
          JobSchool
        </span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {nav.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-5 py-4 border-t border-border">
        <p className="text-[10px] font-mono tracking-wider text-muted-foreground uppercase">
          JobSchool CRM v1.0
        </p>
      </div>
    </aside>
  );
}
