import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { Search, GitPullRequest, Clock, CheckCircle, AlertCircle, Github } from "lucide-react";

// Mock data for demonstration
const mockPRs = [
  {
    id: 1,
    title: "Add user authentication system",
    repository: "acme-corp/web-app",
    number: 123,
    author: "john-doe",
    status: "reviewed",
    severity: "medium",
    createdAt: "2024-01-15T10:30:00Z",
    aiScore: 85,
    issuesFound: 3,
    suggestionsCount: 5
  },
  {
    id: 2,
    title: "Fix memory leak in data processing",
    repository: "acme-corp/api-server",
    number: 456,
    author: "jane-smith",
    status: "pending",
    severity: "high",
    createdAt: "2024-01-14T15:45:00Z",
    aiScore: 92,
    issuesFound: 7,
    suggestionsCount: 12
  },
  {
    id: 3,
    title: "Update documentation for v2 API",
    repository: "acme-corp/docs",
    number: 789,
    author: "dev-team",
    status: "approved",
    severity: "low",
    createdAt: "2024-01-13T09:15:00Z",
    aiScore: 95,
    issuesFound: 1,
    suggestionsCount: 2
  }
];



const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("reviews");
  const [repoData , setrepoData] = useState([{
    name: "",
  }]);
  const uid = useSearchParams()[0].get("uid");
  useEffect(() => {
    // Fetch user data or perform any necessary setup
    const fetchData = async () => {
      try {
        const response = await fetch("https://vulture-needed-immensely.ngrok-free.app//api/users/data/repositories?id="+uid ,
          {
            credentials: "include",
          }
        );
        const data = await response.json();
        console.log("User data:", data);
        setrepoData(data.repos || []);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchData();
  }, []);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "severity-high";
      case "medium": return "severity-medium";
      case "low": return "severity-low";
      default: return "muted";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved": return <CheckCircle className="h-4 w-4 text-success" />;
      case "reviewed": return <AlertCircle className="h-4 w-4 text-warning" />;
      case "pending": return <Clock className="h-4 w-4 text-muted-foreground" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const filteredPRs = mockPRs.filter(pr => 
    pr.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pr.repository.toLowerCase().includes(searchQuery.toLowerCase()) ||
    pr.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Review your AI-powered pull request insights</p>
          </div>
          <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
            <Github className="mr-2 h-4 w-4" />
            Manage Repositories
          </button>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            placeholder="Search pull requests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>

        <div className="space-y-4">
          <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
            <button
              onClick={() => setActiveTab("reviews")}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${activeTab === "reviews" ? "bg-background text-foreground shadow-sm" : ""}`}
            >
              Recent Reviews
            </button>
            <button
              onClick={() => setActiveTab("repositories")}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${activeTab === "repositories" ? "bg-background text-foreground shadow-sm" : ""}`}
            >
              Repositories
            </button>
          </div>

          {activeTab === "reviews" && (
            <div className="space-y-4">
              {filteredPRs.map((pr) => (
                <div key={pr.id} className="rounded-lg border bg-card text-card-foreground shadow-sm hover:bg-accent/50 transition-colors">
                  <div className="flex flex-col space-y-1.5 p-6 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <GitPullRequest className="h-4 w-4 text-primary" />
                          <span className="text-sm text-muted-foreground">{pr.repository}</span>
                          <span className="text-sm text-muted-foreground">#{pr.number}</span>
                        </div>
                        <h3 className="text-lg text-2xl font-semibold leading-none tracking-tight">
                          <Link 
                            to={`/dashboard/${pr.repository}/${pr.number}`}
                            className="hover:text-primary transition-colors"
                          >
                            {pr.title}
                          </Link>
                        </h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(pr.status)}
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground text-${getSeverityColor(pr.severity)} border-${getSeverityColor(pr.severity)}`}>
                          {pr.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center space-x-1">
                          <div className="relative flex h-5 w-5 shrink-0 overflow-hidden rounded-full">
                            <img 
                              src={`https://github.com/${pr.author}.png`} 
                              alt="Avatar"
                              className="aspect-square h-full w-full"
                            />
                          </div>
                          <span>{pr.author}</span>
                        </div>
                        <span>•</span>
                        <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-success">Score: {pr.aiScore}%</span>
                        <span className="text-warning">{pr.issuesFound} issues</span>
                        <span className="text-primary">{pr.suggestionsCount} suggestions</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === "repositories" && (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {repoData.map((repo) => (
                  <div key={repo.name} className="rounded-lg border bg-card text-card-foreground shadow-sm">
                    <div className="flex flex-col space-y-1.5 p-6">
                      <div className="flex items-center space-x-2">
                        <Github className="h-5 w-5 text-primary" />
                        <h3 className="text-lg text-2xl font-semibold leading-none tracking-tight">{repo.name}</h3>
                      </div>
                      {/* <p className="text-sm text-muted-foreground">
                        {repo.prs} pull requests • Last activity {repo.lastActivity}
                      </p> */}
                    </div>
                    <div className="p-6 pt-0">
                      <button className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 w-full">
                        View Reviews
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
   
  );
};

export default Dashboard;