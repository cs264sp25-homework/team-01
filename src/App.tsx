import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { useConvexAuth } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { SignOut } from "@/auth/components/sign-out";
import { SignIn } from "@/auth/components/sign-in";

function App() {
  const [showMessage, setShowMessage] = useState(false);
  const message = useQuery(api.hello.greet, {
    name: " world",
  });
  const token = useAuthToken();
  const { isLoading, isAuthenticated } = useConvexAuth();

  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 flex items-center justify-center">
        {isAuthenticated ? (
          <div className="flex flex-col items-center gap-4 w-full max-w-md p-6">
            <SignOut />
            <div className="w-full">
              <div>Token:</div>
              <pre className="w-full text-wrap overflow-auto border rounded-md p-2">
                {token}
              </pre>
            </div>
            
            <div className="mt-6 text-center w-full">
              <button 
                onClick={() => setShowMessage(!showMessage)} 
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300 shadow-md transition-colors"
              >
                {showMessage ? "Hide Message" : "Show Message"}
              </button>
              
              {showMessage && message === undefined && (
                <div className="mt-4 text-gray-600">Loading message from backend...</div>
              )}
              
              {showMessage && message !== undefined && (
                <div className="mt-4">
                  Backend says:{" "}
                  <code className="border px-2 py-1 rounded-md text-sm bg-gray-50">{message}</code>
                </div>
              )}
            </div>
          </div>
        ) : isLoading ? (
          <div className="text-center p-8">Loading...</div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative" style={{ 
              position: 'absolute', 
              left: '50%', 
              top: '50%', 
              transform: 'translate(-50%, -50%)'
            }}>
              <SignIn />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
