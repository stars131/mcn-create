import { Search, ShieldCheck } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { WorkspaceSwitcher } from "@/components/layout/workspace-switcher";
import { getCurrentUser, getCurrentWorkspaceId } from "@/server/auth/session";
import { store } from "@/server/services/mock-store";
import { listWorkspaces } from "@/server/services/workspace-service";

export function Topbar() {
  const user = getCurrentUser();
  const currentWorkspaceId = getCurrentWorkspaceId();
  const workspaces = listWorkspaces(user.email);
  const workspace =
    workspaces.find((item) => item.id === currentWorkspaceId) ??
    store.workspaces.find((item) => item.id === currentWorkspaceId) ??
    workspaces[0];

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <WorkspaceSwitcher currentWorkspaceId={workspace.id} workspaces={workspaces} />
        </div>
        <div className="hidden h-9 min-w-[260px] items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-muted-foreground md:flex">
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>搜索热点、选题、内容、Agent 运行</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden="true" />
            <span>合规数据源 / 审计开启</span>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            {user.name.slice(0, 1)}
          </div>
          <LogoutButton />
        </div>
      </div>
    </header>
  );
}
