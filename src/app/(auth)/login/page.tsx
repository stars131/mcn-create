import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1fr_420px]">
        <section className="flex flex-col justify-center">
          <p className="text-sm font-semibold text-primary">ContentOS</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-semibold tracking-normal">
            中文内容团队的创作决策与执行工作台
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground">
            把热点、选题、人设、内容、日历、复盘和审计放进一个多租户 SaaS 工作流，AI 只通过可追踪的 Agent 节点参与。
          </p>
          <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
            {["合法数据源", "品牌记忆层", "Agent 运行日志"].map((item) => (
              <div key={item} className="rounded-lg border border-border bg-surface p-4 text-sm shadow-panel">
                {item}
              </div>
            ))}
          </div>
        </section>
        <Card>
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold">登录</h2>
            <p className="mt-1 text-sm text-muted-foreground">MVP 默认账号已填入，可直接进入 Dashboard。</p>
            <div className="mt-6">
              <AuthForm mode="login" />
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              没有账号？{" "}
              <Link className="font-medium text-primary" href="/register">
                注册
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
