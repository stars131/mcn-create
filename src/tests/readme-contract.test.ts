import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readme = readFileSync(resolve(process.cwd(), "README.md"), "utf8");

describe("README contract", () => {
  it("documents local startup, database validation, and runtime data boundaries", () => {
    expect(readme).toContain("## 本地启动");
    expect(readme).toContain("docker compose up -d");
    expect(readme).toContain("npx prisma migrate dev");
    expect(readme).toContain("npx prisma db seed");
    expect(readme).toContain("npm run dev");

    expect(readme).toContain("## 运行模式与数据库路线");
    expect(readme).toContain("页面与 API 默认读取内存 mock store");
    expect(readme).toContain("Prisma schema 与 seed 面向真实 PostgreSQL");
    expect(readme).toContain("src/server/services/mock-store.ts");
    expect(readme).toContain("逐步替换为 Prisma 查询");

    expect(readme).toContain('DATABASE_URL="postgresql://contentos:contentos@127.0.0.1:5432/contentos?schema=public"');
    expect(readme).toContain('REDIS_URL="redis://localhost:6379"');
  });
});
