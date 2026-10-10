"use client";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
export function AccountMenu({ name, role }: { name?: string; role?: string }) {
  const router = useRouter();
  if (!name)
    return (
      <Link className="small-link" href="/login">
        登录 <span aria-hidden>↗</span>
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
