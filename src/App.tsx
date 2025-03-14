import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import BasicEditor from "./editor";
import { useConvexAuth } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { SignOut } from "@/auth/components/sign-out";
import { SignIn } from "@/auth/components/sign-in";

//NOTE: for now just showing the editor page conditionally based on button to test the editor page
//eventually we will need to implement routing when we create a real home page
function App() {
  const [showMessage, setShowMessage] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
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

  if (showEditor) {
    return (
      <div>
        <button
          onClick={() => setShowEditor(false)}
          className="absolute top-4 left-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 shadow-md transition-colors"
        >
          Back to Home
        </button>
        <BasicEditor />
      </div>
    );
  }

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
            
            <div className="mt-6 text-center w-full space-y-4">
              <button
                onClick={() => setShowEditor(true)}
                className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-300 shadow-md transition-colors"
              >
                Go to Editor
              </button>

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
