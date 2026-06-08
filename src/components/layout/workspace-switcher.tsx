"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

interface WorkspaceOption {
  id: string;
  name: string;
  currentPlan: string;
}

interface WorkspaceSwitcherProps {
  currentWorkspaceId: string;
  workspaces: WorkspaceOption[];
}

export function WorkspaceSwitcher({ currentWorkspaceId, workspaces }: WorkspaceSwitcherProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(currentWorkspaceId);
  const [pending, setPending] = useState(false);
  const selectedWorkspace = workspaces.find((workspace) => workspace.id === selectedWorkspaceId) ?? workspaces[0];

  useEffect(() => {
    setSelectedWorkspaceId(currentWorkspaceId);
  }, [currentWorkspaceId]);

  async function switchWorkspace(workspaceId: string) {
    if (workspaceId === selectedWorkspaceId) {
      return;
    }

    const previousWorkspaceId = selectedWorkspaceId;
    setSelectedWorkspaceId(workspaceId);
    setPending(true);
    try {
      const response = await fetch("/api/workspaces/switch", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId })
      });
      if (!response.ok) {
        setSelectedWorkspaceId(previousWorkspaceId);
        return;
      }
      window.location.reload();
    } catch {
      setSelectedWorkspaceId(previousWorkspaceId);
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
          {workspaces.map((workspace) => (
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
