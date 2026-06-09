"use client";

import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type ApiPayload<T> = {
  data?: T;
  error?: string;
};

type NotificationPayload = {
  readAt?: string;
};

interface NotificationReadActionProps {
  notificationId: string;
  title: string;
  read: boolean;
}

export function NotificationReadAction({ notificationId, title, read }: NotificationReadActionProps) {
  const router = useRouter();
  const [currentRead, setCurrentRead] = useState(read);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    setCurrentRead(read);
  }, [read]);

  async function markRead() {
    setPending(true);
    setMessage(undefined);

    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" }
      });
      const payload = (await response.json().catch(() => null)) as ApiPayload<NotificationPayload> | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "通知更新失败");
      }

      setCurrentRead(Boolean(payload?.data?.readAt ?? true));
      setMessage("通知已标为已读");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "通知更新失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2" role="group" aria-label={`通知操作：${title}`}>
      {currentRead ? (
        <span className="text-xs text-muted-foreground">已读</span>
      ) : (
        <Button type="button" size="sm" variant="secondary" onClick={() => void markRead()} disabled={pending}>
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          {pending ? "更新中" : "标为已读"}
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
