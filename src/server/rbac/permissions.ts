import { rolePermissions, type PermissionAction } from "@/lib/constants/rbac";
import type { RoleKey } from "@/types/domain";

export function hasPermission(role: RoleKey, action: PermissionAction) {
  return rolePermissions[role].includes(action);
}

export function assertPermission(role: RoleKey, action: PermissionAction) {
  if (!hasPermission(role, action)) {
    throw new Error(`角色 ${role} 缺少权限 ${action}`);
  }
}
