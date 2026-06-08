"use client";

import { ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { roleLabels } from "@/lib/constants/navigation";
import type { RoleKey } from "@/types/domain";

const memberRoles: RoleKey[] = ["OWNER", "ADMIN", "EDITOR", "ANALYST", "VIEWER"];

interface MemberRoleSelectProps {
  workspaceId: string;
  memberId: string;
  memberEmail: string;
  initialRole: RoleKey;
}

export function MemberRoleSelect({ workspaceId, memberId, memberEmail, initialRole }: MemberRoleSelectProps) {
  const router = useRouter();
  const [role, setRole] = useState<RoleKey>(initialRole);
  const [savedRole, setSavedRole] = useState<RoleKey>(initialRole);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    setRole(initialRole);
    setSavedRole(initialRole);
  }, [initialRole]);

  async function updateRole(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "角色更新失败");
      }

      const updatedRole = (payload?.data?.role as RoleKey | undefined) ?? role;
      setRole(updatedRole);
      setSavedRole(updatedRole);
      setMessage("角色已更新");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "角色更新失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="flex min-w-[220px] flex-wrap items-center gap-2" onSubmit={updateRole}>
      <label className="sr-only" htmlFor={`member-role-${memberId}`}>
        调整权限：{memberEmail}
      </label>
      <select
        id={`member-role-${memberId}`}
        className="h-8 rounded-md border border-border bg-surface px-2 text-xs outline-none transition focus:border-primary"
        value={role}
        onChange={(event) => setRole(event.target.value as RoleKey)}
      >
        {memberRoles.map((item) => (
          <option key={item} value={item}>
            {roleLabels[item]}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" variant="secondary" disabled={pending || role === savedRole}>
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        {pending ? "保存中" : "保存角色"}
      </Button>
      {message ? (
        <span className="w-full text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </form>
  );
}
