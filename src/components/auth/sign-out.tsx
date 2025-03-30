import { useAuthActions } from "@convex-dev/auth/react";
import { useNavigate } from "react-router-dom";

export function SignOut() {
  const { signOut } = useAuthActions();
  const navigate = useNavigate();
  
  const handleSignOut = async () => {
    await signOut();
    // Wait a brief moment for auth state to update
    setTimeout(() => {
      navigate("/signin");
    }, 100);
  };
  
  return (
    <button
      onClick={handleSignOut}
      className="px-4 py-2 bg-gray-900 text-gray-100 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
    >
      Sign out
    </button>
  );
}