import {
  CalendarDays,
  LayoutGrid,
  LogOut,
  Receipt,
  Users,
  type LucideIcon,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router";

import { useUserData } from "~/hooks/use-user-data";
import { initials } from "~/lib/format";
import { signOut } from "~/lib/session";
import { cn } from "~/lib/utils";

type NavItem = { to: string; label: string; icon: LucideIcon };

const NAV_GROUPS: { heading: string; items: NavItem[] }[] = [
  {
    heading: "Overview",
    items: [{ to: "/dashboard", label: "Dashboard", icon: LayoutGrid }],
  },
  {
    heading: "Manage",
    items: [
      { to: "/members", label: "Members", icon: Users },
      { to: "/events", label: "Events", icon: CalendarDays },
    ],
  },
  {
    heading: "Finance",
    items: [{ to: "/reimbursements", label: "Reimbursements", icon: Receipt }],
  },
];

export function AppSidebar({ schoolYear }: { schoolYear: string }) {
  const user = useUserData();
  const navigate = useNavigate();

  async function handleLogOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <aside className="flex max-w-full flex-[1_1_248px] flex-col gap-1 rounded-[20px] border border-sidebar-border bg-sidebar px-3.5 py-[18px] text-sidebar-foreground shadow-[0_12px_32px_-20px_rgba(76,29,149,0.18)] lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)] lg:max-w-[248px] lg:overflow-y-auto">
      <div className="flex items-center gap-2.5 px-1.5 pb-3.5">
        <img
          src="/pmc-logo.png"
          alt="UBC PMC logo"
          className="h-8 w-9 object-contain"
        />
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground">
            PMC {schoolYear}
          </span>
          <span className="text-[15px] font-semibold">PMC Internal Tool</span>
        </div>
      </div>

      <nav aria-label="Main" className="flex flex-col">
        {NAV_GROUPS.map((group) => (
          <div key={group.heading} className="flex flex-col gap-1.5 py-2.5">
            <span className="px-2.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              {group.heading}
            </span>
            <div className="flex flex-col gap-0.5">
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex min-h-11 items-center gap-2.5 rounded-[10px] px-2.5 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-[#EFEFF6]",
                      isActive &&
                        "bg-sidebar-accent font-semibold text-sidebar-accent-foreground hover:bg-sidebar-accent",
                    )
                  }
                >
                  <Icon aria-hidden="true" className="size-[18px]" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 px-1.5 pt-2.5">
        <span
          aria-hidden="true"
          className="brand-gradient flex size-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold text-white"
        >
          {initials(user.firstName, user.lastName)}
        </span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-semibold">
            {user.displayName}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {user.email}
          </span>
        </div>
        <button
          type="button"
          aria-label="Log out"
          onClick={handleLogOut}
          className="flex size-11 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-[#EFEFF6] hover:text-foreground"
        >
          <LogOut aria-hidden="true" className="size-[18px]" />
        </button>
      </div>
    </aside>
  );
}
