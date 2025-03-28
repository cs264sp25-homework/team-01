import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";
import CustomEditor from "./editor/customEditor";
import "./App.css";

//NOTE: for now just showing the editor page conditionally based on button to test the editor page
//eventually we will need to implement routing when we create a real home page
function App() {
  const [showMessage, setShowMessage] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const message = useQuery(api.hello.greet, {
    name: " world",
  });

  if (showEditor) {
    return (
      <div className="relative min-h-screen">
        <button
          onClick={() => setShowEditor(false)}
          className="fixed top-4 left-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 shadow-md transition-colors z-10"
        >
          Back to Home
        </button>

        <div className="flex justify-center items-center min-h-screen">
          <CustomEditor />
        </div>
      </div>
    );
  }

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
  );
}

export default App;
