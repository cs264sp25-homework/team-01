import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { useConvexAuth } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import CustomEditor from "./editor/customEditor";
import { SignIn } from "./components/auth/sign-in";
import { SignOut } from "./components/auth/sign-out";
import "./App.css";

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

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  // If not authenticated, show sign-in page
  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-svh">
        <h1 className="text-4xl font-bold mb-4">AI Notes App</h1>
        <p className="text-lg text-gray-600 mb-6">Sign in to get started</p>
        <SignIn />
      </div>
    );
  }

  // From here down, user is authenticated
  
  // If in editor mode, show editor
  if (showEditor) {
    return (
      <div className="relative min-h-screen">
        <div className="fixed top-4 left-4 z-10 flex gap-2">
          <button
            onClick={() => setShowEditor(false)}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 shadow-md transition-colors"
          >
            Back to Home
          </button>
          <SignOut />
        </div>

        <div className="flex justify-center items-center min-h-screen">
          <CustomEditor />
        </div>
      </div>
    );
  }

  // Home page (authenticated)
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: "100%",
        textAlign: "center",
      }}
    >
      <div className="space-y-4">
        <button
          onClick={() => setShowMessage(!showMessage)}
          className="px-6 py-3 bg-gray-900 text-gray-100 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 shadow-md transition-colors mr-4"
        >
          {showMessage ? "Hide Message" : "Show Message"}
        </button>

        <button
          onClick={() => setShowEditor(true)}
          className="px-6 py-3 bg-gray-900 text-gray-100 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 shadow-md transition-colors"
        >
          Go to Editor
        </button>
      </div>

      {showMessage && message === undefined && (
        <div className="mt-4 text-gray-600">
          Loading message from backend...
        </div>
      )}

          {showMessage && message !== undefined && (
            <div className="mt-4">
              Backend says:{" "}
              <code className="border px-2 py-1 rounded-md text-sm bg-gray-50">
                {message}
              </code>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
