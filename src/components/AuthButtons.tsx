import { Authenticated, Unauthenticated } from "convex/react";     
import { useAuthActions } from "@convex-dev/auth/react";           
import { Button } from "./ui/button";

export function AuthButtons() {
  const { signOut } = useAuthActions();

  return (
    <div style={{ position: "fixed", top: "1rem", right: "6rem", zIndex: 100 }}>
      <Unauthenticated>
        <Button asChild>
          <a href="/.auth/login/github">
            Sign In with GitHub
          </a>
        </Button>
      </Unauthenticated>

      <Authenticated>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          {/* You’d need to fetch the user info separately if you want name/email */}
          <span>Signed in</span>
          <Button onClick={() => void signOut()}>
            Sign Out
          </Button>
        </div>
      </Authenticated>
    </div>
  );
}
