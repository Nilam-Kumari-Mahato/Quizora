// src/components/AuthButtons.tsx
import { SignInButton, UserButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { Button } from "./ui/button";

export function AuthButtons() {
  return (
    <div style={{ position: "fixed", top: "1rem", right: "6rem", zIndex: 100 }}>
      <SignedOut>
        <SignInButton mode="modal">
          <Button>Sign In</Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </div>
  );
}