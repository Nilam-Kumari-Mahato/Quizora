// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthButtons } from "@/components/AuthButtons";  // <-- 1. UNCOMMENT THIS
import Index from "./pages/Index";
import CreateQuiz from "./pages/CreateQuiz";
import JoinQuiz from "./pages/JoinQuiz";
import QuizDetails from "./pages/QuizDetails";
import HostQuiz from "./pages/HostQuiz";
import PlayQuiz from "./pages/PlayQuiz";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ThemeToggle />
        <AuthButtons /> {/* <-- 2. ADD THIS BACK */}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/create-quiz" element={<CreateQuiz />} />
            <Route path="/join" element={<JoinQuiz />} />
            <Route path="/quiz/:id" element={<QuizDetails />} />
            <Route path="/host/:sessionId" element={<HostQuiz />} />
            <Route path="/play/:sessionId" element={<PlayQuiz />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;