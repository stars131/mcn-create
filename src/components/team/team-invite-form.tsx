"use client";

import { UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { roleLabels } from "@/lib/constants/navigation";
import type { RoleKey } from "@/types/domain";

const inviteRoles: Exclude<RoleKey, "OWNER">[] = ["ADMIN", "EDITOR", "ANALYST", "VIEWER"];

export function TeamInviteForm({ workspaceId }: { workspaceId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Exclude<RoleKey, "OWNER">>("VIEWER");
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string>();

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setStatus(undefined);
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          title: title.trim() || undefined
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "邀请失败");
      }

      setEmail("");
      setRole("VIEWER");
      setTitle("");
      setStatus("邀请已发送");
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "邀请失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="grid gap-3 sm:grid-cols-[minmax(180px,1fr)_140px_minmax(160px,0.7fr)_auto]" onSubmit={submitInvite}>
      <label className="sr-only" htmlFor="invite-email">
        成员邮箱
      </label>
      <input
        id="invite-email"
        className="h-9 rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="成员邮箱"
        required
      />
      <label className="sr-only" htmlFor="invite-role">
        成员角色
      </label>
      <select
        id="invite-role"
        className="h-9 rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
        value={role}
        onChange={(event) => setRole(event.target.value as Exclude<RoleKey, "OWNER">)}
      >
        {inviteRoles.map((item) => (
          <option key={item} value={item}>
            {roleLabels[item]}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="invite-title">
        成员职能
      </label>
      <input
        id="invite-title"
        className="h-9 rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
        type="text"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="职能"
      />
      <Button size="md" variant="primary" disabled={pending}>
        <UserPlus className="h-4 w-4" aria-hidden="true" />
        {pending ? "邀请中" : "邀请成员"}
      </Button>
      {status ? (
        <div className="text-xs text-muted-foreground sm:col-span-4" role="status" aria-live="polite">
          {status}
        </div>
      ) : null}
    </form>
  );
}
