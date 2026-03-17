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
import { useUserSync } from "@/hooks/useUserSync";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CreateQuiz from "./pages/CreateQuiz";
import JoinQuiz from "./pages/JoinQuiz";
import QuizDetails from "./pages/QuizDetails";
import HostQuiz from "./pages/HostQuiz";
import PlayQuiz from "./pages/PlayQuiz";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  useUserSync();

  return (
    <>
      <ThemeToggle />
      <AuthButtons />
      <BrowserRouter future={{ v7_relativeSplatPath: true }}>
        <SignInRedirect />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/create-quiz" element={<CreateQuiz />} />
          <Route path="/join" element={<JoinQuiz />} />
          <Route path="/quiz/:id" element={<QuizDetails />} />
          <Route path="/host/:sessionId" element={<HostQuiz />} />
          <Route path="/play/:sessionId" element={<PlayQuiz />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AppContent />
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;