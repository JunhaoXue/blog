import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { MouseEventHandler } from "react";

export function BackLink({
  href,
  label,
  className = "",
  onClick,
}: {
  href: string;
  label: string;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      href={href}
      className={`back-link ${className}`.trim()}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <ArrowLeft size={18} aria-hidden="true" focusable="false" />
    </Link>
  );
}
