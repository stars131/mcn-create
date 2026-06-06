import { Badge } from "@/components/ui/badge";
import type { AgentStatus, ContentStatus, RiskLevel, TopicStatus } from "@/types/domain";

export function RiskBadge({ level }: { level: RiskLevel }) {
  const map = {
    LOW: { label: "低风险", tone: "success" as const },
    MEDIUM: { label: "中风险", tone: "warning" as const },
    HIGH: { label: "高风险", tone: "danger" as const }
  };
  return <Badge tone={map[level].tone}>{map[level].label}</Badge>;
}

export function TopicStatusBadge({ status }: { status: TopicStatus }) {
  const map = {
    PENDING: "待评估",
    ADOPTED: "已采纳",
    WRITING: "写作中",
    PUBLISHED: "已发布",
    DROPPED: "已放弃"
  };
  return <Badge tone={status === "DROPPED" ? "neutral" : status === "PUBLISHED" ? "success" : "info"}>{map[status]}</Badge>;
}

export function ContentStatusBadge({ status }: { status: ContentStatus }) {
  const map = {
    DRAFT: "草稿",
    IN_REVIEW: "审核中",
    APPROVED: "已通过",
    REJECTED: "已拒绝",
    SCHEDULED: "已排期",
    PUBLISHED: "已发布"
  };
  return <Badge tone={status === "REJECTED" ? "danger" : status === "APPROVED" || status === "PUBLISHED" ? "success" : "info"}>{map[status]}</Badge>;
}

export function AgentStatusBadge({ status }: { status: AgentStatus }) {
  const map = {
    PENDING: "pending",
    RUNNING: "running",
    SUCCESS: "success",
    FAILED: "failed"
  };
  return <Badge tone={status === "FAILED" ? "danger" : status === "SUCCESS" ? "success" : "warning"}>{map[status]}</Badge>;
}
