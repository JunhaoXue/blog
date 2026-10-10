import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/authorization";
import { AccountForm } from "@/components/account-form";
export const metadata = {
  title: "我的账号",
  robots: { index: false, follow: false },
};
export default async function Account() {
  const session = await getSession();
  if (!session) redirect("/login?next=/account");
  return (
    <div className="auth-shell">
      <h1>我的账号</h1>
      <p>{session.user.email}</p>
      {session.user.role === "admin" && (
        <p>
          <Link href="/admin" className="small-link">
            进入管理后台 →
          </Link>
        </p>
      )}
      <AccountForm name={session.user.name} />
    </div>
  );
}
