import type * as React from "react";

import { cn } from "cn";

interface DashboardPageHeaderProps {
  title: string;
  description?: string;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

export function DashboardPageHeader({ title, description, badge, children, className }: DashboardPageHeaderProps) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-semibold text-2xl text-foreground tracking-tight sm:text-3xl">{title}</h1>
          {badge}
        </div>
        {description && <p className="max-w-3xl text-muted-foreground text-xs sm:text-sm">{description}</p>}
      </div>

      {children && (
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start sm:self-center">{children}</div>
      )}
    </div>
  );
}
