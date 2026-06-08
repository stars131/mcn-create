"use client";

import { DatabaseZap } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/ui/button";
import { platformLabels } from "@/lib/constants/navigation";
import type { AuthorizationStatus, Platform, SourceType } from "@/types/domain";

const sourceTypes: Array<{ value: SourceType; label: string }> = [
  { value: "USER_UPLOAD", label: "用户上传" },
  { value: "USER_AUTHORIZED", label: "用户授权" },
  { value: "OFFICIAL_API", label: "官方 API" },
  { value: "PUBLIC_COMPLIANT", label: "公开合规数据" },
  { value: "THIRD_PARTY_LEGAL", label: "第三方合法服务" },
  { value: "MOCK", label: "Mock 数据" }
];

const platforms: Platform[] = [
  "ALL",
  "DOUYIN",
  "XIAOHONGSHU",
  "BILIBILI",
  "WECHAT",
  "WEIBO",
  "KUAISHOU",
  "VIDEO_ACCOUNT",
  "OTHER"
];

const authorizationStatuses: Array<{ value: AuthorizationStatus; label: string }> = [
  { value: "MOCKED", label: "模拟" },
  { value: "CONNECTED", label: "已连接" },
  { value: "DISCONNECTED", label: "未连接" },
  { value: "EXPIRED", label: "已过期" },
  { value: "REVOKED", label: "已撤销" }
];

export function DataSourceCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<SourceType>("USER_UPLOAD");
  const [platform, setPlatform] = useState<Platform>("ALL");
  const [authorizationStatus, setAuthorizationStatus] = useState<AuthorizationStatus>("MOCKED");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function createSource(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/data-sources", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          sourceType,
          platform,
          authorizationStatus,
          notes: notes.trim() || undefined
        })
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error ?? "数据源创建失败");
      }

      setName("");
      setSourceType("USER_UPLOAD");
      setPlatform("ALL");
      setAuthorizationStatus("MOCKED");
      setNotes("");
      setMessage("数据源已创建");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "数据源创建失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="space-y-3" onSubmit={createSource}>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="data-source-name">
          数据源名称
        </label>
        <input
          id="data-source-name"
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="例如：小红书授权账号"
          required
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="data-source-type">
            来源类型
          </label>
          <select
            id="data-source-type"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
            value={sourceType}
            onChange={(event) => setSourceType(event.target.value as SourceType)}
          >
            {sourceTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="data-source-platform">
            平台
          </label>
          <select
            id="data-source-platform"
            className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
            value={platform}
            onChange={(event) => setPlatform(event.target.value as Platform)}
          >
            {platforms.map((item) => (
              <option key={item} value={item}>
                {platformLabels[item]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="data-source-status">
          授权状态
        </label>
        <select
          id="data-source-status"
          className="h-9 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none transition focus:border-primary"
          value={authorizationStatus}
          onChange={(event) => setAuthorizationStatus(event.target.value as AuthorizationStatus)}
        >
          {authorizationStatuses.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-muted-foreground" htmlFor="data-source-notes">
          备注
        </label>
        <textarea
          id="data-source-notes"
          className="min-h-20 w-full resize-y rounded-md border border-border bg-surface px-3 py-2 text-sm leading-6 outline-none transition focus:border-primary"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="记录授权边界、导入频率或 OAuth 接入状态"
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" variant="primary" disabled={pending}>
          <DatabaseZap className="h-4 w-4" aria-hidden="true" />
          {pending ? "创建中" : "新增数据源"}
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
