import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { IconLabel } from "@/components/icon-label";
export default function NotFound() {
  return (
    <div className="empty-state full">
      <h1>这页走丢了。</h1>
      <p>文章可能已移动或尚未公开。</p>
      <Link className="button" href="/">
        <IconLabel icon={ArrowRight}>回到首页</IconLabel>
      </Link>
    </div>
  );
}
