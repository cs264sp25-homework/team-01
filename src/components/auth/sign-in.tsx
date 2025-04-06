import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";

export function SignIn() {
  const { signIn } = useAuthActions();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("SignIn component mounted");
    console.log("Current location:", location.pathname);
  }, [location]);

  const handleSignIn = async () => {
    console.log("Sign in button clicked");
    setIsLoading(true);
    setError(null);
    
    try {
      await signIn("github");
      console.log("Sign in successful, navigating to home");
      setTimeout(() => {
        navigate("/team-01");
      }, 100);
    } catch (error) {
      console.error("Sign in error:", error);
      setError("Failed to sign in. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-svh bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Left side - illustration/branding */}
      <div className="hidden w-1/2 bg-indigo-600 lg:block">
        <div className="flex flex-col items-center justify-center h-full p-12 text-white">
          <div className="mb-8">
            <svg 
              viewBox="0 0 24 24" 
              className="w-20 h-20 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
            </svg>
          </div>
          <h1 className="mb-4 text-4xl font-bold">Note-AI</h1>
          <p className="mb-6 text-xl">Your intelligent note-taking assistant</p>
          <div className="max-w-md">
            <ul className="space-y-3 text-lg">
              <li className="flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Create and organize notes with AI assistance
              </li>
              <li className="flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Ask questions about your content
              </li>
              <li className="flex items-center">
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Seamless cloud synchronization
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Right side - sign in form */}
      <div className="flex items-center justify-center w-full p-8 lg:w-1/2">
        <div className="w-full max-w-md p-8 space-y-8 bg-white rounded-lg shadow-lg">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Welcome to Note-AI</h2>
            <p className="mt-2 text-sm text-gray-600">
              Sign in to access your intelligent note-taking assistant
            </p>
          </div>

          {error && (
            <div className="p-3 text-sm text-red-700 bg-red-100 rounded-md">
              {error}
            </div>
          )}

          <div className="mt-8 space-y-6">
            <button
              onClick={handleSignIn}
              disabled={isLoading}
              className="flex items-center justify-center w-full px-4 py-3 text-white transition-colors bg-gray-900 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-70"
            >
              {isLoading ? (
                <svg className="w-5 h-5 mr-3 -ml-1 text-white animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" width="20" height="20" className="mr-2 fill-current">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              )}
              {isLoading ? "Signing in..." : "Sign in with GitHub"}
            </button>

            <div className="flex items-center justify-center">
              <span className="text-sm text-gray-500">
                By signing in, you agree to our 
                <a href="#" className="ml-1 font-medium text-indigo-600 hover:text-indigo-500">
                  Terms of Service
                </a>
              </span>
            </div>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 text-gray-500 bg-white">
                  Need help?
                </span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <a href="mailto:madooei@jhu.edu" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
                Contact support
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}