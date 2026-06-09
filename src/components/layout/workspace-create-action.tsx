"use client";

import { Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ApiPayload<T> = {
  data?: T;
  error?: string;
};

type WorkspacePayload = {
  id: string;
  name: string;
};

interface WorkspaceCreateActionProps {
  nextName: string;
  organizationName: string;
}

export function WorkspaceCreateAction({ nextName, organizationName }: WorkspaceCreateActionProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function createWorkspace() {
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: nextName,
          organizationName
        })
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<WorkspacePayload> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "workspace 创建失败");
      }

      setMessage(`workspace 已创建：${payload?.data?.name ?? nextName}`);
      await queryClient.invalidateQueries({ queryKey: ["workspace-snapshot"] });
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "workspace 创建失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Workspace 创建操作">
      <Button
        type="button"
        size="sm"
        variant="primary"
        onClick={() => void createWorkspace()}
        disabled={!mounted || pending}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
        {pending ? "创建中" : "新建"}
      </Button>
      {message ? (
        <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
