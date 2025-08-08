import { CheckCircle, Code, GitBranch, Shield, Zap, Users, ArrowRight, Star, Github } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b border-gray-200 bg-white">
        <Link className="flex items-center justify-center" to="#">
          <Code className="h-8 w-8 text-orange-600" />
          <span className="ml-2 text-2xl font-bold text-gray-900">CodeRevU</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Link className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors" to="#features">
            Features
          </Link>
          <Link className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors" to="#how-it-works">
            How it Works
          </Link>
          <Link className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors" to="#pricing">
            Pricing
          </Link>
          <Link className="text-sm font-medium text-gray-600 hover:text-orange-600 transition-colors" to="#about">
            About
          </Link>
        </nav>
        <div className="ml-6 flex items-center gap-2">
          <button className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors">
            Sign In
          </button>
          <button className="px-4 py-2 text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 rounded-md transition-colors">
            Get Started
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-gradient-to-br from-gray-50 via-white to-orange-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_500px] lg:gap-12 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 border border-orange-200">
                    <Zap className="w-3 h-3 mr-1" />
                    AI-Powered Code Reviews
                  </span>
                  <h1 className="text-3xl font-bold tracking-tight sm:text-5xl xl:text-6xl text-gray-900">
                    Ship Better Code
                    <span className="text-orange-600"> Faster</span>
                  </h1>
                  <p className="max-w-[600px] text-gray-600 text-lg md:text-xl">
                    Get instant, intelligent code reviews powered by AI. Catch bugs, improve code quality, 
                    and accelerate your development workflow with automated insights.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <a href="https://github.com/apps/CodeRevu/installations/new" target="_blank" rel="noopener noreferrer">
                  <button className="inline-flex items-center justify-center h-12 px-8 text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-md transition-colors cursor-pointer">
                    <Github className="mr-2 h-4 w-4" />
                    Connect GitHub
                  </button>
                  </a>
                </div>
                
              </div>
              <div className="flex items-center justify-center">
                <div className="relative">
                  <img
                   
                    src="/placeholder.svg?height=400&width=500&text=Code+Review+Dashboard"
                    width="500"
                    height="400"
                    alt="Code Review Dashboard"
                    className="mx-auto aspect-video overflow-hidden rounded-xl border border-gray-200 object-cover shadow-2xl"
                  />
                  <div className="absolute -bottom-4 -left-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">{'24 issues fixed'}</span>
                    </div>
                  </div>
                  <div className="absolute -top-4 -right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-orange-500 fill-current" />
                      <span className="text-sm font-medium text-gray-900">{'98% accuracy'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  Features
                </span>
                <h2 className="text-3xl font-bold tracking-tight sm:text-5xl text-gray-900">
                  Everything you need for better code reviews
                </h2>
                <p className="max-w-[900px] text-gray-600 text-lg md:text-xl">
                  Our AI-powered platform provides comprehensive code analysis, security scanning, 
                  and intelligent suggestions to help your team ship higher quality code.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <Shield className="h-10 w-10 text-orange-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Security Scanning</h3>
                  <p className="text-gray-600">
                    Automatically detect security vulnerabilities, potential exploits, and compliance issues in your code.
                  </p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <Zap className="h-10 w-10 text-orange-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Performance Analysis</h3>
                  <p className="text-gray-600">
                    Identify performance bottlenecks, memory leaks, and optimization opportunities with AI insights.
                  </p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <Code className="h-10 w-10 text-orange-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Code Quality</h3>
                  <p className="text-gray-600">
                    Enforce coding standards, detect code smells, and suggest improvements for maintainability.
                  </p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <GitBranch className="h-10 w-10 text-orange-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Git Integration</h3>
                  <p className="text-gray-600">
                    Seamlessly integrate with GitHub, GitLab, and Bitbucket for automated pull request reviews.
                  </p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <Users className="h-10 w-10 text-orange-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Team Collaboration</h3>
                  <p className="text-gray-600">
                    Enable better team communication with contextual comments and review assignments.
                  </p>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="space-y-4">
                  <CheckCircle className="h-10 w-10 text-orange-600" />
                  <h3 className="text-xl font-semibold text-gray-900">Custom Rules</h3>
                  <p className="text-gray-600">
                    Create custom review rules and policies tailored to your team's specific requirements.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="w-full py-12 md:py-24 lg:py-32 bg-gray-50">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  How It Works
                </span>
                <h2 className="text-3xl font-bold tracking-tight sm:text-5xl text-gray-900">
                  Get started in minutes
                </h2>
                <p className="max-w-[900px] text-gray-600 text-lg md:text-xl">
                  Connect your repository and start getting intelligent code reviews immediately.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-600 text-white text-2xl font-bold">
                  1
                </div>
                <h3 className="text-xl font-bold text-gray-900">Connect Repository</h3>
                <p className="text-gray-600">
                  Link your GitHub, GitLab, or Bitbucket repository with just a few clicks.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-600 text-white text-2xl font-bold">
                  2
                </div>
                <h3 className="text-xl font-bold text-gray-900">Configure Rules</h3>
                <p className="text-gray-600">
                  Set up your review preferences and custom rules to match your team's standards.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-600 text-white text-2xl font-bold">
                  3
                </div>
                <h3 className="text-xl font-bold text-gray-900">Get Reviews</h3>
                <p className="text-gray-600">
                  Receive instant, intelligent code reviews on every pull request automatically.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl text-gray-900">
                  Trusted by developers worldwide
                </h2>
                <p className="mx-auto max-w-[700px] text-gray-600 text-lg md:text-xl">
                  Join thousands of teams who have improved their code quality and development speed.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-8">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-orange-500 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600">
                    "CodeReviewer has transformed our development process. We catch bugs earlier and ship with confidence."
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      JS
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">John Smith</p>
                      <p className="text-xs text-gray-500">Senior Developer at TechCorp</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-orange-500 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600">
                    "The AI suggestions are incredibly accurate. It's like having a senior developer review every PR."
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      MJ
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Maria Johnson</p>
                      <p className="text-xs text-gray-500">Tech Lead at StartupXYZ</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 text-orange-500 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-600">
                    "Our code quality improved by 40% within the first month. The security scanning is a game-changer."
                  </p>
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-orange-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                      DL
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">David Lee</p>
                      <p className="text-xs text-gray-500">CTO at InnovateLabs</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-gray-900 text-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                  Ready to improve your code quality?
                </h2>
                <p className="mx-auto max-w-[600px] text-gray-300 text-lg md:text-xl">
                  Start your free trial today and experience the power of AI-driven code reviews.
                </p>
              </div>
              <div className="w-full max-w-sm space-y-2">
                <form className="flex gap-2">
                  <input 
                    type="email" 
                    placeholder="Enter your email" 
                    className="flex-1 px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent" 
                  />
                  <button 
                    type="submit" 
                    className="px-6 py-2 bg-orange-600 text-white hover:bg-orange-700 rounded-md transition-colors font-medium"
                  >
                    Get Started
                  </button>
                </form>
                <p className="text-xs text-gray-400">
                  Start your 14-day free trial. No credit card required.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t border-gray-200 bg-white">
        <p className="text-xs text-gray-500">
          © 2024 CodeReviewer. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs text-gray-500 hover:text-gray-900 hover:underline underline-offset-4" to="#">
            Terms of Service
          </Link>
          <Link className="text-xs text-gray-500 hover:text-gray-900 hover:underline underline-offset-4" to="#">
            Privacy Policy
          </Link>
          <Link className="text-xs text-gray-500 hover:text-gray-900 hover:underline underline-offset-4" to="#">
            Contact
          </Link>
        </nav>
      </footer>
    </div>
  )
}
