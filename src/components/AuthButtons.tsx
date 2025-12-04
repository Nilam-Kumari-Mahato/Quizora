// src/components/AuthButtons.tsx
import { SignInButton, UserButton, SignedIn, SignedOut } from "@clerk/clerk-react";
import { Button } from "./ui/button";

export function AuthButtons() {
  return (
    <>
      <SignedOut>
        <div className="fixed top-4 right-24 z-50">
          <SignInButton mode="modal">
            <Button>Sign In</Button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <div className="fixed top-5 right-24 z-50">
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
    </>
  );
}