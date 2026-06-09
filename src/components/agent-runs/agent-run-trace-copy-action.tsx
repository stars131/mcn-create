"use client";

import { Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ExportPayload = {
  schemaVersion?: string;
  error?: string;
};

interface AgentRunTraceCopyActionProps {
  runId: string;
  exportHref: string;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "true");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();

    try {
      const copied = document.execCommand("copy");
      if (!copied) {
        throw new Error("copy command failed");
      }
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

export function AgentRunTraceCopyAction({ runId, exportHref }: AgentRunTraceCopyActionProps) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function copyTrace() {
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch(exportHref, {
        credentials: "same-origin",
        headers: { "content-type": "application/json" }
      });
      const payload = (await response.json().catch(() => null)) as ExportPayload | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error ?? "trace 读取失败");
      }

      await copyText(JSON.stringify(payload, null, 2));
      setMessage(`trace 已复制：${payload.schemaVersion ?? runId}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "trace 复制失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label={`Trace 复制操作：${runId}`}>
      <Button type="button" size="sm" variant="secondary" onClick={() => void copyTrace()} disabled={pending}>
        <Copy className="h-4 w-4" aria-hidden="true" />
        {pending ? "复制中" : "复制 trace"}
      </Button>
      {message ? (
        <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
