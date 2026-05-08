import { type LucideIcon } from "lucide-react";

interface MetricsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
}

export const MetricsCard = ({ title, value, icon: Icon, description }: MetricsCardProps) => {
  return (
    <div className="card-hover rounded-2xl border border-border bg-white p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50">
          <Icon className="h-5 w-5 text-indigo-500" />
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <p className="text-3xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
};