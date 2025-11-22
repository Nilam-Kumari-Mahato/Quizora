// src/pages/HostQuiz.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, Play, SkipForward, Trophy, Clock, Loader2, ArrowLeft } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api"; 
import { Id } from "../../convex/_generated/dataModel"; 

const HostQuiz = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const sessionData = useQuery(
    api.sessions.getHostSessionData,
    sessionId ? { sessionId: sessionId as Id<"quiz_sessions"> } : "skip"
  );
  
  const startQuizMutation = useMutation(api.gameplay.startQuiz);

  const session = sessionData?.session;
  const quiz = sessionData?.quiz;
  const questions = sessionData?.questions;
  const participants = sessionData?.participants;
  const currentQuestion = sessionData?.currentQuestion;
  
  const options = currentQuestion
    ? Object.keys(currentQuestion)
        .filter((k) => k.startsWith("option_"))
        .sort()
        .map((k) => {
          const letter = k.replace("option_", "").toUpperCase();
          return { key: letter, text: (currentQuestion as any)[k] };
        })
        .filter((o) => o.text)
    : [];

  const [timeLeft, setTimeLeft] = useState(30);
  const [timeUpNotified, setTimeUpNotified] = useState(false);

  useEffect(() => {
    if (session?.currentQuestionEndTime) {
      setTimeUpNotified(false);
    }
  }, [session?.currentQuestionEndTime]);

 useEffect(() => {
    if (!session || !currentQuestion) {
      return;
    }

    if (session.status === 'active' && !session.show_leaderboard && session.currentQuestionEndTime) {
      const updateTimer = () => {
        const now = Date.now();
        const remainingMs = session.currentQuestionEndTime! - now;
        const remainingSeconds = Math.max(0, Math.floor(remainingMs / 1000));
        
        setTimeLeft(remainingSeconds);

        if (remainingSeconds === 0 && !timeUpNotified) {
          toast({ title: "Time's up!", description: "Players can no longer answer. Click 'Show Leaderboard' or 'Next'."});
          setTimeUpNotified(true);
        }
      };

      updateTimer();
      const timer = setInterval(updateTimer, 1000);
      return () => clearInterval(timer);
      
    } else if (session.status === 'waiting') {
      setTimeLeft(currentQuestion.time_limit);
    }
    
  }, [
    session?.status, 
    session?.show_leaderboard, 
    session?.currentQuestionEndTime,
    currentQuestion?.time_limit,
    timeUpNotified,
    toast,
  ]);

  const showLeaderboardMutation = useMutation(api.gameplay.showLeaderboard);
  const setRevealAnswerMutation = useMutation(api.gameplay.setRevealAnswer);
  const nextQuestionMutation = useMutation(api.gameplay.nextQuestion);

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

  // FIX: Simplified handler
  const handleShowLeaderboardClick = () => {
    showLeaderboard();
  };

  const skipLeaderboard = () => {
    nextQuestion();
  };

  if (sessionData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

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
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/5 p-2 ">
      <div className="container max-w-6xl mx-auto mt-20">
        <Card className="p-4 mb-6">
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
                className=" rounded-xl bg-gradient-to-r from-primary to-secondary"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Quiz
              </Button>
            </div>
          )}

          {session?.status === 'active' && !session?.show_leaderboard && currentQuestion && (
            <div className="space-y-4">
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

              <div className="flex gap-1 justify-end mb-2 ">
                <Button
                  disabled={timeLeft > 0 || session?.reveal_answer}
                  onClick={async () => {
                    if (!sessionId) return;
                    try {
                      await setRevealAnswerMutation({ sessionId: sessionId as Id<"quiz_sessions">, reveal: !session?.reveal_answer });
                    } catch (error: any) {
                      toast({ title: "Error", description: error.message, variant: "destructive" });
                    }
                  }}
                  size="sm"
                  variant={session?.reveal_answer ? undefined : "outline"}
                  className="px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base md:px-5 md:py-3 md:text-lg rounded-lg text-gray-800 bg-primary"
                >
                  Reveal Answer
                </Button>
                <Button
                  disabled={timeLeft > 0}
                  onClick={handleShowLeaderboardClick} 
                  size="sm"
                  variant="ghost" 
                  className="px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base md:px-5 md:py-3 md:text-lg rounded-lg text-gray-500"
                >
                 Show Leaderboard
                </Button>
                
              </div>

              <div className="grid grid-cols-1 gap-4 text-primary-glow">
                {options.map(({ key: option, text: optionText }) => {
                  const colors = {
                    default: 'gray-600 border-gray-300 '
                  } as Record<string, string>;

                  const isCorrect = session?.reveal_answer && currentQuestion?.correct_answer === option;

                  return (
                    <div
                      key={option}
                      className={`p-4 rounded-xl bg-gradient-to-br ${colors.default} text-primary-glow flex items-center justify-start gap-4 transition-all duration-200 ${isCorrect ? 'ring-4 ring-success/50 bg-success/10 border-success scale-105' : ''}`}
                    >
                      <span className="w-10 h-10 rounded-full p-2 bg-muted text-muted-foreground text-xl font-bold text-center">{option}</span>
                      <span className="text-xl">{optionText}</span>
                    </div>
                  );
                })}
              </div>
              <Button
                  onClick={nextQuestion} 
                  size="sm"
                  className=" display:center px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base md:px-5 md:py-3 md:text-lg rounded-lg"
                >
                  Next
                  <SkipForward className="h-4 w-4" />
                </Button>
            </div>
          )}

          {session?.status === 'active' && session?.show_leaderboard && (
            <div className="text-center py-12">
              <DotLottieReact src="path/to/animation.lottie" loop autoplay
              className="h-10 w-10 sm:h-12 sm:w-12 md:h-16 md:w-16 lg:h-20 lg:w-20 mx-auto mb-4 text-warning" />
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
              <Trophy className="h-12 w-12 sm:h-14 sm:w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 mx-auto mb-4 text-warning" />
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-bold mb-2">Quiz Finished!</h2>
              
              <h3 className="text-lg sm:text-xl md:text-2xl lg:text-2xl xl:text-3xl font-bold mb-4">Final Scores</h3>
              <div className="space-y-3 mb-8">
                {participants?.map((p, i) => (
                  <div 
                    key={p._id}
                    className={`flex justify-between items-center p-2 rounded-lg ${
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

              <Button onClick={() => navigate('/')} size="lg" className="rounded-full">
                Back to Home
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default HostQuiz;
