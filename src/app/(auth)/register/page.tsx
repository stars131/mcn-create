import Link from "next/link";
import { AuthForm } from "@/components/auth/auth-form";
import { Card, CardContent } from "@/components/ui/card";

export default function RegisterPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <h1 className="text-lg font-semibold">注册 ContentOS</h1>
          <p className="mt-1 text-sm text-muted-foreground">创建账号后会进入默认演示 workspace。</p>
          <div className="mt-6">
            <AuthForm mode="register" />
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            已有账号？{" "}
            <Link className="font-medium text-primary" href="/login">
              登录
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
