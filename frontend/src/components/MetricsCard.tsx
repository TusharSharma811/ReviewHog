import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  description: string;
}

export const MetricsCard = ({ title, value, icon: Icon, description }: MetricsCardProps) => {


  return (
    <Card className="bg-gradient-card border-border shadow-card hover:shadow-elegant transition-all duration-300 hover:scale-105">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2 bg-muted/20 rounded-lg">
            <Icon className="h-5 w-5 text-primary" />
          </div>
         
        </div>
        
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
};