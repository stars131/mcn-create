"use client";

import { Layers3 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { platformLabels } from "@/lib/constants/navigation";
import type { Platform } from "@/types/domain";

const topicPlatforms: Platform[] = ["XIAOHONGSHU", "DOUYIN", "WECHAT", "BILIBILI", "VIDEO_ACCOUNT"];

export function TopicCreateForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [angle, setAngle] = useState("");
  const [audience, setAudience] = useState("");
  const [targetPlatforms, setTargetPlatforms] = useState<Platform[]>(["XIAOHONGSHU", "DOUYIN"]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  function togglePlatform(platform: Platform) {
    setTargetPlatforms((current) =>
      current.includes(platform) ? current.filter((item) => item !== platform) : [...current, platform]
    );
  }

  async function createTopic(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(undefined);

    if (targetPlatforms.length === 0) {
      setMessage("至少选择一个发布平台");
      return;
    }

    setPending(true);

    try {
      const response = await fetch("/api/topics", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title,
          angle,
          audience,
          targetPlatforms
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "选题创建失败");
      }

      setTitle("");
      setAngle("");
      setAudience("");
      setTargetPlatforms(["XIAOHONGSHU", "DOUYIN"]);
      setMessage("选题已创建");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "选题创建失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={createTopic}>
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.45fr)]">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="topic-title">
            选题标题
          </label>
          <input
            id="topic-title"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="例如：复盘驱动的内容选题机制"
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="topic-audience">
            目标受众
          </label>
          <input
            id="topic-audience"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
            value={audience}
            onChange={(event) => setAudience(event.target.value)}
            placeholder="内容团队负责人"
            required
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="topic-angle">
          切入角度
        </label>
        <textarea
          id="topic-angle"
          className="min-h-20 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary"
          value={angle}
          onChange={(event) => setAngle(event.target.value)}
          placeholder="说明核心观点、素材证据和适合承接的内容场景"
          required
        />
      </div>
      <fieldset className="space-y-2">
        <legend className="text-xs font-medium text-muted-foreground">目标平台</legend>
        <div className="flex flex-wrap gap-2">
          {topicPlatforms.map((platform) => (
            <label
              key={platform}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground"
            >
              <input
                className="h-3.5 w-3.5 accent-primary"
                type="checkbox"
                checked={targetPlatforms.includes(platform)}
                onChange={() => togglePlatform(platform)}
              />
              {platformLabels[platform]}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" variant="primary" disabled={pending}>
          <Layers3 className="h-4 w-4" aria-hidden="true" />
          {pending ? "创建中" : "新建选题"}
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
