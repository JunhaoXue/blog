import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { auth } from "./auth";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function authorize(request: Request, admin = false) {
  const origin = request.headers.get("origin");
  const expected = new URL(
    process.env.BETTER_AUTH_URL || "http://localhost:3000",
  ).origin;
  if (origin !== expected)
    throw new HttpError(403, "请求来源无效，请刷新页面后重试。");
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) throw new HttpError(401, "请先登录。");
  if (admin && session.user.role !== "admin")
    throw new HttpError(403, "需要管理员权限。");
  return session;
}
export async function jsonBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "请求格式无效。");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 512_000) {
      await reader.cancel();
      throw new HttpError(413, "内容过长。");
    }
    chunks.push(value);
  }
  const body = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, "请求格式无效。");
  }
}
export async function endpoint(action: () => unknown | Promise<unknown>) {
  try {
    return NextResponse.json(await action());
  } catch (error) {
    if (error instanceof HttpError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof ZodError)
      return NextResponse.json(
        { error: error.issues[0]?.message || "输入无效。" },
        { status: 400 },
      );
    if (
      error instanceof Error &&
      "code" in error &&
      String(error.code).startsWith("SQLITE_CONSTRAINT")
    ) {
      return NextResponse.json(
        { error: "名称或地址已存在，或者该分类仍有文章。" },
        { status: 409 },
      );
    }
    console.error(error);
    return NextResponse.json(
      { error: "操作未完成，请稍后重试。" },
      { status: 500 },
    );
  }
}
