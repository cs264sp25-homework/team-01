import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/core/components/button";

export function SignOut() {
  const { signOut } = useAuthActions();
  
  return (
    <Button onClick={() => void signOut()}>Sign out</Button>
  );
}