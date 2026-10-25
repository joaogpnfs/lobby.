"use client";

import type { Me, Permission } from "@lobby/types";
import {
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  FileText,
  House,
  MapPin,
  Menu,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useLogout, useMe } from "@/features/auth/api";
import { useNotifications } from "@/features/notifications/api";
import { ApiError } from "@/lib/api-client";
import { ROLE_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon; permission?: Permission };

const NAV: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: House },
  { href: "/employees", label: "Colaboradores", icon: Users, permission: "employees:read" },
  { href: "/documents", label: "Documentos", icon: FileText, permission: "documents:read" },
  { href: "/vacations", label: "Férias", icon: CalendarDays, permission: "vacations:read" },
  { href: "/departments", label: "Departamentos", icon: Building2, permission: "org-structure:manage" },
  { href: "/positions", label: "Cargos", icon: Briefcase, permission: "org-structure:manage" },
  { href: "/branches", label: "Filiais", icon: MapPin, permission: "org-structure:manage" },
  { href: "/notifications", label: "Notificações", icon: Bell },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export default function AppLayout({ children }: LayoutProps<"/">) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useMe();
  const signedOut = me.error instanceof ApiError && me.error.status === 401;

  useEffect(() => {
    if (signedOut) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [signedOut, pathname, router]);

  if (me.isPending || signedOut) {
    return <p className="m-auto text-muted-foreground">Carregando…</p>;
  }
  if (me.isError) {
    return (
      <div className="m-auto grid justify-items-center gap-3 text-center">
        <p>Não foi possível carregar sua conta.</p>
        <Button variant="outline" onClick={() => me.refetch()}>
          Tentar de novo
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 border-r bg-sidebar md:block">
        <Sidebar me={me.data} />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileBar me={me.data} />
        <main className="flex-1 px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}

function Sidebar({ me, onNavigate }: { me: Me; onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const logout = useLogout();
  const unread = useNotifications().data?.unread ?? 0;
  const items = NAV.filter((i) => !i.permission || me.permissions.includes(i.permission));

  return (
    <div className="flex h-full flex-col gap-6 p-4">
      <div className="grid gap-0.5 px-2">
        <span className="text-xl font-bold tracking-tight">
          lobby<span className="text-primary">.</span>
        </span>
        <span className="truncate text-sm text-muted-foreground">{me.organization.name}</span>
      </div>

      <nav aria-label="Principal" className="grid gap-0.5">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                active && "bg-sidebar-accent font-medium text-sidebar-foreground",
              )}
            >
              <Icon aria-hidden className={cn("size-4", active && "text-primary")} />
              {label}
              {href === "/notifications" && unread > 0 && (
                <span className="ml-auto rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground tabular-nums">
                  {unread}
                  <span className="sr-only"> não lidas</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto grid gap-2 border-t px-2 pt-4">
        <div className="flex items-center gap-2.5">
          {me.user.avatarUrl && (
            <img src={me.user.avatarUrl} alt="" className="size-8 shrink-0 rounded-full" referrerPolicy="no-referrer" />
          )}
          <div className="grid min-w-0">
            <span className="truncate text-sm font-medium">{me.user.name}</span>
            <span className="text-xs text-muted-foreground">{ROLE_LABEL[me.role]}</span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="justify-start px-0"
          disabled={logout.isPending}
          onClick={() => logout.mutate(undefined, { onSettled: () => router.replace("/login") })}
        >
          Sair
        </Button>
      </div>
    </div>
  );
}

function MobileBar({ me }: { me: Me }) {
  const [open, setOpen] = useState(false);
  const unread = useNotifications().data?.unread ?? 0;
  return (
    <header className="flex items-center gap-3 border-b px-4 py-2 md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger render={<Button variant="ghost" size="icon" aria-label="Abrir menu" />}>
          <Menu />
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <Sidebar me={me} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <span className="font-bold tracking-tight">
        lobby<span className="text-primary">.</span>
      </span>
      <Link
        href="/notifications"
        className={buttonVariants({ variant: "ghost", size: "icon", className: "relative ml-auto" })}
        aria-label={unread > 0 ? `Notificações, ${unread} não lidas` : "Notificações"}
      >
        <Bell aria-hidden />
        {unread > 0 && <span aria-hidden className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />}
      </Link>
    </header>
  );
}
