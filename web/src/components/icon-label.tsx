import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function IconLabel({
  icon: Icon,
  children,
  leading = false,
}: {
  icon: LucideIcon;
  children: ReactNode;
  leading?: boolean;
}) {
  const icon = <Icon size={16} aria-hidden="true" focusable="false" />;
  return (
    <span className="icon-label">
      {leading && icon}
      <span>{children}</span>
      {!leading && icon}
    </span>
  );
}
