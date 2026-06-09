"use client";

import { ShieldCheck, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ApiPayload<T> = {
  data?: T;
  error?: string;
};

type SystemSettingPayload = {
  key: string;
  value: {
    metricDays?: number;
    auditDays?: number;
    authorizationCacheDays?: number;
    errorLogDays?: number;
    updatedFrom?: string;
  };
};

type AuditRetentionPrunePayload = {
  workspaceId: string;
  auditDays: number;
  cutoffAt: string;
  prunedCount: number;
  retainedCount: number;
};

const retentionPolicyPayload = {
  key: "data_retention_policy",
  value: {
    metricDays: 180,
    auditDays: 730,
    authorizationCacheDays: 14,
    errorLogDays: 60,
    updatedFrom: "settings_retention_panel"
  }
};

export function DataRetentionPolicyAction() {
  const router = useRouter();
  const [pending, setPending] = useState<"refresh" | "prune">();
  const [message, setMessage] = useState<string>();

  async function refreshPolicy() {
    setPending("refresh");
    setMessage(undefined);

    try {
      const response = await fetch("/api/settings/system", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(retentionPolicyPayload)
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<SystemSettingPayload> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "数据保留策略刷新失败");
      }

      setMessage(`保留策略已刷新：${payload?.data?.value.metricDays ?? retentionPolicyPayload.value.metricDays} 天指标`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "数据保留策略刷新失败");
    } finally {
      setPending(undefined);
    }
  }

  async function pruneAuditLogs() {
    setPending("prune");
    setMessage(undefined);

    try {
      const response = await fetch("/api/audit-logs/retention-prune", {
        method: "POST",
        credentials: "same-origin"
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<AuditRetentionPrunePayload> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "审计日志清理失败");
      }

      setMessage(`审计清理完成：${payload?.data?.prunedCount ?? 0} 条`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "审计日志清理失败");
    } finally {
      setPending(undefined);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="数据保留策略操作">
      <Button type="button" size="sm" variant="secondary" onClick={() => void refreshPolicy()} disabled={Boolean(pending)}>
        <ShieldCheck className="h-4 w-4" aria-hidden="true" />
        {pending === "refresh" ? "刷新中" : "刷新保留策略"}
      </Button>
      <Button type="button" size="sm" variant="secondary" onClick={() => void pruneAuditLogs()} disabled={Boolean(pending)}>
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        {pending === "prune" ? "清理中" : "执行审计清理"}
      </Button>
      {message ? (
        <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
