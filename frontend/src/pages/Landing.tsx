import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Github, GitPullRequest, Shield, Zap } from "lucide-react";


const LandingPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleGitHubLogin = async () => {
    setIsLoading(true);
   window.location.href = "http://localhost:3000/api/auth/github";
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Hero Image */}
      <div 
        className="absolute inset-0 opacity-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${`https://id-preview--9a35b650-0dc3-4134-be8e-cee942f0c9d3.lovable.app/assets/hero-image-BExshNac.jpg`})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-br from-background via-transparent to-background" />
      
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center relative z-10">
        {/* Hero Section */}
        <div className="space-y-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <GitPullRequest className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold">CodeRevU</h1>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-4xl font-bold leading-tight">
              Intelligent Code Reviews,
              <span className="text-primary block">Powered by AI</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Get instant, thorough code reviews on every pull request. 
              Catch bugs, improve code quality, and learn best practices.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center space-x-3">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-sm">Instant Reviews</span>
            </div>
            <div className="flex items-center space-x-3">
              <Shield className="h-5 w-5 text-primary" />
              <span className="text-sm">Security Focused</span>
            </div>
            <div className="flex items-center space-x-3">
              <Github className="h-5 w-5 text-primary" />
              <span className="text-sm">GitHub Native</span>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md mx-auto rounded-lg border bg-card text-card-foreground shadow-sm">
          <div className="flex flex-col space-y-1.5 p-6 text-center">
            <h3 className="text-2xl font-semibold leading-none tracking-tight">Get Started</h3>
            <p className="text-sm text-muted-foreground">
              Connect your GitHub account to start receiving AI-powered code reviews
            </p>
          </div>
          <div className="p-6 pt-0 space-y-4">
            <button 
              onClick={handleGitHubLogin}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-full bg-primary text-primary-foreground hover:bg-primary/90 h-11 px-8"
            >
              <Github className="mr-2 h-5 w-5" />
              {isLoading ? "Connecting..." : "Continue with GitHub"}
            </button>
            
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                By connecting your account, you agree to install the AI PR Buddy GitHub App
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;