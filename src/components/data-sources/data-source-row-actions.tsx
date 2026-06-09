"use client";

import { DatabaseZap, ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AuthorizationStatus, DataSource } from "@/types/domain";

type RowAction = "sync" | "delete";

type ApiPayload<T> = {
  data?: T;
  error?: string;
};

interface DataSourceRowActionsProps {
  sourceId: string;
  sourceName: string;
  authorizationStatus: AuthorizationStatus;
}

export function DataSourceRowActions({
  sourceId,
  sourceName,
  authorizationStatus
}: DataSourceRowActionsProps) {
  const router = useRouter();
  const [currentStatus, setCurrentStatus] = useState(authorizationStatus);
  const [pendingAction, setPendingAction] = useState<RowAction | null>(null);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    setCurrentStatus(authorizationStatus);
  }, [authorizationStatus]);

  async function runAction(action: RowAction) {
    setPendingAction(action);
    setMessage(undefined);

    try {
      const response = await fetch(action === "sync" ? `/api/data-sources/${sourceId}/sync` : `/api/data-sources/${sourceId}`, {
        method: action === "sync" ? "POST" : "DELETE",
        credentials: "same-origin",
        headers: { "content-type": "application/json" }
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<DataSource> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "数据源操作失败");
      }

      if (action === "sync") {
        setCurrentStatus(payload?.data?.authorizationStatus ?? "CONNECTED");
        setMessage("数据源已同步");
      } else {
        setCurrentStatus("REVOKED");
        setMessage("授权数据已删除");
      }
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "数据源操作失败");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-2" role="group" aria-label={`数据源操作：${sourceName}`}>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void runAction("sync")}
          disabled={pendingAction !== null || currentStatus === "REVOKED"}
        >
          <DatabaseZap className="h-4 w-4" aria-hidden="true" />
          {pendingAction === "sync" ? "同步中" : "同步"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="danger"
          onClick={() => void runAction("delete")}
          disabled={pendingAction !== null || currentStatus === "REVOKED"}
        >
          <ShieldX className="h-4 w-4" aria-hidden="true" />
          {pendingAction === "delete" ? "删除中" : "删除授权"}
        </Button>
      </div>
      {message ? (
        <span className="block text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
