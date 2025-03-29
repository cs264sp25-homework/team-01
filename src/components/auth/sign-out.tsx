import { useAuthActions } from "@convex-dev/auth/react";

export function SignOut() {
  const { signOut } = useAuthActions();
  
  return (
    <button
      onClick={() => void signOut()}
      className="px-4 py-2 bg-gray-900 text-gray-100 rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
    >
      Sign out
    </button>
  );
}