"use client";

import { GitCompareArrows } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import type { ContentVersion } from "@/types/domain";

type VersionSnapshot = Pick<ContentVersion, "id" | "version" | "content" | "changeNote" | "createdAt">;

interface ContentVersionCompareProps {
  versions: VersionSnapshot[];
}

function compactLines(content: string) {
  const lines = content
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length ? lines : [content.trim()].filter(Boolean);
}

function summarizeDiff(baseContent: string, compareContent: string) {
  const baseLines = compactLines(baseContent);
  const compareLines = compactLines(compareContent);
  const maxLength = Math.max(baseLines.length, compareLines.length);
  let changed = 0;
  let added = 0;
  let removed = 0;

  for (let index = 0; index < maxLength; index += 1) {
    const baseLine = baseLines[index];
    const compareLine = compareLines[index];
    if (baseLine === undefined && compareLine !== undefined) {
      added += 1;
    } else if (baseLine !== undefined && compareLine === undefined) {
      removed += 1;
    } else if (baseLine !== compareLine) {
      changed += 1;
    }
  }

  return { added, changed, removed };
}

function versionLabel(version: VersionSnapshot) {
  return `v${version.version} · ${version.changeNote ?? "版本快照"}`;
}

function getDefaultVersionIds(versions: VersionSnapshot[]) {
  return {
    baseVersionId: versions[1]?.id ?? versions[0]?.id ?? "",
    compareVersionId: versions[0]?.id ?? ""
  };
}

export function ContentVersionCompare({ versions }: ContentVersionCompareProps) {
  const defaultVersionIds = getDefaultVersionIds(versions);
  const [baseVersionId, setBaseVersionId] = useState(defaultVersionIds.baseVersionId);
  const [compareVersionId, setCompareVersionId] = useState(defaultVersionIds.compareVersionId);

  useEffect(() => {
    const nextDefaultVersionIds = getDefaultVersionIds(versions);
    setBaseVersionId(nextDefaultVersionIds.baseVersionId);
    setCompareVersionId(nextDefaultVersionIds.compareVersionId);
  }, [versions]);

  const baseVersion = versions.find((version) => version.id === baseVersionId) ?? versions[1] ?? versions[0];
  const compareVersion = versions.find((version) => version.id === compareVersionId) ?? versions[0];
  const diff = useMemo(
    () => summarizeDiff(baseVersion?.content ?? "", compareVersion?.content ?? ""),
    [baseVersion?.content, compareVersion?.content]
  );

  if (versions.length < 2 || !baseVersion || !compareVersion) {
    return <p className="text-sm text-muted-foreground">至少需要两个版本后才能进行对比。</p>;
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="content-base-version">
            基准版本
          </label>
          <select
            id="content-base-version"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
            value={baseVersionId}
            onChange={(event) => setBaseVersionId(event.target.value)}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {versionLabel(version)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="content-compare-version">
            对比版本
          </label>
          <select
            id="content-compare-version"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
            value={compareVersionId}
            onChange={(event) => setCompareVersionId(event.target.value)}
          >
            {versions.map((version) => (
              <option key={version.id} value={version.id}>
                {versionLabel(version)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <GitCompareArrows className="h-4 w-4" aria-hidden="true" />
        <span>版本对比</span>
        <Badge tone="info">变更行 {diff.changed}</Badge>
        <Badge tone="success">新增 {diff.added}</Badge>
        <Badge tone="danger">删除 {diff.removed}</Badge>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-white p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Badge tone="neutral">v{baseVersion.version}</Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(baseVersion.createdAt).toLocaleDateString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          </div>
          <p className="max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
            {baseVersion.content}
          </p>
        </div>
        <div className="rounded-md border border-primary/20 bg-primary/5 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <Badge tone="info">v{compareVersion.version}</Badge>
            <span className="text-xs text-muted-foreground">
              {new Date(compareVersion.createdAt).toLocaleDateString("zh-CN", {
                month: "2-digit",
                day: "2-digit",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </span>
          </div>
          <p className="max-h-44 overflow-auto whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
            {compareVersion.content}
          </p>
        </div>
      </div>
    </div>
  );
}
