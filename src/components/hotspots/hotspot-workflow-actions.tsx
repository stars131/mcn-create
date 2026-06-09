"use client";

import { RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ApiPayload<T> = {
  data?: T;
  error?: string;
};

type HotspotRefreshPayload = {
  items?: Array<{ id: string }>;
};

type TopicGenerationPayload = {
  topics?: Array<{ title: string }>;
};

interface HotspotTopicActionProps {
  hotItemId: string;
  hotItemTitle: string;
}

export function HotspotRefreshAction() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function refreshHotspots() {
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/hotspots/refresh", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platforms: ["ALL"], window: "24h" })
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<HotspotRefreshPayload> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "热点刷新失败");
      }

      const itemCount = payload?.data?.items?.length ?? 0;
      setMessage(`热点已刷新：${itemCount} 条`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "热点刷新失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="热点刷新工作流">
      <Button type="button" size="sm" variant="primary" onClick={() => void refreshHotspots()} disabled={pending}>
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        {pending ? "刷新中" : "刷新热点"}
      </Button>
      {message ? (
        <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}

export function HotspotTopicAction({ hotItemId, hotItemTitle }: HotspotTopicActionProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function generateTopic() {
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch(`/api/hotspots/${hotItemId}/generate-topic`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" }
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<TopicGenerationPayload> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "选题生成失败");
      }

      const topicCount = payload?.data?.topics?.length ?? 0;
      setMessage(`已生成 ${topicCount} 条选题`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "选题生成失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2" role="group" aria-label={`热点操作：${hotItemTitle}`}>
      <Button type="button" size="sm" variant="primary" onClick={() => void generateTopic()} disabled={pending}>
        <Sparkles className="h-4 w-4" aria-hidden="true" />
        {pending ? "生成中" : "生成选题"}
      </Button>
      {message ? (
        <span className="block text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
