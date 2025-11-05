import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Play, Copy, CheckCircle, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel"; // <-- This import is needed

const QuizDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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
    setLoading(true);
    try {
      // Call the mutation, casting the 'id' string
      const sessionId = await createSessionMutation({
        quizId: id as Id<"quizzes">, 
      });
      
      // Navigate to the host page
      navigate(`/host/${sessionId}`);
    } catch (error: any) {
      toast({ title: "Error", description: `Failed to start quiz: ${error.message}`, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyQuizLink = () => {
    const link = window.location.href; // Use current URL
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

  // Auth logic removed
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 py-8">
      <div className="container max-w-4xl mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <Card className="p-8 mb-6">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            {quiz?.title}
          </h1>
          {quiz?.description && (
            <p className="text-muted-foreground mb-6">{quiz.description}</p>
          )}

          <div className="flex gap-4">
            {/* "Start Quiz" button is now always visible */}
            <Button
              onClick={startQuiz}
              disabled={loading}
              size="lg"
              className="bg-gradient-to-r from-primary to-secondary"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Play className="mr-2 h-5 w-5" />
              )}
              Start Quiz
            </Button>
            <Button
              onClick={copyQuizLink}
              size="lg"
              variant="outline"
            >
              {copied ? (
                <>
                  <CheckCircle className="mr-2 h-5 w-5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-5 w-5" />
                  Copy Link
                </>
              )}
            </Button>
          </div>
        </Card>

        <h2 className="text-2xl font-bold mb-4">Questions ({questions?.length || 0})</h2>
        <div className="space-y-4">
          {questions?.map((question, index) => (
            <Card key={question._id} className="p-6">
              <div className="flex justify-between items-start mb-3">
                <h3 className="font-semibold text-lg">Question {index + 1}</h3>
                <span className="text-sm text-muted-foreground">{question.time_limit}s</span>
              </div>
              <p className="mb-3">{question.question_text}</p>
              {question.question_image_url && (
                <img 
                  src={question.question_image_url} 
                  alt="Question" 
                  className="w-full max-h-64 object-cover rounded-lg mb-3"
                />
              )}
              <div className="grid grid-cols-2 gap-2">
                {['A', 'B', 'C', 'D'].map(option => {
                  const optionText = question[`option_${option.toLowerCase()}`];
                  if (!optionText) return null;
                  return (
                    <div 
                      key={option}
                      className={`p-3 rounded-lg border ${
                        question.correct_answer === option 
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