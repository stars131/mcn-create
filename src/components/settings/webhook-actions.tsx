"use client";

import { PlugZap, ToggleLeft, ToggleRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ApiPayload<T> = {
  data?: T;
  error?: string;
};

type WebhookPayload = {
  enabled: boolean;
  name: string;
};

interface WebhookCreateActionProps {
  nextName: string;
}

interface WebhookToggleActionProps {
  webhookId: string;
  webhookName: string;
  enabled: boolean;
}

export function WebhookCreateAction({ nextName }: WebhookCreateActionProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function createWebhook() {
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/settings/webhooks", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: nextName,
          url: "https://example.com/contentos/webhook",
          events: ["agent.run.success", "content.scheduled"]
        })
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<WebhookPayload> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Webhook 创建失败");
      }

      setMessage(`Webhook 已创建：${payload?.data?.name ?? nextName}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Webhook 创建失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Webhook 创建操作">
      <Button type="button" size="sm" variant="primary" onClick={() => void createWebhook()} disabled={pending}>
        <PlugZap className="h-4 w-4" aria-hidden="true" />
        {pending ? "新增中" : "新增 Webhook"}
      </Button>
      {message ? (
        <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}

export function WebhookToggleAction({ webhookId, webhookName, enabled }: WebhookToggleActionProps) {
  const router = useRouter();
  const [currentEnabled, setCurrentEnabled] = useState(enabled);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();
  const nextEnabled = !currentEnabled;

  async function toggleWebhook() {
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch(`/api/settings/webhooks/${webhookId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: nextEnabled })
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<WebhookPayload> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Webhook 更新失败");
      }

      const enabledAfterUpdate = payload?.data?.enabled ?? nextEnabled;
      setCurrentEnabled(enabledAfterUpdate);
      setMessage(enabledAfterUpdate ? "Webhook 已启用" : "Webhook 已停用");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Webhook 更新失败");
    } finally {
      setPending(false);
    }
  }

  const Icon = currentEnabled ? ToggleLeft : ToggleRight;

  return (
    <div className="space-y-2" role="group" aria-label={`Webhook 操作：${webhookName}`}>
      <Button type="button" size="sm" variant="secondary" onClick={() => void toggleWebhook()} disabled={pending}>
        <Icon className="h-4 w-4" aria-hidden="true" />
        {pending ? "更新中" : currentEnabled ? "停用" : "启用"}
      </Button>
      {message ? (
        <span className="block text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
