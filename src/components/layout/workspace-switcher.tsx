"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useWorkspaceStore, type WorkspaceSummary } from "@/lib/stores/workspace-store";
import { cn } from "@/lib/utils/cn";

interface WorkspaceSwitcherProps {
  currentWorkspaceId: string;
  workspaces: WorkspaceSummary[];
}

type ApiPayload<T> = {
  data?: T;
  error?: string;
};

type WorkspaceSnapshot = {
  currentWorkspaceId: string;
  workspaces: WorkspaceSummary[];
};

async function fetchWorkspaceSnapshot(): Promise<WorkspaceSnapshot> {
  const response = await fetch("/api/me", {
    credentials: "same-origin",
    headers: { "content-type": "application/json" }
  });
  const payload = (await response.json().catch(() => null)) as
    | ApiPayload<{
        user: { currentWorkspaceId: string };
        workspaces: WorkspaceSummary[];
      }>
    | null;
  if (!response.ok || !payload?.data) {
    throw new Error(payload?.error ?? "workspace 状态读取失败");
  }

  return {
    currentWorkspaceId: payload.data.user.currentWorkspaceId,
    workspaces: payload.data.workspaces
  };
}

export function WorkspaceSwitcher({ currentWorkspaceId, workspaces }: WorkspaceSwitcherProps) {
  const [pending, setPending] = useState(false);
  const storedWorkspaceId = useWorkspaceStore((state) => state.currentWorkspaceId);
  const storedWorkspaces = useWorkspaceStore((state) => state.workspaces);
  const setCurrentWorkspaceId = useWorkspaceStore((state) => state.setCurrentWorkspaceId);
  const setWorkspaceSnapshot = useWorkspaceStore((state) => state.setWorkspaceSnapshot);
  const selectedWorkspaceId = storedWorkspaceId ?? currentWorkspaceId;
  const visibleWorkspaces = storedWorkspaces.length > 0 ? storedWorkspaces : workspaces;
  const selectedWorkspace = visibleWorkspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? visibleWorkspaces[0];

  const workspaceSnapshot = useQuery({
    queryKey: ["workspace-snapshot"],
    queryFn: fetchWorkspaceSnapshot,
    initialData: {
      currentWorkspaceId,
      workspaces
    }
  });

  useEffect(() => {
    setWorkspaceSnapshot({ currentWorkspaceId, workspaces });
  }, [currentWorkspaceId, setWorkspaceSnapshot, workspaces]);

  useEffect(() => {
    setWorkspaceSnapshot(workspaceSnapshot.data);
  }, [setWorkspaceSnapshot, workspaceSnapshot.data]);

  async function switchWorkspace(workspaceId: string) {
    if (workspaceId === selectedWorkspaceId) {
      return;
    }

    const previousWorkspaceId = selectedWorkspaceId;
    setCurrentWorkspaceId(workspaceId);
    setPending(true);
    try {
      const response = await fetch("/api/workspaces/switch", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId })
      });
      if (!response.ok) {
        setCurrentWorkspaceId(previousWorkspaceId);
        return;
      }
      window.location.reload();
    } catch {
      setCurrentWorkspaceId(previousWorkspaceId);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="relative min-w-0">
        <select
          aria-label="切换 workspace"
          className={cn(
            "h-8 w-full max-w-[260px] appearance-none rounded-md border border-border bg-surface py-0 pl-3 pr-8 text-xs font-medium text-foreground transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20",
            pending && "cursor-wait opacity-70"
          )}
          disabled={pending}
          value={selectedWorkspaceId}
          onChange={(event) => switchWorkspace(event.target.value)}
        >
          {visibleWorkspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      <Badge tone="info">{selectedWorkspace.currentPlan}</Badge>
    </>
  );
}
