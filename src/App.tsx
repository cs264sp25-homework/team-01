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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-2">
      {isAuthenticated ? (
        <div className="flex flex-col items-center gap-4 max-w-md w-full p-6">
          <SignOut />
          <div className="w-full mt-4">
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
      ) : (
        <>
          <h1 className="text-4xl font-bold">
            AI Notes App
          </h1>
          <p className="text-lg text-gray-600 text-center p-2">
            Smart note-taking with AI assistance.
          </p>
          <SignIn />
        </>
      )}
    </div>
  );
}

export default App;
