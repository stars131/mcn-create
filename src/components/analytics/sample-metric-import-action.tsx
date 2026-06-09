"use client";

import { FileUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ApiPayload<T> = {
  data?: T;
  error?: string;
};

type ImportedMetricPayload = {
  id: string;
  title: string;
};

const sampleCsvPayload = {
  fileType: "CSV",
  fileName: "content-performance-sample.csv",
  rawText:
    "作品,平台,曝光,点赞,评论,分享,转化,发布时间\n导入样例：人设记忆清单,公众号,16800,820,91,134,42,2026-06-07"
};

export function SampleMetricImportAction() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function importSample() {
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/analytics/import", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(sampleCsvPayload)
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<ImportedMetricPayload[]> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "CSV 样例导入失败");
      }

      const importedCount = Array.isArray(payload?.data) ? payload.data.length : 0;
      setMessage(`CSV 样例已导入：${importedCount} 行`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "CSV 样例导入失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="CSV 样例导入操作">
      <Button type="button" size="sm" variant="secondary" onClick={() => void importSample()} disabled={!mounted || pending}>
        <FileUp className="h-4 w-4" aria-hidden="true" />
        {pending ? "导入中" : "导入 CSV 样例"}
      </Button>
      {message ? (
        <span className="max-w-[180px] truncate text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
