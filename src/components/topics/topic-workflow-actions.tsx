"use client";

import { CalendarPlus, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { platformLabels } from "@/lib/constants/navigation";
import type { Platform } from "@/types/domain";

const fallbackPlatforms: Platform[] = ["XIAOHONGSHU", "DOUYIN", "WECHAT"];

interface TopicWorkflowActionsProps {
  topicId: string;
  topicTitle: string;
  targetPlatforms: Platform[];
}

export function TopicWorkflowActions({ topicId, topicTitle, targetPlatforms }: TopicWorkflowActionsProps) {
  const router = useRouter();
  const platformOptions = targetPlatforms.length > 0 ? targetPlatforms : fallbackPlatforms;
  const [platform, setPlatform] = useState<Platform>(platformOptions[0]);
  const [pendingAction, setPendingAction] = useState<"brief" | "calendar" | null>(null);
  const [message, setMessage] = useState<string>();

  async function runAction(action: "brief" | "calendar") {
    setPendingAction(action);
    setMessage(undefined);

    try {
      const response = await fetch(
        action === "brief" ? `/api/topics/${topicId}/generate-brief` : `/api/topics/${topicId}/add-to-calendar`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "content-type": "application/json" },
          body: action === "calendar" ? JSON.stringify({ platform }) : undefined
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "选题工作流操作失败");
      }

      setMessage(action === "brief" ? "内容 brief 已生成" : `${platformLabels[platform]}日历计划已创建`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "选题工作流操作失败");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="space-y-2" role="group" aria-label={`选题工作流：${topicTitle}`}>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="primary"
          onClick={() => void runAction("brief")}
          disabled={pendingAction !== null}
        >
          <FileText className="h-4 w-4" aria-hidden="true" />
          {pendingAction === "brief" ? "生成中" : "生成 brief"}
        </Button>
        <label className="sr-only" htmlFor={`topic-calendar-platform-${topicId}`}>
          日历平台：{topicTitle}
        </label>
        <select
          id={`topic-calendar-platform-${topicId}`}
          className="h-8 rounded-md border border-border bg-surface px-2 text-xs outline-none transition focus:border-primary"
          value={platform}
          onChange={(event) => setPlatform(event.target.value as Platform)}
          disabled={pendingAction !== null}
        >
          {platformOptions.map((item) => (
            <option key={item} value={item}>
              {platformLabels[item]}
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          onClick={() => void runAction("calendar")}
          disabled={pendingAction !== null}
        >
          <CalendarPlus className="h-4 w-4" aria-hidden="true" />
          {pendingAction === "calendar" ? "排期中" : "加日历"}
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
