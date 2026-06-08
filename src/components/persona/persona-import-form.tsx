"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";

interface PersonaImportFormProps {
  personaId: string;
}

export function PersonaImportForm({ personaId }: PersonaImportFormProps) {
  const router = useRouter();
  const [importedContent, setImportedContent] = useState("");
  const [brandNotes, setBrandNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function importContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch(`/api/personas/${personaId}/import-content`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          importedContent,
          brandNotes: brandNotes.trim() || undefined
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "历史内容导入失败");
      }

      setImportedContent("");
      setBrandNotes("");
      setMessage("历史内容已导入");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "历史内容导入失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={importContent}>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="persona-import-content">
          历史内容
        </label>
        <textarea
          id="persona-import-content"
          className="min-h-28 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary"
          value={importedContent}
          onChange={(event) => setImportedContent(event.target.value)}
          placeholder="粘贴过往爆文、创始人访谈、品牌文案或评论区反馈"
          required
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="persona-brand-notes">
          品牌备注
        </label>
        <textarea
          id="persona-brand-notes"
          className="min-h-20 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary"
          value={brandNotes}
          onChange={(event) => setBrandNotes(event.target.value)}
          placeholder="补充禁用承诺、合规边界、目标受众或风格偏好"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" variant="primary" disabled={pending}>
          <Upload className="h-4 w-4" aria-hidden="true" />
          {pending ? "提取中" : "导入历史内容"}
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
