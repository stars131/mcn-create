import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  label: string;
  value: string | number;
  delta?: string;
  icon: LucideIcon;
}

export function MetricCard({ label, value, delta, icon: Icon }: MetricCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal">{value}</p>
          {delta ? <p className="mt-1 text-xs text-muted-foreground">{delta}</p> : null}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-cyan-50 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}
