import { database } from "@/lib/database";
export const dynamic = "force-dynamic";
export function GET() {
  try {
    database.prepare("SELECT 1").get();
    return Response.json({ status: "ok" });
  } catch {
    return Response.json({ status: "unavailable" }, { status: 503 });
  }
}
