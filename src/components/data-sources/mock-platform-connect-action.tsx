"use client";

import { PlugZap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ApiPayload<T> = {
  data?: T;
  error?: string;
};

type DataSourcePayload = {
  id: string;
  name: string;
};

const mockConnectionPayload = {
  name: "模拟 OAuth 连接",
  sourceType: "USER_AUTHORIZED",
  platform: "DOUYIN",
  authorizationStatus: "CONNECTED",
  notes: "预留官方 OAuth 接入结构，当前为模拟连接。"
};

export function MockPlatformConnectAction() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    setMounted(true);
  }, []);

  async function connectMockPlatform() {
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/data-sources", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mockConnectionPayload)
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<DataSourcePayload> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "模拟连接失败");
      }

      setMessage(`模拟连接已创建：${payload?.data?.name ?? mockConnectionPayload.name}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "模拟连接失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="模拟平台连接操作">
      <Button type="button" size="sm" variant="primary" onClick={() => void connectMockPlatform()} disabled={!mounted || pending}>
        <PlugZap className="h-4 w-4" aria-hidden="true" />
        {pending ? "连接中" : "模拟连接"}
      </Button>
      {message ? (
        <span className="max-w-[180px] truncate text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
