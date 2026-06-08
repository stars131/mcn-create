"use client";

import { Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { platformLabels } from "@/lib/constants/navigation";
import type { Platform } from "@/types/domain";

interface TopicOption {
  id: string;
  title: string;
  angle: string;
  targetPlatforms: Platform[];
}

interface PersonaOption {
  id: string;
  name: string;
}

interface BriefOption {
  topicId: string;
  summary: string;
}

interface TemplateOption {
  id: string;
  platform: Platform;
  format: string;
  name: string;
}

interface ContentGenerateFormProps {
  topics: TopicOption[];
  personas: PersonaOption[];
  briefs: BriefOption[];
  templates: TemplateOption[];
  defaultTopicId?: string;
  defaultPersonaId?: string;
}

const preferredPlatformOrder: Platform[] = ["XIAOHONGSHU", "DOUYIN", "BILIBILI", "WECHAT", "VIDEO_ACCOUNT"];

function uniqueTemplatePlatforms(templates: TemplateOption[]) {
  const platforms = new Set(templates.map((template) => template.platform));
  return preferredPlatformOrder.filter((platform) => platforms.has(platform));
}

function chooseInitialPlatform(input: {
  topics: TopicOption[];
  templates: TemplateOption[];
  defaultTopicId?: string;
}) {
  const templatePlatforms = new Set(input.templates.map((template) => template.platform));
  const defaultTopic = input.topics.find((topic) => topic.id === input.defaultTopicId) ?? input.topics[0];
  const topicPlatform = defaultTopic?.targetPlatforms.find((platform) => templatePlatforms.has(platform));

  return topicPlatform ?? (templatePlatforms.has("XIAOHONGSHU") ? "XIAOHONGSHU" : input.templates[0]?.platform ?? "XIAOHONGSHU");
}

export function ContentGenerateForm({
  topics,
  personas,
  briefs,
  templates,
  defaultTopicId,
  defaultPersonaId
}: ContentGenerateFormProps) {
  const router = useRouter();
  const initialPlatform = chooseInitialPlatform({ topics, templates, defaultTopicId });
  const initialFormat = templates.find((template) => template.platform === initialPlatform)?.format ?? "图文";
  const [topicId, setTopicId] = useState(defaultTopicId ?? topics[0]?.id ?? "");
  const [personaId, setPersonaId] = useState(defaultPersonaId ?? personas[0]?.id ?? "");
  const [platform, setPlatform] = useState<Platform>(initialPlatform);
  const [format, setFormat] = useState(initialFormat);
  const [cta, setCta] = useState("领取内容工作流检查表");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  const platformOptions = useMemo(() => uniqueTemplatePlatforms(templates), [templates]);
  const formatOptions = useMemo(
    () => templates.filter((template) => template.platform === platform),
    [platform, templates]
  );
  const selectedTopic = topics.find((topic) => topic.id === topicId);
  const selectedBrief = briefs.find((brief) => brief.topicId === topicId);

  useEffect(() => {
    if (formatOptions.length > 0 && !formatOptions.some((template) => template.format === format)) {
      setFormat(formatOptions[0].format);
    }
  }, [format, formatOptions]);

  async function generateContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/contents/generate", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topicId,
          personaId: personaId || undefined,
          platform,
          format,
          cta
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "内容草稿生成失败");
      }

      setMessage("内容草稿已生成");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "内容草稿生成失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={generateContent}>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="content-generate-topic">
          选题 brief
        </label>
        <select
          id="content-generate-topic"
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
          value={topicId}
          onChange={(event) => setTopicId(event.target.value)}
          required
        >
          {topics.map((topic) => (
            <option key={topic.id} value={topic.id}>
              {topic.title}
            </option>
          ))}
        </select>
        <div className="mt-2 rounded-md bg-muted p-3 text-xs leading-5 text-muted-foreground">
          {selectedBrief?.summary ?? selectedTopic?.angle ?? "暂无可用 brief"}
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="content-generate-persona">
          人设档案
        </label>
        <select
          id="content-generate-persona"
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
          value={personaId}
          onChange={(event) => setPersonaId(event.target.value)}
        >
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id}>
              {persona.name}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="content-generate-platform">
            目标平台
          </label>
          <select
            id="content-generate-platform"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
            value={platform}
            onChange={(event) => setPlatform(event.target.value as Platform)}
          >
            {platformOptions.map((item) => (
              <option key={item} value={item}>
                {platformLabels[item]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="content-generate-format">
            内容体裁
          </label>
          <select
            id="content-generate-format"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
            value={format}
            onChange={(event) => setFormat(event.target.value)}
          >
            {formatOptions.length > 0 ? (
              formatOptions.map((template) => (
                <option key={template.id} value={template.format}>
                  {template.format}
                </option>
              ))
            ) : (
              <option value={format}>{format}</option>
            )}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="content-generate-cta">
          目标 CTA
        </label>
        <input
          id="content-generate-cta"
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
          value={cta}
          onChange={(event) => setCta(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" variant="primary" disabled={pending || !topicId}>
          <Wand2 className="h-4 w-4" aria-hidden="true" />
          {pending ? "生成中" : "生成内容草稿"}
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
