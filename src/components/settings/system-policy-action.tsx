"use client";

import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ApiPayload<T> = {
  data?: T;
  error?: string;
};

type SystemSettingPayload = {
  key: string;
  value: unknown;
};

export function SystemPolicyRefreshAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function refreshPolicy() {
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/settings/system", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          key: "risk_review_policy",
          value: {
            requireRiskCheckBeforeSchedule: true,
            restrictedDomains: ["医疗", "金融", "法律", "时政"],
            updatedFrom: "settings_page"
          }
        })
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<SystemSettingPayload> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "系统策略刷新失败");
      }

      setMessage(`策略已刷新：${payload?.data?.key ?? "risk_review_policy"}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "系统策略刷新失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="系统设置操作">
      <Button type="button" size="sm" variant="primary" onClick={() => void refreshPolicy()} disabled={pending}>
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {pending ? "更新中" : "刷新策略"}
      </Button>
      {message ? (
        <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
