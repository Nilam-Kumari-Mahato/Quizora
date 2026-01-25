// src/main.tsx
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

import { ConvexReactClient } from "convex/react";
import { ConvexProvider } from "convex/react";
import { Provider } from "@/components/ui/provider";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string
);

createRoot(document.getElementById("root")!).render(
  <ConvexProvider client={convex}>
    <Provider>
      <App />
    </Provider>
  </ConvexProvider>
);
