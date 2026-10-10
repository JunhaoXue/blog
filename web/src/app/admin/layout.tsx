import Link from "next/link";
import {
  LayoutDashboard,
  FileText,
  MessageSquare,
  Settings,
  Image,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { requireAdmin } from "@/lib/authorization";
export const metadata = {
  title: "管理后台",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="admin-layout">
      <aside className="admin-nav">
        <Link href="/admin">
          <LayoutDashboard size={16} />
          概览
        </Link>
        <Link href="/admin/articles">
          <FileText size={16} />
          文章
        </Link>
        <Link href="/admin/comments">
          <MessageSquare size={16} />
          评论与讨论
        </Link>
        <Link href="/admin/media">
          <Image size={16} />
          图片
        </Link>
        <Link href="/admin/users">
          <Users size={16} />
          读者与权限
        </Link>
        <Link href="/admin/settings">
          <Settings size={16} />
          分类与友链
        </Link>
        <Link href="/account">
          <ArrowUpRight size={16} />
          我的账号
        </Link>
      </aside>
      <div className="admin-main">{children}</div>
    </div>
  );
}
