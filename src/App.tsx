// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AuthButtons } from "@/components/AuthButtons";
import { SignInRedirect } from "@/components/SignInRedirect";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CreateQuiz from "./pages/CreateQuiz";
import JoinQuiz from "./pages/JoinQuiz";
import QuizDetails from "./pages/QuizDetails";
import HostQuiz from "./pages/HostQuiz";
import PlayQuiz from "./pages/PlayQuiz";
import NotFound from "./pages/NotFound";
import { StateDemo } from "./components/StateDemo";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ThemeToggle />
        <AuthButtons />
        <BrowserRouter>
          <SignInRedirect />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-quiz" element={<CreateQuiz />} />
            <Route path="/join" element={<JoinQuiz />} />
            <Route path="/quiz/:id" element={<QuizDetails />} />
            <Route path="/host/:sessionId" element={<HostQuiz />} />
            <Route path="/play/:sessionId" element={<PlayQuiz />} />
            <Route path="/demo" element={<StateDemo />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;