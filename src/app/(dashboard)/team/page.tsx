import { ActionButton } from "@/components/ui/action-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeading } from "@/components/ui/page-heading";
import { Table, Td, Th } from "@/components/ui/table";
import { permissions, rolePermissions } from "@/lib/constants/rbac";
import { roleLabels } from "@/lib/constants/navigation";
import { getCurrentWorkspaceId } from "@/server/auth/session";
import { store } from "@/server/services/mock-store";
import { listInvitations, listMembers } from "@/server/services/workspace-service";

const invitationStatusTones = {
  PENDING: "warning",
  ACCEPTED: "success",
  EXPIRED: "neutral",
  REVOKED: "danger"
} as const;

export default function TeamPage() {
  const workspaceId = getCurrentWorkspaceId();
  const members = listMembers(workspaceId);
  const invitations = listInvitations(workspaceId);

  return (
    <>
      <PageHeading
        eyebrow="Team & RBAC"
        title="团队与权限"
        description="多租户 workspace 内使用 Owner、Admin、Editor、Analyst、Viewer 五级角色，并通过 RBAC 做权限校验。"
        actions={
          <ActionButton
            endpoint={`/api/workspaces/${workspaceId}/members`}
            body={{ email: `new-${Date.now()}@contentos.local`, role: "VIEWER", title: "受邀成员" }}
            label="邀请成员"
            pendingLabel="邀请中"
            icon="userPlus"
            variant="primary"
          />
        }
      />

      <section className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle>成员列表</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <thead>
                <tr>
                  <Th>成员</Th>
                  <Th>角色</Th>
                  <Th>职能</Th>
                  <Th>加入时间</Th>
                  <Th>操作</Th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <Td>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    </Td>
                    <Td>
                      <Badge tone={member.role === "OWNER" ? "success" : "info"}>{roleLabels[member.role]}</Badge>
                    </Td>
                    <Td>{member.title}</Td>
                    <Td>{new Date(member.joinedAt).toLocaleDateString("zh-CN")}</Td>
                    <Td>
                      {member.role !== "OWNER" ? (
                        <ActionButton
                          endpoint={`/api/workspaces/${workspaceId}/members/${member.id}`}
                          method="PATCH"
                          body={{ role: member.role === "VIEWER" ? "EDITOR" : "VIEWER" }}
                          label="切换角色"
                          pendingLabel="更新中"
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Owner</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>权限说明</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(rolePermissions) as Array<keyof typeof rolePermissions>).map((role) => (
              <div key={role} className="rounded-md border border-border p-3">
                <div className="font-medium">{roleLabels[role]}</div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {rolePermissions[role].slice(0, 6).map((permission) => (
                    <Badge key={permission}>{permissions[permission]}</Badge>
                  ))}
                </div>
              </div>
            ))}
            <div className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
              当前 workspace：{store.workspaces.find((workspace) => workspace.id === workspaceId)?.name}
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="mt-5">
        <CardHeader>
          <CardTitle>邀请记录</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <thead>
              <tr>
                <Th>邮箱</Th>
                <Th>角色</Th>
                <Th>状态</Th>
                <Th>过期时间</Th>
              </tr>
            </thead>
            <tbody>
              {invitations.slice(0, 6).map((invitation) => (
                <tr key={invitation.id}>
                  <Td>
                    <div className="font-medium">{invitation.email}</div>
                    <div className="mt-1 text-xs text-muted-foreground">token：{invitation.token.slice(0, 12)}...</div>
                  </Td>
                  <Td>{roleLabels[invitation.roleKey]}</Td>
                  <Td>
                    <Badge tone={invitationStatusTones[invitation.status]}>{invitation.status}</Badge>
                  </Td>
                  <Td>{new Date(invitation.expiresAt).toLocaleDateString("zh-CN")}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
