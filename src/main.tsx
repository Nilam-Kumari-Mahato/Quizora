// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ConvexReactClient } from "convex/react";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Provider } from "@/components/ui/provider";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);
const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ;

if (!publishableKey) {
  throw new Error("Missing Clerk Publishable Key in .env");
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={publishableKey}>
    <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
      <Provider>
        <App />
      </ Provider>
    </ConvexProviderWithClerk>
  </ClerkProvider>
);