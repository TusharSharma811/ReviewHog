

import { useState } from "react"
import { Github} from "lucide-react"
import { useNavigate } from "react-router-dom"

export default function SignInPage() {
  
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()


  async function handleGithubSignIn() {
    setSubmitting(true)
    // Demo: pretend to sign in
    window.location.href = "http://localhost:3000/api/auth/github";
  }

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-gray-50 to-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="mb-8 flex items-center justify-center">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-lg bg-orange-600 text-white flex items-center justify-center font-bold">
              CR
            </div>
            <span className="ml-3 text-2xl font-bold text-gray-900">CodeRevU</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="px-6 pt-6 pb-2">
            <h1 className="text-2xl font-semibold text-gray-900">Log in to your account</h1>

          </div>

          <div className="px-6 pb-4 ">
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
              title="GitHub Sign-Up"
              onClick={handleGithubSignIn}
            >
              <Github className="h-4 w-4" />
              Continue with GitHub
            </button>
            
          </div>

        
        </div>

      
      </div>
    </div>
  )
}
