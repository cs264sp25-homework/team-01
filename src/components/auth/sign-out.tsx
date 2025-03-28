import { useAuthActions } from "@convex-dev/auth/react";

export function SignOut() {
  const { signOut } = useAuthActions();
  
  return (
    <button
      onClick={() => void signOut()}
      className="px-6 py-3 bg-gray-900 text-gray-100 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300 shadow-md transition-colors"
    >
      Sign out
    </button>
  );
}