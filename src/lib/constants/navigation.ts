import {
  BarChart3,
  Bot,
  CalendarDays,
  DatabaseZap,
  FileText,
  Gauge,
  Home,
  Layers3,
  Settings,
  ShieldCheck,
  Sparkles,
  Users
} from "lucide-react";

export const navItems = [
  { href: "/dashboard", label: "首页 Dashboard", icon: Home },
  { href: "/hotspots", label: "热点中心", icon: Gauge },
  { href: "/topics", label: "选题池", icon: Layers3 },
  { href: "/persona", label: "人设记忆", icon: Sparkles },
  { href: "/content", label: "内容工作台", icon: FileText },
  { href: "/calendar", label: "内容日历", icon: CalendarDays },
  { href: "/analytics", label: "数据分析", icon: BarChart3 },
  { href: "/data-sources", label: "数据源", icon: DatabaseZap },
  { href: "/agent-runs", label: "Agent 运行", icon: Bot },
  { href: "/team", label: "团队权限", icon: Users },
  { href: "/settings", label: "设置", icon: Settings },
  { href: "/settings#audit", label: "审计日志", icon: ShieldCheck }
];

export const platformLabels: Record<string, string> = {
  ALL: "全网",
  DOUYIN: "抖音",
  XIAOHONGSHU: "小红书",
  BILIBILI: "B 站",
  WECHAT: "公众号",
  WEIBO: "微博",
  KUAISHOU: "快手",
  VIDEO_ACCOUNT: "视频号",
  OTHER: "其他"
};

export const roleLabels: Record<string, string> = {
  OWNER: "Owner",
  ADMIN: "Admin",
  EDITOR: "Editor",
  ANALYST: "Analyst",
  VIEWER: "Viewer"
};
