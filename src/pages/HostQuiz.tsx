import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, Play, SkipForward, Trophy, Clock, Loader2, ArrowLeft } from "lucide-react";
import { useQuery, useMutation } from "convex/react"; // 1. Import Convex hooks
import { api } from "../../convex/_generated/api"; // 2. Import API
import { Id } from "../../convex/_generated/dataModel"; // 3. Import Id type

const HostQuiz = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState(0);

  // 4. Get all data from one real-time query
  const sessionData = useQuery(
    api.sessions.getHostSessionData,
    sessionId ? { sessionId: sessionId as Id<"quiz_sessions"> } : "skip"
  );

  // 5. Get mutation functions
  const startQuizMutation = useMutation(api.gameplay.startQuiz);
  const showLeaderboardMutation = useMutation(api.gameplay.showLeaderboard);
  const nextQuestionMutation = useMutation(api.gameplay.nextQuestion);

  // Extract data from the query result
  const session = sessionData?.session;
  const quiz = sessionData?.quiz;
  const questions = sessionData?.questions;
  const participants = sessionData?.participants;
  const currentQuestion = sessionData?.currentQuestion;

  // Timer logic
  useEffect(() => {
    if (session?.status === 'active' && !session.show_leaderboard && currentQuestion) {
      // Start a new timer when the question changes
      setTimeLeft(currentQuestion.time_limit);
    }
  }, [currentQuestion, session?.status, session?.show_leaderboard]);

  useEffect(() => {
    if (timeLeft > 0 && session?.status === 'active' && !session.show_leaderboard) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && session?.status === 'active' && currentQuestion && !session.show_leaderboard) {
      // Time's up! Automatically show leaderboard
      showLeaderboard();
    }
  }, [timeLeft, session?.status, currentQuestion, session?.show_leaderboard]);


  // 6. Hook up mutations
  const startQuiz = async () => {
    if (!sessionId) return;
    try {
      await startQuizMutation({ sessionId: sessionId as Id<"quiz_sessions"> });
    } catch (error: any) {
      toast({ title: "Error starting quiz", description: error.message, variant: "destructive" });
    }
  };

  const showLeaderboard = async () => {
    if (!sessionId) return;
    try {
      await showLeaderboardMutation({ sessionId: sessionId as Id<"quiz_sessions"> });
    } catch (error: any) {
      toast({ title: "Error showing leaderboard", description: error.message, variant: "destructive" });
    }
  };

  const nextQuestion = async () => {
    if (!sessionId) return;
    try {
      await nextQuestionMutation({ sessionId: sessionId as Id<"quiz_sessions"> });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const skipLeaderboard = () => {
    nextQuestion();
  };

  // 7. Handle loading state
  if (sessionData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  // 8. Handle not found or not authorized
  // (getHostSessionData returns null if user is not host)
  if (sessionData === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Session Not Found</h1>
        <p className="text-muted-foreground mb-4">
          Either this session doesn't exist or you're not authorized to host it.
        </p>
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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-4">
      <div className="container max-w-6xl mx-auto">
        <Card className="p-8 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">{quiz?.title}</h1>
              <p className="text-muted-foreground">Join Code: <span className="text-2xl font-bold text-primary">{session?.join_code}</span></p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <span className="font-bold">{participants?.length || 0}</span>
              </div>
            </div>
          </div>

          {session?.status === 'waiting' && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4">Waiting for participants...</h2>
              <p className="text-muted-foreground mb-6">
                Share the code above for players to join
              </p>
              <Button
                onClick={startQuiz}
                disabled={(participants?.length || 0) === 0}
                size="lg"
                className="bg-gradient-to-r from-primary to-secondary"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Quiz
              </Button>
            </div>
          )}

          {session?.status === 'active' && !session?.show_leaderboard && currentQuestion && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">
                  Question {session.current_question_index + 1} of {questions?.length}
                </h2>
                <div className="flex items-center gap-2 text-warning">
                  <Clock className="h-5 w-5" />
                  <span className="text-2xl font-bold">{timeLeft}s</span>
                </div>
              </div>

              <div className="p-6 bg-muted rounded-lg">
                <p className="text-2xl font-semibold mb-4">{currentQuestion.question_text}</p>
                {currentQuestion.question_image_url && (
                  <img 
                    src={currentQuestion.question_image_url} 
                    alt="Question" 
                    className="w-full max-h-96 object-contain rounded-lg"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                {['A', 'B', 'C', 'D'].map(option => {
                  const optionText = currentQuestion[`option_${option.toLowerCase()}`];
                  if (!optionText) return null;
                  
                  const colors = {
                    A: 'from-red-500 to-red-600',
                    B: 'from-blue-500 to-blue-600',
                    C: 'from-yellow-500 to-yellow-600',
                    D: 'from-green-500 to-green-600'
                  };

                  return (
                    <div 
                      key={option}
                      className={`p-6 rounded-xl bg-gradient-to-br ${colors[option as keyof typeof colors]} text-white`}
                    >
                      <span className="text-3xl font-bold mr-3">{option}</span>
                      <span className="text-xl">{optionText}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {session?.status === 'active' && session?.show_leaderboard && (
            <div className="text-center py-12">
              <Trophy className="h-16 w-16 mx-auto mb-4 text-warning" />
              <h2 className="text-3xl font-bold mb-8">Leaderboard</h2>
              
              <div className="space-y-3 mb-8">
                {participants?.map((p, i) => (
                  <div 
                    key={p._id}
                    className={`flex justify-between items-center p-4 rounded-lg ${
                      i === 0 ? 'bg-warning/20 border-2 border-warning' :
                      i === 1 ? 'bg-muted border-2' :
                      i === 2 ? 'bg-muted border' :
                      'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">{i + 1}</span>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                    <span className="text-xl font-bold text-primary">{p.score}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={skipLeaderboard}
                  size="lg"
                  variant="outline"
                >
                  <SkipForward className="mr-2 h-5 w-5" />
                  Skip
                </Button>
                <Button
                  onClick={nextQuestion}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-secondary"
                >
                  Next Question
                </Button>
              </div>
            </div>
          )}

          {session?.status === 'finished' && (
            <div className="text-center py-12">
              <Trophy className="h-20 w-20 mx-auto mb-4 text-warning" />
              <h2 className="text-4xl font-bold mb-8">Quiz Finished!</h2>
              
              <h3 className="text-2xl font-bold mb-4">Final Scores</h3>
              <div className="space-y-3 mb-8">
                {participants?.map((p, i) => (
                  <div 
                    key={p._id}
                    className={`flex justify-between items-center p-4 rounded-lg ${
                      i === 0 ? 'bg-warning/20 border-2 border-warning' : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">{i + 1}</span>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                    <span className="text-xl font-bold text-primary">{p.score}</span>
                  </div>
                ))}
              </div>

              <Button onClick={() => navigate('/')} size="lg">
                Back to Home
              </Button>
            </div>
          )}
        </Card>

        {session?.status === 'waiting' && (participants?.length || 0) > 0 && (
          <Card className="p-6">
            <h3 className="text-xl font-bold mb-4">Participants ({participants?.length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {participants?.map(p => (
                <div key={p._id} className="p-3 bg-muted rounded-lg text-center">
                  {p.name}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default HostQuiz;