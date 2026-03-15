// src/pages/HostQuiz.tsx
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Users, Play, SkipForward, Trophy, Clock, Loader2, ArrowLeft, Copy, Check } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Progress } from "@chakra-ui/react"

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
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (session?.join_code) {
      navigator.clipboard.writeText(session.join_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Code copied!" });
    }
  };

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
  const [progressPercent, setProgressPercent] = useState(100);
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

        // Calculate precise progress percentage based on milliseconds
        const totalMs = currentQuestion.time_limit * 1000;
        const percent = Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));

        setTimeLeft(remainingSeconds);
        setProgressPercent(percent);

        if (remainingSeconds === 0 && !timeUpNotified) {
          toast({ title: "Time's up!", description: "Players can no longer answer. Click 'Show Leaderboard' or 'Next'." });
          setTimeUpNotified(true);
        }
      };

      updateTimer();
      const timer = setInterval(updateTimer, 100);
      return () => clearInterval(timer);

    } else if (session.status === 'waiting') {
      setTimeLeft(currentQuestion.time_limit);
      setProgressPercent(100);
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
  const endQuizMutation = useMutation(api.gameplay.endQuiz);

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

  const handleShowLeaderboardClick = () => {
    showLeaderboard();
  };

  const skipLeaderboard = () => {
    nextQuestion();
  };

  const endQuiz = async () => {
    if (!sessionId) return;
    try {
      await endQuizMutation({ sessionId: sessionId as Id<"quiz_sessions"> });
      navigate(`/quiz/${session?.quizId}`);
    } catch (error: any) {
      toast({ title: "Error ending quiz", description: error.message, variant: "destructive" });
    }
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
    <div className="min-h-screen bg-gradient-to-b from-zinc-200/30 via-zinc-200/80 to-zinc-200/80 dark:bg-gradient-to-b dark:from-black/80 dark:via-black/80 dark:to-black/80 p-2 ">
      <div className="container max-w-6xl mx-auto mt-20">
        <Card className="px-3 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 dark:text-white/80">{quiz?.title}</h1>
              <div className="flex items-center gap-2">
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground">Join Code: <span className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-orange-300">{session?.join_code}</span></p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 w-8 p-0 hover:bg-muted/50 transition-all duration-200"
                  title="Copy Join Code"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success animate-in zoom-in duration-200" />
                  ) : (
                    <Copy className="h-4 w-4 text-muted-foreground hover:text-orange-300" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              {session?.status === 'finished' && (
                <Button
                  variant="ghost"
                  onClick={() => navigate('/dashboard')}
                  className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm md:px-4 md:py-2 md:text-base rounded-full hover:bg-muted/50 hover:text-orange-300 opacity-70"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Back to Home</span>
                  <span className="sm:hidden">Home</span>
                </Button>
              )}
              <div className="flex items-center gap-1 sm:gap-2">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                <span className="text-sm sm:text-base font-bold">{participants?.length || 0}</span>
              </div>
            </div>
          </div>

          {session?.status === 'waiting' && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold mb-4 dark:text-zinc-300">Waiting for participants...</h2>
              <p className="text-muted-foreground mb-6">
                Share the code above for players to join
              </p>
              <Button
                onClick={startQuiz}
                disabled={(participants?.length || 0) === 0}
                size="lg"
                className=" rounded-full bg-gradient-to-r from-primary to-secondary"
              >
                <Play className="mr-1 h-5 w-5" />
                Start Quiz
              </Button>
            </div>
          )}

          {session?.status === 'active' && !session?.show_leaderboard && currentQuestion && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-5 duration-500">

              <div className="flex justify-between items-center mt-2">
                <h2 className="text-xl font-bold dark:text-white">
                  Question {session.current_question_index + 1} of {questions?.length}
                </h2>
                <div className={`flex items-center gap-2 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-warning'}`}>
                  <Clock className="h-5 w-5" />
                  <span className="sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold">{timeLeft}s</span>
                </div>
              </div>

              <Progress.Root
                value={progressPercent}
                colorPalette={timeLeft <= 5 ? "orange" : "gray"}
                size="sm"
                css={{
                  '& [data-part="track"]': {
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    backgroundColor: 'light-dark(rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.1))'
                  },
                  '& [data-part="range"]': {
                    borderRadius: '9999px',
                    background: (() => {
                      if (!currentQuestion) return 'light-dark(rgba(161, 161, 170, 0.8), rgba(255, 255, 255, 0.7))';

                      // Calculate time thresholds as percentages
                      const timeLimit = currentQuestion.time_limit;
                      const tenSecPercent = (10 / timeLimit) * 100;
                      const fiveSecPercent = (5 / timeLimit) * 100;
                      const fourPointSevenFiveSecPercent = (4.75 / timeLimit) * 100;

                      // Three-stage color transition
                      // Light mode: zinc-400 (lighter gray) → butter yellow → softer orange
                      // Dark mode: white (70% opacity) → butter yellow → softer orange
                      if (progressPercent > tenSecPercent) {
                        // Stage 1: zinc-400 (light) or white 70% (dark)
                        return `linear-gradient(90deg, 
                          light-dark(rgba(161, 161, 170, 0.8), rgba(255, 255, 255, 0.7)) 0%, 
                          light-dark(rgba(161, 161, 170, 0.8), rgba(255, 255, 255, 0.7)) 50%,
                          light-dark(rgba(161, 161, 170, 0.8), rgba(255, 255, 255, 0.7)) 100%)`;
                      } else if (progressPercent > fiveSecPercent) {
                        // Stage 2: Blend to butter yellow (10s to 5s)
                        const yellowBlend = ((tenSecPercent - progressPercent) / (tenSecPercent - fiveSecPercent)) * 100;
                        return `linear-gradient(90deg, 
                          color-mix(in srgb, rgb(255, 223, 128) ${yellowBlend}%, light-dark(rgba(161, 161, 170, 0.8), rgba(255, 255, 255, 0.7))) 0%, 
                          color-mix(in srgb, rgb(255, 215, 100) ${yellowBlend}%, light-dark(rgba(161, 161, 170, 0.8), rgba(255, 255, 255, 0.7))) 50%,
                          color-mix(in srgb, rgb(255, 207, 80) ${yellowBlend}%, light-dark(rgba(161, 161, 170, 0.8), rgba(255, 255, 255, 0.7))) 100%)`;
                      } else if (progressPercent > fourPointSevenFiveSecPercent) {
                        // Stage 3: Quick blend from butter yellow to softer orange (5s to 4.75s)
                        const orangeBlend = ((fiveSecPercent - progressPercent) / (fiveSecPercent - fourPointSevenFiveSecPercent)) * 100;
                        return `linear-gradient(90deg, 
                          color-mix(in srgb, rgba(251, 146, 60, 0.85) ${orangeBlend}%, rgb(255, 223, 128)) 0%, 
                          color-mix(in srgb, rgba(249, 115, 22, 0.85) ${orangeBlend}%, rgb(255, 215, 100)) 50%,
                          color-mix(in srgb, rgba(234, 88, 12, 0.85) ${orangeBlend}%, rgb(255, 207, 80)) 100%)`;
                      } else {
                        // Stage 4: Softer orange (< 4.75s)
                        return `linear-gradient(90deg, 
                          rgba(251, 146, 60, 0.85) 0%, 
                          rgba(249, 115, 22, 0.85) 50%,
                          rgba(234, 88, 12, 0.85) 100%)`;
                      }
                    })(),
                    transition: 'width 0.1s linear',
                    willChange: 'width, background',
                    boxShadow: timeLeft <= 5
                      ? `0 0 ${10 + (5 - timeLeft) * 2}px rgba(249, 115, 22, ${0.2 + (5 - timeLeft) * 0.04})`
                      : 'light-dark(0 0 5px rgba(161, 161, 170, 0.25), 0 0 5px rgba(255, 255, 255, 0.15))'
                  }
                }}
              >
                <Progress.Track>
                  <Progress.Range />
                </Progress.Track>
              </Progress.Root>

              <div className="p-4 bg-muted rounded-lg">
                <p className="sm:text-2xl md:text-2xl lg:text-2xl xl:text-2xl font-semibold mb-4 dark:text-zinc-300">{currentQuestion.question_text}</p>
                {currentQuestion.question_image_url && (
                  <img
                    src={currentQuestion.question_image_url}
                    alt="Question"
                    className="w-full max-h-96 object-contain rounded-lg"
                  />
                )}
              </div>

              <div className="flex flex-col lg:flex-row gap-1 justify-end mb-2 ">
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
                  className="px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base md:px-5 md:py-3 md:text-lg rounded-full text-gray-800 bg-primary"
                >
                  Reveal Answer
                </Button>
                <Button
                  disabled={timeLeft > 0}
                  onClick={handleShowLeaderboardClick}
                  size="sm"
                  variant="ghost"
                  className="px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base md:px-5 md:py-3 md:text-lg rounded-full text-gray-500"
                >
                  Show Leaderboard
                </Button>

              </div>

              <div className="grid grid-cols-1 gap-4 dark:text-zinc-300">
                {options.map(({ key: option, text: optionText }) => {
                  const colors = {
                    default: 'gray-600 border-gray-300 '
                  } as Record<string, string>;

                  const isCorrect = session?.reveal_answer && currentQuestion?.correct_answer === option;

                  return (
                    <div
                      key={option}
                      className={`p-2 sm:p-3 md:p-4   rounded-xl bg-muted flex items-center justify-start gap-4 transition-all duration-200 ${isCorrect ? 'ring-4 ring-success/50 bg-success/10 border-success scale-105' : ''}`}
                    >
                      <span className="w-10 h-10 rounded-full p-1 bg-gray-200 dark:bg-black text-muted-foreground text-base sm:text-lg md:text-xl font-bold text-center">{option}</span>
                      <span className="text-base sm:text-lg md:text-xl">{optionText}</span>
                    </div>
                  );
                })}
              </div>
              <Button
                onClick={nextQuestion}
                size="sm"
                className=" display:center px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base md:px-5 md:py-3 md:text-lg rounded-full"
              >
                Next
                <SkipForward className="h-4 w-4" />
              </Button>
            </div>
          )}

          {session?.status === 'active' && session?.show_leaderboard && (
            <div className="text-center py-4 animate-in fade-in slide-in-from-left-5 duration-500">

              <Trophy className="h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 mx-auto mb-4 text-warning" />
              <h2 className="text-xl sm:text-xl md:text-2xl lg:text-2xl xl:text-3xl font-bold mb-6 dark:text-zinc-100">Leaderboard</h2>
              <div className="flex justify-between gap-1 sm:gap-2 mb-2">
                  <Button
                    onClick={endQuiz}
                    size="sm"
                    variant="ghost"
                    className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm md:px-4 md:py-2 md:text-base rounded-full hover:bg-muted/70 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-white/70 opacity-70"
                  >
                    End Quiz
                  </Button>
                  <Button
                    onClick={nextQuestion}
                    size="sm"
                    variant="ghost"
                    className="px-2 py-1 text-xs sm:px-3 sm:py-1.5 sm:text-sm md:px-4 md:py-2 md:text-base rounded-full hover:bg-muted/50 hover:text-orange-300 opacity-70"
                  >
                    Next
                  </Button>
                </div>

              <div className="space-y-3 mb-8 dark:text-zinc-300">
                {participants?.map((p, i) => (
                  <div
                    key={p._id}
                    className={`flex justify-between items-center p-2 sm:p-3 md:p-4 rounded-lg ${i === 0 ? 'bg-amber-300/10 dark:bg-warning/15 border border-amber-400 dark:border-warning' :
                      i === 1 ? 'bg-slate-300/15 dark:bg-slate-600/15 border border-slate-300 dark:border-slate-600' :
                        i === 2 ? 'bg-warning/15 dark:bg-amber-700/10 border border-warning dark:border-amber-700' :
                          'bg-muted/50'
                      }`}
                  >
                    <div className="flex items-center gap-5 text-base sm:text-lg md:text-xl">
                      <span className="ml-2 font-bold">{i + 1}</span>
                      <span className="font-semibold text-sm sm:text-m md:text-lg lg:text-xl xl:text-xl ">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-orange-300">{p.score}</span>
                      <span className="text-sm text-muted-foreground text-right w-12 sm:w-14 md:w-16">{(p as any).total_time ? `${(p as any).total_time.toFixed(1)}s` : '-'}</span>
                    </div>
                  </div>
                ))}
              </div>


            </div>
          )}

          {session?.status === 'finished' && (
            <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-700">

              <DotLottieReact src="https://ik.imagekit.io/devsoc/Quizora/public/Trophy.lottie?updatedAt=1764162087115" autoplay
                className="h-32 w-32 sm:h-32 sm:w-32 md:h-32 md:w-32 lg:h-40 lg:w-40 mx-auto" />
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-bold mb-8 dark:text-zinc-300">Final Leaderboard!</h2>

              <div className="space-y-3 mb-8">
                {participants?.map((p, i) => (
                  <div
                    key={p._id}
                    className={`flex justify-between items-center p-2 rounded-lg ${i === 0 ? 'bg-amber-300/10 dark:bg-warning/15 border border-amber-400 dark:border-warning' :
                      i === 1 ? 'bg-slate-300/15 dark:bg-slate-600/15 border border-slate-300 dark:border-slate-600' :
                        i === 2 ? 'bg-warning/15 dark:bg-amber-700/10 border border-warning dark:border-amber-700' :
                          'bg-muted'
                      }`}
                  >
                    <div className="flex items-center gap-5 dark:text-zinc-200 text-base sm:text-lg md:text-xl">
                      <span className="ml-2 font-bold">{i + 1}</span>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-8">
                      <span className="text-xl font-bold text-orange-300">{p.score}</span>
                      <span className="text-sm text-muted-foreground text-right w-12 sm:w-14 md:w-16">{(p as any).total_time ? `${(p as any).total_time.toFixed(1)}s` : '-'}</span>
                    </div>
                  </div>
                ))}
              </div>


            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default HostQuiz;
