"use client";

import { CopyPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { platformLabels } from "@/lib/constants/navigation";
import type { Platform } from "@/types/domain";

const adaptablePlatforms: Platform[] = ["XIAOHONGSHU", "DOUYIN", "BILIBILI", "WECHAT", "VIDEO_ACCOUNT"];

interface ContentAdaptationFormProps {
  contentDraftId: string;
  initialPlatform: Platform;
}

export function ContentAdaptationForm({ contentDraftId, initialPlatform }: ContentAdaptationFormProps) {
  const router = useRouter();
  const [platform, setPlatform] = useState<Platform>(initialPlatform === "XIAOHONGSHU" ? "DOUYIN" : "XIAOHONGSHU");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function adaptContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch(`/api/contents/${contentDraftId}/adapt`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ platform })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "平台适配生成失败");
      }

      setMessage(`${platformLabels[platform]}适配版本已生成`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "平台适配生成失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-2" onSubmit={adaptContent}>
      <label className="block text-xs font-medium text-muted-foreground" htmlFor="content-adaptation-platform">
        适配平台
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <select
          id="content-adaptation-platform"
          className="h-8 min-w-32 rounded-md border border-border bg-surface px-2 text-xs outline-none transition focus:border-primary"
          value={platform}
          onChange={(event) => setPlatform(event.target.value as Platform)}
        >
          {adaptablePlatforms.map((item) => (
            <option key={item} value={item}>
              {platformLabels[item]}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          <CopyPlus className="h-4 w-4" aria-hidden="true" />
          {pending ? "改写中" : "生成适配版本"}
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
