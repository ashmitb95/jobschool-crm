"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Building2, LogOut, Mail, Menu } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";

const nav = [
  { label: "Organizations", href: "/manage", icon: Building2 },
  { label: "Email Templates", href: "/manage/email-templates", icon: Mail },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full">
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border shrink-0">
        <div className="w-6 h-6 rounded-full bg-primary" />
        <span className="text-base font-semibold tracking-wide text-sidebar-foreground font-serif">
          JobSchool
        </span>
      </div>

      <nav className="flex-1 py-4 px-3 space-y-1">
        {nav.map((item) => {
          const isActive = item.href === "/manage"
            ? pathname === "/manage"
            : pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
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

      <div className="px-3 py-4 border-t border-border space-y-3 shrink-0">
        {user && (
          <div className="flex items-center gap-2 px-2">
            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
              {user.displayName.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {user.displayName}
              </p>
              <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5">
                {user.role}
              </Badge>
            </div>
          </div>
        )}
        <button
          onClick={() => { onNavigate?.(); logout(); }}
          className="flex items-center gap-3 px-3 py-2 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </div>
  );
}

export function ManageSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className="hidden md:flex w-56 border-r border-border bg-sidebar flex-col shrink-0">
        <SidebarContent />
      </aside>

      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-md bg-card border border-border shadow-md"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-56 p-0 bg-sidebar" showCloseButton={false}>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
