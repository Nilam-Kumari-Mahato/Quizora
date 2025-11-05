import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { ConvexReactClient } from "convex/react";
import { ConvexAuthProvider } from "@convex-dev/auth/react";

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string);

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}> {}
    <App />
  </ConvexAuthProvider>
);