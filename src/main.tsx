// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/clerk-react"; // <-- Import Clerk
import { ConvexProviderWithClerk } from "convex/react-clerk";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

if (!publishableKey) {
  throw new Error("Missing Clerk Publishable Key in .env");
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={publishableKey}>
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <App />
    </ConvexProviderWithClerk>
  </ClerkProvider>
);