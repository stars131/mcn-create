"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { ContentStatus } from "@/types/domain";

const contentStatuses: Array<{ value: ContentStatus; label: string }> = [
  { value: "DRAFT", label: "草稿" },
  { value: "IN_REVIEW", label: "审核中" },
  { value: "APPROVED", label: "已通过" },
  { value: "REJECTED", label: "已拒绝" },
  { value: "SCHEDULED", label: "已排期" },
  { value: "PUBLISHED", label: "已发布" }
];

interface ContentEditorFormProps {
  contentDraftId: string;
  initialTitle: string;
  initialContent: string;
  initialStatus: ContentStatus;
  initialVersion: number;
}

export function ContentEditorForm({
  contentDraftId,
  initialTitle,
  initialContent,
  initialStatus,
  initialVersion
}: ContentEditorFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [status, setStatus] = useState<ContentStatus>(initialStatus);
  const [savedTitle, setSavedTitle] = useState(initialTitle);
  const [savedContent, setSavedContent] = useState(initialContent);
  const [savedStatus, setSavedStatus] = useState<ContentStatus>(initialStatus);
  const [savedVersion, setSavedVersion] = useState(initialVersion);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    setTitle(initialTitle);
    setContent(initialContent);
    setStatus(initialStatus);
    setSavedTitle(initialTitle);
    setSavedContent(initialContent);
    setSavedStatus(initialStatus);
    setSavedVersion(initialVersion);
  }, [initialContent, initialStatus, initialTitle, initialVersion]);

  const hasChanges = useMemo(
    () => title !== savedTitle || content !== savedContent || status !== savedStatus,
    [content, savedContent, savedStatus, savedTitle, status, title]
  );

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch(`/api/contents/${contentDraftId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content,
          status
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "保存失败");
      }

      const updated = payload?.data as
        | { title?: string; content?: string; status?: ContentStatus; currentVersion?: number }
        | undefined;
      setTitle(updated?.title ?? title);
      setContent(updated?.content ?? content);
      setStatus(updated?.status ?? status);
      setSavedTitle(updated?.title ?? title);
      setSavedContent(updated?.content ?? content);
      setSavedStatus(updated?.status ?? status);
      setSavedVersion(updated?.currentVersion ?? savedVersion + 1);
      setMessage("已保存");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submitEdit}>
      <div className="grid gap-3 md:grid-cols-[1fr_160px]">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="content-editor-title">
            内容标题
          </label>
          <input
            id="content-editor-title"
            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="content-editor-status">
            内容状态
          </label>
          <select
            id="content-editor-status"
            className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary"
            value={status}
            onChange={(event) => setStatus(event.target.value as ContentStatus)}
          >
            {contentStatuses.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="content-editor-body">
          内容正文
        </label>
        <textarea
          id="content-editor-body"
          className="min-h-[420px] w-full resize-y rounded-md border border-border bg-white p-4 text-sm leading-7 outline-none transition focus:border-primary"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          required
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" variant="primary" disabled={pending || !hasChanges}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {pending ? "保存中" : "保存草稿"}
        </Button>
        <span className="text-xs text-muted-foreground">当前版本 v{savedVersion}</span>
        {message ? (
          <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}
