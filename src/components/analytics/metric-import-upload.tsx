"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { MetricImportFileType } from "@/types/domain";

type ImportPayload = {
  fileType: MetricImportFileType;
  fileName: string;
  rawText?: string;
  fileContent?: string;
};

function inferFileType(file: File): MetricImportFileType | undefined {
  const name = file.name.toLowerCase();
  if (name.endsWith(".json") || file.type === "application/json") {
    return "JSON";
  }
  if (name.endsWith(".csv") || file.type === "text/csv") {
    return "CSV";
  }
  if (name.endsWith(".tsv") || file.type === "text/tab-separated-values") {
    return "TSV";
  }
  if (name.endsWith(".xlsx") || name.endsWith(".xlsm")) {
    return "EXCEL";
  }
  return undefined;
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsDataURL(file);
  });
}

async function createImportPayload(file: File): Promise<ImportPayload> {
  const fileType = inferFileType(file);
  if (!fileType) {
    throw new Error("仅支持 CSV、TSV、JSON、XLSX、XLSM");
  }

  if (fileType === "EXCEL") {
    return {
      fileType,
      fileName: file.name,
      fileContent: await readAsDataUrl(file)
    };
  }

  return {
    fileType,
    fileName: file.name,
    rawText: await file.text()
  };
}

export function MetricImportUpload() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState<string>();

  async function uploadFile(file: File) {
    setPending(true);
    setStatus(undefined);
    try {
      const payload = await createImportPayload(file);
      const response = await fetch("/api/analytics/import", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const responsePayload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(responsePayload?.error ?? "导入失败");
      }

      const count = Array.isArray(responsePayload?.data) ? responsePayload.data.length : 0;
      setStatus(`已导入 ${count} 行`);
      router.refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "导入失败");
    } finally {
      setPending(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        accept=".csv,.tsv,.json,.xlsx,.xlsm,text/csv,application/json,text/tab-separated-values,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel.sheet.macroEnabled.12"
        onChange={(event) => {
          const file = event.currentTarget.files?.[0];
          if (file) {
            void uploadFile(file);
          }
        }}
      />
      <Button size="sm" variant="secondary" onClick={() => inputRef.current?.click()} disabled={pending} title="上传数据文件">
        <Upload className="h-4 w-4" aria-hidden="true" />
        {pending ? "导入中" : "上传数据文件"}
      </Button>
      {status ? (
        <span className="max-w-[180px] truncate text-xs text-muted-foreground" role="status" aria-live="polite">
          {status}
        </span>
      ) : null}
    </div>
  );
}
