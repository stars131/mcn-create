"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import type { TopicStatus } from "@/types/domain";

interface TopicUpdateFormProps {
  topicId: string;
  topicTitle: string;
  initialStatus: TopicStatus;
  initialScore: number;
}

const topicStatuses: Array<{ value: TopicStatus; label: string }> = [
  { value: "PENDING", label: "待评估" },
  { value: "ADOPTED", label: "已采纳" },
  { value: "WRITING", label: "写作中" },
  { value: "PUBLISHED", label: "已发布" },
  { value: "DROPPED", label: "已放弃" }
];

export function TopicUpdateForm({ topicId, topicTitle, initialStatus, initialScore }: TopicUpdateFormProps) {
  const router = useRouter();
  const [status, setStatus] = useState<TopicStatus>(initialStatus);
  const [score, setScore] = useState(String(initialScore));
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function updateTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);

    try {
      const nextScore = Number(score);
      if (!Number.isFinite(nextScore) || nextScore < 0 || nextScore > 100) {
        throw new Error("评分需在 0-100 之间");
      }

      const response = await fetch(`/api/topics/${topicId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          status,
          score: nextScore
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "选题更新失败");
      }

      setMessage("选题已更新");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "选题更新失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-2" onSubmit={updateTopic}>
      <div className="grid grid-cols-[minmax(88px,1fr)_64px] gap-2">
        <label className="sr-only" htmlFor={`topic-status-${topicId}`}>
          调整状态：{topicTitle}
        </label>
        <select
          id={`topic-status-${topicId}`}
          className="h-8 rounded-md border border-border bg-surface px-2 text-xs outline-none transition focus:border-primary"
          value={status}
          onChange={(event) => setStatus(event.target.value as TopicStatus)}
        >
          {topicStatuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor={`topic-score-${topicId}`}>
          调整评分：{topicTitle}
        </label>
        <input
          id={`topic-score-${topicId}`}
          className="h-8 rounded-md border border-border bg-surface px-2 text-xs outline-none transition focus:border-primary"
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(event) => setScore(event.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {pending ? "保存中" : "保存选题"}
        </Button>
        {message ? (
          <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
