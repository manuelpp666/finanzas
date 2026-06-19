import { Link, useRouterState } from "@tanstack/react-router";
import { Home, BarChart3, Target } from "lucide-react";
import type { ReactNode } from "react";

const navItems = [
  { to: "/", label: "Inicio", icon: Home },
  { to: "/stats", label: "Estadísticas", icon: BarChart3 },
  { to: "/goals", label: "Metas", icon: Target },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Desktop top nav */}
      <header className="hidden md:block sticky top-0 z-30 backdrop-blur bg-background/80 border-b border-border/60">
        <div className="mx-auto max-w-5xl px-8 py-5 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-foreground grid place-items-center">
              <span className="font-display text-background text-lg leading-none">L</span>
            </div>
            <span className="font-display text-xl">Lumen</span>
          </Link>
          <nav className="flex items-center gap-1">
            {navItems.map((item) => {
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    active ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      {/* Mobile top */}
      <header className="md:hidden sticky top-0 z-30 backdrop-blur bg-background/85 border-b border-border/60">
        <div className="px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-foreground grid place-items-center">
              <span className="font-display text-background text-base leading-none">L</span>
            </div>
            <span className="font-display text-lg">Lumen</span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 md:px-8 pt-6 pb-32 md:pb-16">{children}</main>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 border-t border-border/60 bg-background/95 backdrop-blur">
        <div className="grid grid-cols-3">
          {navItems.map((item) => {
            const active = pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex flex-col items-center gap-1 py-3 text-[11px] font-medium ${
                  active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                <Icon className={`size-5 ${active ? "stroke-[2.25]" : "stroke-[1.75]"}`} />
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>
    </div>
  );
}
