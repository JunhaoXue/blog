"use client";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
export function AccountForm({ name }: { name: string }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  async function profile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const result = await authClient.updateUser({
        name: String(new FormData(event.currentTarget).get("name")),
      });
      setMessage(result.error ? "更新失败。" : "名字已更新。");
      router.refresh();
    } catch {
      setMessage("连接失败。");
    } finally {
      setBusy(false);
    }
  }
  async function password(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setMessage("");
    try {
      const data = new FormData(form);
      const result = await authClient.changePassword({
        currentPassword: String(data.get("current")),
        newPassword: String(data.get("new")),
        revokeOtherSessions: true,
      });
      if (result.error) {
        setMessage("修改失败，请检查当前密码；新密码至少 12 位。");
      } else {
        setMessage("密码已更新，其他设备登录已退出。");
        form.reset();
      }
    } catch {
      setMessage("连接失败。");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form onSubmit={profile}>
        <div className="form-field">
          <label htmlFor="name">名字</label>
          <input
            id="name"
            name="name"
            defaultValue={name}
            required
            maxLength={60}
          />
        </div>
        <button className="button" disabled={busy}>
          保存名字
        </button>
      </form>
      <hr />
      <h2 className="sr-only">修改密码</h2>
      <form onSubmit={password}>
        <div className="form-field">
          <label htmlFor="current">当前密码</label>
          <input
            id="current"
            name="current"
            type="password"
            required
            autoComplete="current-password"
          />
        </div>
        <div className="form-field">
          <label htmlFor="new">新密码（至少 12 位）</label>
          <input
            id="new"
            name="new"
            type="password"
            minLength={12}
            required
            autoComplete="new-password"
          />
        </div>
        <button className="button" disabled={busy}>
          修改密码
        </button>
      </form>
      {message && (
        <div role="status" className="form-message">
          {message}
        </div>
      )}
    </>
  );
}
