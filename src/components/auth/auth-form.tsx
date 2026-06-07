"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface AuthFormProps {
  mode: "login" | "register";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const form = new FormData(event.currentTarget);
    const payload = {
      email: String(form.get("email")),
      password: String(form.get("password")),
      name: String(form.get("name") || "内容团队成员")
    };
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "认证失败");
      }
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "认证失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {mode === "register" ? (
        <label className="block">
          <span className="text-xs font-medium text-muted-foreground">姓名</span>
          <input
            name="name"
            className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm focus-ring"
            placeholder="内容团队成员"
          />
        </label>
      ) : null}
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">邮箱</span>
        <input
          name="email"
          type="email"
          required
          defaultValue={mode === "login" ? "owner@contentos.local" : undefined}
          className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm focus-ring"
          placeholder={mode === "login" ? "owner@contentos.local" : "you@example.com"}
        />
      </label>
      <label className="block">
        <span className="text-xs font-medium text-muted-foreground">密码</span>
        <input
          name="password"
          type="password"
          required
          defaultValue={mode === "login" ? "contentos123" : undefined}
          className="mt-1 h-10 w-full rounded-md border border-border bg-white px-3 text-sm focus-ring"
          placeholder={mode === "login" ? "contentos123" : "至少 6 位密码"}
        />
      </label>
      {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <Button type="submit" variant="primary" className="w-full" disabled={pending}>
        {pending ? "处理中" : mode === "login" ? "登录工作台" : "创建账号"}
      </Button>
    </form>
  );
}
