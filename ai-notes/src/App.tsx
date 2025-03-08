import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useState } from "react";

function App() {
  const [showMessage, setShowMessage] = useState(false);
  const message = useQuery(api.hello.greet, {
    name: " world",
  });

  return (
    <div style={{ 
      position: 'absolute', 
      top: '50%', 
      left: '50%', 
      transform: 'translate(-50%, -50%)',
      width: '100%',
      textAlign: 'center'
    }}>
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
  );
}

export default App;
