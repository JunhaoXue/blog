"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { ArrowRight } from "lucide-react";
import { IconLabel } from "@/components/icon-label";
export default function Login() {
  const [register, setRegister] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const search = useSearchParams();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const email = String(form.get("email"));
      const password = String(form.get("password"));
      const result = register
        ? await authClient.signUp.email({
            email,
            password,
            name: String(form.get("name")),
          })
        : await authClient.signIn.email({ email, password });
      if (result.error) {
        setMessage(
          register
            ? "注册未完成，请检查邮箱、密码或尝试登录已有账号。"
            : "登录未完成，请检查邮箱和密码；尝试过于频繁时请稍后重试。",
        );
        return;
      }
      const next = search.get("next") || "/account";
      router.push(
        next.startsWith("/") && !next.startsWith("//") && !next.includes("\\")
          ? next
          : "/account",
      );
      router.refresh();
    } catch {
      setMessage("连接未完成，请稍后重试。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-shell">
      <h1>{register ? "注册" : "登录"}</h1>
      <form onSubmit={submit}>
        {register && (
          <div className="form-field">
            <label htmlFor="name">你的名字</label>
            <input
              id="name"
              name="name"
              required
              maxLength={60}
              autoComplete="name"
            />
          </div>
        )}
        <div className="form-field">
          <label htmlFor="email">邮箱</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </div>
        <div className="form-field">
          <label htmlFor="password">
            密码{register ? "（至少 12 位）" : ""}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={register ? 12 : 1}
            autoComplete={register ? "new-password" : "current-password"}
          />
        </div>
        {message && (
          <div role="alert" className="form-message error">
            {message}
          </div>
        )}
        <button className="button" disabled={busy}>
          {busy ? (
            "请稍候…"
          ) : (
            <IconLabel icon={ArrowRight}>
              {register ? "创建账号" : "登录"}
            </IconLabel>
          )}
        </button>
      </form>
      <button
        className="auth-switch"
        onClick={() => {
          setRegister(!register);
          setMessage("");
        }}
      >
        {register ? "已有账号？去登录" : "还没有账号？创建一个"}
      </button>
      <p className="no-index-note">
        本站仅保存参与评论所需的账号信息。请勿在公开内容中填写隐私或密码。
      </p>
    </div>
  );
}
