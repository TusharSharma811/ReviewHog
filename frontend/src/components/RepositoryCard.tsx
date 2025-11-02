import { Plus, GitBranch, Settings} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";


interface Repository {
  id: string;
  name: string;
  owner: string;
  status: "active" | "inactive" | "pending";
  lastReview: string;
  reviewCount: number;
  stars? : number;
  url ?: string;
}



export const RepositoryCard = ({repositories} : {repositories : Repository[]}) => {
  if(!repositories || repositories.length === 0) {
    return (
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <GitBranch className="h-5 w-5 text-primary" />
              <span>Repositories</span>
            </CardTitle>
            <Button size="sm" className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-1" />
              Add Repo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No repositories connected.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-card border-border shadow-card max-h-[600px] overflow-y-scroll">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <GitBranch className="h-5 w-5 text-primary" />
            <span>Repositories</span>
          </CardTitle>
        
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {repositories.map((repo) => (
          <a key={repo.id} href={repo.url} target="_blank" rel="noopener noreferrer">
          <div key={repo.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors group">
            <div className="flex-1 min-w-0">
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          </a>
        ))}
      </CardContent>
    </Card>
  );
};