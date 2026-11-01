import type { ReactNode } from "react";
import { Link } from "react-router";

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  breadcrumb?: { to: string; label: string; current: string };
};

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        {breadcrumb && (
          <nav
            aria-label="Breadcrumb"
            className="text-[13px] text-muted-foreground"
          >
            <Link to={breadcrumb.to} className="text-primary hover:underline">
              {breadcrumb.label}
            </Link>{" "}
            / <span aria-current="page">{breadcrumb.current}</span>
          </nav>
        )}
        <h1 className="text-[40px] leading-[1.1] font-bold tracking-[-0.03em]">
          {title}
        </h1>
        {description && (
          <p className="text-base text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
