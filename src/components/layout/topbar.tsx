import { ChevronDown, Search, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { defaultWorkspace, store } from "@/server/services/mock-store";

export function Topbar() {
  const user = store.users[0];
  const workspace = defaultWorkspace;

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <Button size="sm" variant="secondary" className="max-w-[240px] justify-between">
            <span className="truncate">{workspace.name}</span>
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Badge tone="info">{workspace.currentPlan}</Badge>
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
        </div>
      </div>
    </header>
  );
}
