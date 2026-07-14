import { Link } from "@tanstack/react-router";
import { Home, Search, Library, BookHeadphones } from "lucide-react";

const items = [
  { to: "/", label: "Home", Icon: Home, exact: true },
  { to: "/search", label: "Search", Icon: Search, exact: false },
  { to: "/audiobooks", label: "Books", Icon: BookHeadphones, exact: false },
  { to: "/library", label: "Library", Icon: Library, exact: false },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/5 bg-background/95 backdrop-blur">
      <ul className="mx-auto grid max-w-2xl grid-cols-4">
        {items.map(({ to, label, Icon, exact }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact }}
              activeProps={{ className: "text-foreground" }}
              inactiveProps={{ className: "text-muted-foreground" }}
              className="flex flex-col items-center gap-1 py-3 text-xs font-medium"
            >
              <Icon className="h-6 w-6" />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}