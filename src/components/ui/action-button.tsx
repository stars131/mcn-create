"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarPlus,
  CheckCircle2,
  ChevronRight,
  CopyPlus,
  DatabaseZap,
  FilePlus2,
  FileText,
  FileUp,
  KeyRound,
  PlugZap,
  Plus,
  RefreshCw,
  RotateCcw,
  SendToBack,
  ShieldAlert,
  ShieldX,
  Sparkles,
  Upload,
  UserPlus,
  Wand2,
  type LucideIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";

const actionIcons = {
  calendarPlus: CalendarPlus,
  checkCircle: CheckCircle2,
  chevronRight: ChevronRight,
  copyPlus: CopyPlus,
  database: DatabaseZap,
  filePlus: FilePlus2,
  fileText: FileText,
  fileUp: FileUp,
  key: KeyRound,
  plug: PlugZap,
  plus: Plus,
  refresh: RefreshCw,
  rotateCcw: RotateCcw,
  sendToBack: SendToBack,
  shieldAlert: ShieldAlert,
  shieldX: ShieldX,
  sparkles: Sparkles,
  upload: Upload,
  userPlus: UserPlus,
  wand: Wand2
} satisfies Record<string, LucideIcon>;

export type ActionIconName = keyof typeof actionIcons;

interface ActionButtonProps {
  endpoint: string;
  method?: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  label: string;
  pendingLabel?: string;
  icon?: ActionIconName;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
}

export function ActionButton({
  endpoint,
  method = "POST",
  body,
  label,
  pendingLabel = "处理中",
  icon: Icon,
  variant = "secondary",
  size = "sm"
}: ActionButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const IconComponent = Icon ? actionIcons[Icon] : null;

  async function runAction() {
    setPending(true);
    try {
      const response = await fetch(endpoint, {
        method,
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body)
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error ?? "操作失败");
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <Button variant={variant} size={size} onClick={runAction} disabled={pending} title={label}>
      {IconComponent ? <IconComponent className="h-4 w-4" aria-hidden="true" /> : null}
      {size === "icon" ? <span className="sr-only">{label}</span> : pending ? pendingLabel : label}
    </Button>
  );
}
