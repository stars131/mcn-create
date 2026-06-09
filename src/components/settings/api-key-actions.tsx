"use client";

import { KeyRound, ShieldX } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

type ApiPayload<T> = {
  data?: T;
  error?: string;
};

type CreatedApiKeyPayload = {
  apiKey: {
    id: string;
    name: string;
    keyPreview: string;
  };
};

type PublicApiKeyPayload = {
  deletedAt?: string;
};

interface ApiKeyCreateActionProps {
  nextName: string;
}

interface ApiKeyRevokeActionProps {
  apiKeyId: string;
  apiKeyName: string;
  revoked: boolean;
}

export function ApiKeyCreateAction({ nextName }: ApiKeyCreateActionProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function createKey() {
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch("/api/settings/api-keys", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: nextName })
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<CreatedApiKeyPayload> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "API Key 创建失败");
      }

      const preview = payload?.data?.apiKey.keyPreview;
      setMessage(preview ? `API Key 已创建：${preview}` : "API Key 已创建");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "API Key 创建失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="API Key 创建操作">
      <Button type="button" size="sm" variant="primary" onClick={() => void createKey()} disabled={pending}>
        <KeyRound className="h-4 w-4" aria-hidden="true" />
        {pending ? "创建中" : "创建 Key"}
      </Button>
      {message ? (
        <span className="text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}

export function ApiKeyRevokeAction({ apiKeyId, apiKeyName, revoked }: ApiKeyRevokeActionProps) {
  const router = useRouter();
  const [currentRevoked, setCurrentRevoked] = useState(revoked);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  async function revokeKey() {
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch(`/api/settings/api-keys/${apiKeyId}`, {
        method: "DELETE",
        credentials: "same-origin",
        headers: { "content-type": "application/json" }
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<PublicApiKeyPayload> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "API Key 撤销失败");
      }

      setCurrentRevoked(Boolean(payload?.data?.deletedAt ?? true));
      setMessage("API Key 已撤销");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "API Key 撤销失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2" role="group" aria-label={`API Key 操作：${apiKeyName}`}>
      {currentRevoked ? (
        <span className="text-xs text-muted-foreground">已关闭</span>
      ) : (
        <Button type="button" size="sm" variant="danger" onClick={() => void revokeKey()} disabled={pending}>
          <ShieldX className="h-4 w-4" aria-hidden="true" />
          {pending ? "撤销中" : "撤销"}
        </Button>
      )}
      {message ? (
        <span className="block text-xs text-muted-foreground" role="status" aria-live="polite">
          {message}
        </span>
      ) : null}
    </div>
  );
}
