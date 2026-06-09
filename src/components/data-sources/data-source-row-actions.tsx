"use client";

import { DatabaseZap, ShieldX } from "lucide-react";
import Link from "next/link";
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

function buildAuthorizationDeleteAuditHref(sourceId: string) {
  const params = new URLSearchParams({
    auditAction: "data_source.authorization.delete",
    auditEntityType: "DataSource",
    auditQ: sourceId,
    auditLimit: "20"
  });
  return `/settings?${params.toString()}#audit`;
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
      {currentStatus === "REVOKED" ? (
        <Link
          className="focus-ring inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground hover:bg-muted"
          href={buildAuthorizationDeleteAuditHref(sourceId)}
        >
          查看删除审计
        </Link>
      ) : null}
    </div>
  );
}
