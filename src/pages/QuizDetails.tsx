import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Play, Copy, CheckCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { useAuth } from "@clerk/clerk-react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

const QuizDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isLoaded, isSignedIn } = useAuth();

  // Fetch quiz data, casting the 'id' string to Id<"quizzes">
  const quizData = useQuery(
    api.quizzes.getQuizDetails,
    id ? { id: id as Id<"quizzes"> } : "skip"
  );
  const quiz = quizData?.quiz;
  const questions = quizData?.questions;

  // Get the createSession mutation
  const createSessionMutation = useMutation(api.sessions.createSession);

  const startQuiz = async () => {
    if (!id) return;

    // Check if auth is loaded
    if (!isLoaded) {
      toast({ 
        title: "Loading...", 
        description: "Please wait while we verify your authentication" 
      });
      return;
    }

    // Check if user is signed in
    if (!isSignedIn) {
      toast({ 
        title: "Authentication Required", 
        description: "Please sign in to host a quiz", 
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      // Call the mutation, casting the 'id' string
      const sessionId = await createSessionMutation({
        quizId: id as Id<"quizzes">,
      });

      // Navigate to the host page
      navigate(`/host/${sessionId}`);
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error occurred";
      
      if (errorMessage.includes("logged in")) {
        toast({ 
          title: "Authentication Error", 
          description: "Please sign out and sign back in, then try again", 
          variant: "destructive" 
        });
      } else if (errorMessage.includes("not authorized")) {
        toast({ 
          title: "Not Authorized", 
          description: "You can only host quizzes you created", 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Error", 
          description: `Failed to start quiz: ${errorMessage}`, 
          variant: "destructive" 
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const copyQuizLink = () => {
    const link = window.location.href;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: "Link Copied!", description: "Share this link with others" });
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle loading state while fetching data
  if (quizData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  // Handle quiz not found
  if (quizData === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Quiz Not Found</h1>
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-t from-zinc-200/80 via-zinc-200/80 to-zinc-200/80 dark:bg-gradient-to-b dark:from-black/80 dark:via-black/80 dark:to-black/80 py-8 ">
      <div className="container max-w-4xl mx-auto px-2">
        <Button
          variant="ghost"
          onClick={() => navigate('/dashboard')}
          className="hover:bg-gradient-to-r from-primary to-secondary mb-6 rounded-full text-zinc-500"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Home
        </Button>

        <Card className="flex flex-col lg:flex-row justify-between items-betwwun p-5 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-2 bg-gradient-to-b from-primary to-orange-300 bg-clip-text text-transparent">
              {quiz?.title}
            </h1>
            {quiz?.description && (
              <p className="text-muted-foreground mb-2">{quiz.description}</p>
            )} </div>

          <div className="flex gap-4">
            <Button
              onClick={startQuiz}
              disabled={loading}
              size="sm"
              className="bg-gradient-to-r from-primary to-secondary hover:opacity-70 px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base md:px-5 md:py-3 md:text-md rounded-lg"
            >
              {loading ? (
                <Loader2 className=" h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              Start Quiz
            </Button>
            <Button
              onClick={copyQuizLink}
              size="sm"
              variant="outline"
              className="hover:bg-gradient-to-r from-primary to-secondary px-2 py-2 text-sm sm:px-4 sm:py-2 sm:text-base md:px-5 md:py-3 md:text-md rounded-lg dark:text-zinc-400 hover:dark:text-black"
            >
              {copied ? (
                <>
                  <CheckCircle className="h-5 w-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-5 w-5" />
                  Copy Host Link
                </>
              )}
            </Button>
          </div>
        </Card>

        <h2 className="text-2xl font-bold mb-4 dark:text-zinc-200">Questions ({questions?.length || 0})</h2>
        <div className="space-y-4">
          {questions?.map((question, index) => (
            <Card key={question._id} className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg text-orange-300">Question {index + 1}</h3>
                <span className="text-sm text-muted-foreground">{question.time_limit}s</span>
              </div>
              <p className="mb-3 dark:text-zinc-200">{question.question_text}</p>
              {question.question_image_url && (
                <img
                  src={question.question_image_url}
                  alt="Question"
                  className="w-full max-h-64 object-contain rounded-lg mb-3"
                />
              )}
              <div className="grid grid-cols-2 gap-2 dark:text-zinc-300">
                {['A', 'B', 'C', 'D'].map(option => {
                  const optionText = question[`option_${option.toLowerCase()}`];
                  if (!optionText) return null;
                  return (
                    <div
                      key={option}
                      className={`p-3 rounded-lg border ${question.correct_answer === option
                          ? 'bg-success/10 border-success'
                          : 'bg-muted'
                        }`}
                    >
                      <span className="font-bold mr-2">{option}.</span>
                      {optionText}
                    </div>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default QuizDetails;