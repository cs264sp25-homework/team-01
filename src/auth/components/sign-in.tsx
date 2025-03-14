import { useAuthActions } from "@convex-dev/auth/react";
import { Button } from "@/core/components/button";

export function SignIn() {
  const { signIn } = useAuthActions();

  return (
    <Button onClick={() => void signIn("github")}>Sign in with GitHub</Button>
  );
}