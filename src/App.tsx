import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { useConvexAuth } from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { SignIn } from "./components/auth/sign-in";
import { SignOut } from "./components/auth/sign-out";
import "./App.css";
import { PlateEditor } from "./components/editor/plate-editor";

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
        <h1 className="mb-4 text-4xl font-bold">AI Notes App</h1>
        <p className="mb-6 text-lg text-gray-600">Sign in to get started</p>
        <SignIn />
      </div>
    );
  }

  // From here down, user is authenticated
  
  // If in editor mode, show editor
  if (showEditor) {
    return (
      <div className="relative min-h-screen">
        <div className="fixed z-10 flex gap-2 top-4 left-4">
          <button
            onClick={() => setShowEditor(false)}
            className="px-4 py-2 text-gray-800 transition-colors bg-gray-200 rounded-lg shadow-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
          >
            Back to Home
          </button>
          <SignOut />
        </div>

        <div className="flex items-center justify-center min-h-screen">
          <PlateEditor />
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
        <div className="flex justify-center mb-4">
          <SignOut />
        </div>
        
        <div className="max-w-md mx-auto mb-6">
          <div>Auth Token:</div>
          <pre className="p-2 overflow-auto text-xs border rounded-md text-wrap bg-gray-50">
            {token}
          </pre>
        </div>
        
        <button
          onClick={() => setShowMessage(!showMessage)}
          className="px-6 py-3 mr-4 text-gray-100 transition-colors bg-gray-900 rounded-lg shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
        >
          {showMessage ? "Hide Message" : "Show Message"}
        </button>

        <button
          onClick={() => setShowEditor(true)}
          className="px-6 py-3 text-gray-100 transition-colors bg-gray-900 rounded-lg shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
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
          <code className="px-2 py-1 text-sm border rounded-md bg-gray-50">
            {message}
          </code>
        </div>
      )}
    </div>
  );
}

export default App;
