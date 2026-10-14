"use client";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { IconLabel } from "./icon-label";
export function AccountMenu({ name, role }: { name?: string; role?: string }) {
  const router = useRouter();
  if (!name)
    return (
      <Link className="small-link" href="/login">
        <IconLabel icon={ArrowUpRight}>登录</IconLabel>
      </Link>
    );
  return (
    <div className="account-menu">
      <Link
        className="small-link"
        href={role === "admin" ? "/admin" : "/account"}
      >
        {role === "admin" ? "管理后台" : name}
      </Link>
      <button
        className="text-button"
        onClick={async () => {
          await authClient.signOut();
          router.refresh();
          router.push("/");
        }}
      >
        退出
      </button>
    </div>
  );
}
