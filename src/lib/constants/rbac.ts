import type { RoleKey } from "@/types/domain";

export const permissions = {
  "workspace.manage": "管理 workspace 设置",
  "member.manage": "邀请成员与修改角色",
  "data_source.manage": "管理数据源与授权",
  "persona.edit": "编辑人设记忆",
  "hotspot.read": "查看热点",
  "topic.write": "创建与管理选题",
  "content.write": "生成与编辑内容",
  "content.publish": "创建发布计划",
  "analytics.read": "查看数据分析",
  "agent.run": "运行 Agent",
  "audit.read": "查看审计日志",
  "api_key.manage": "管理 API Key"
} as const;

export type PermissionAction = keyof typeof permissions;

export const rolePermissions: Record<RoleKey, PermissionAction[]> = {
  OWNER: Object.keys(permissions) as PermissionAction[],
  ADMIN: [
    "workspace.manage",
    "member.manage",
    "data_source.manage",
    "persona.edit",
    "hotspot.read",
    "topic.write",
    "content.write",
    "content.publish",
    "analytics.read",
    "agent.run",
    "audit.read"
  ],
  EDITOR: ["persona.edit", "hotspot.read", "topic.write", "content.write", "content.publish", "agent.run"],
  ANALYST: ["hotspot.read", "analytics.read", "topic.write", "agent.run", "audit.read"],
  VIEWER: ["hotspot.read", "analytics.read", "audit.read"]
};
