// src/pages/PlayQuiz.tsx
import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Clock, Trophy, Loader2, ArrowLeft } from "lucide-react";
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Progress } from "@chakra-ui/react";
import { useAuth } from "@clerk/clerk-react";

const PlayQuiz = () => {
  const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const participantId = searchParams.get('participant');
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isSignedIn } = useAuth();

  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const sessionData = useQuery(
    api.sessions.getPlayerSessionData,
    sessionId && participantId
      ? {
        sessionId: sessionId as Id<"quiz_sessions">,
        participantId: participantId as Id<"participants">
      }
      : "skip"
  );

  const submitAnswerMutation = useMutation(api.gameplay.submitAnswer);

  const session = sessionData?.session;
  const quiz = sessionData?.quiz;
  const participant = sessionData?.participant;
  const allParticipants = sessionData?.allParticipants;
  const currentQuestion = sessionData?.currentQuestion;
  const answerStats = sessionData?.answerStats;
  const totalQuestions = sessionData?.totalQuestions;

  const hasAnswered = (sessionData as any)?.hasAnswered ?? false;
  const submittedAnswer = (sessionData as any)?.submittedAnswer ?? null;

  const [timeLeft, setTimeLeft] = useState(30);
  const [progressPercent, setProgressPercent] = useState(100);
  const [timeUpNotified, setTimeUpNotified] = useState(false);

  useEffect(() => {
    setSelectedAnswer(null);
    setTimeUpNotified(false);
  }, [currentQuestion?._id]);
  useEffect(() => {

    if (hasAnswered && submittedAnswer) {
      setSelectedAnswer(submittedAnswer);
    }
  }, [hasAnswered, submittedAnswer]);

  useEffect(() => {
    if (!session) {
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

        if (remainingSeconds === 0 && !hasAnswered && !timeUpNotified) {
          toast({ title: "Time's up!", description: "Waiting for next question." });
          setTimeUpNotified(true);
        }
      };

      updateTimer();
      const timer = setInterval(updateTimer, 100);
      return () => clearInterval(timer);

    } else if (session.status === 'waiting' && currentQuestion) {
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


  const handleOptionSelect = (option: string) => {
    if (hasAnswered || timeLeft === 0) return;
    setSelectedAnswer(option);
  };

  const submitAnswer = async () => {
    if (hasAnswered || !selectedAnswer || !currentQuestion || !sessionId || !participantId) return;

    // Validate session data before submission
    if (!session?.currentQuestionStartTime) {
      toast({
        title: "Error",
        description: "Unable to submit answer. Please try again.",
        variant: "destructive"
      });
      return;
    }

    // Capture the exact moment of submission
    const client_timestamp = Date.now();

    const time_taken = (client_timestamp - session.currentQuestionStartTime) / 1000;

    try {
      const result = await submitAnswerMutation({
        participantId: participantId as Id<"participants">,
        questionId: currentQuestion._id,
        sessionId: sessionId as Id<"quiz_sessions">,
        answer: selectedAnswer,
        time_taken: time_taken,
        client_timestamp: client_timestamp,
      });

      if (result?.success) {
        toast({ title: "Answer submitted!" });
      } else if (result?.reason === "already_answered") {
        toast({
          title: "Already Answered",
          description: "You've already submitted an answer for this question",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  // Handle loading state
  if (sessionData === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  // Handle not found or invalid participant
  if (sessionData === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-4xl font-bold mb-4">Session Not Found</h1>
        <p className="text-muted-foreground mb-4">
          This quiz session may have ended, or the link is invalid.
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

  const playerRankIndex = allParticipants?.findIndex(p => p._id === participantId);
  const playerRank = playerRankIndex !== undefined && playerRankIndex !== -1 ? playerRankIndex + 1 : null;

  const getOrdinal = (n: number) => {
    const s = ["th", "st", "nd", "rd"];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };

  const rankText = playerRank ? getOrdinal(playerRank) : "-";
  const lastTimeText = (sessionData as any)?.lastTimeTaken ? `${(sessionData as any).lastTimeTaken.toFixed(1)}s` : "-";

  const currentParticipant = allParticipants?.find(p => p._id === participantId);
  const totalVotingTime = (currentParticipant as any)?.total_time ? `${(currentParticipant as any).total_time.toFixed(1)}s` : "-";

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-200/30 via-zinc-200/80 to-zinc-200/80 dark:bg-gradient-to-b dark:from-black/80 dark:via-black/80 dark:to-black/80 pt-4 pb-4 ">
      <div className="container max-w-md sm:max-w-2xl md:max-w-2xl lg:max-w-3xl xl:max-w-4xl mt-12">
        <Card className="px-3 sm:px-4 md:px-5 lg:px-6 py-1.5 sm:py-2 md:py-2.5 lg:py-3 mb-6">
          <div className="flex justify-between items-center gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 dark:text-white/80 truncate">{quiz?.title}</h1>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              {session?.status === 'finished' && (
                <Button
                  variant="ghost"
                  onClick={() => navigate(isSignedIn ? '/dashboard' : '/')}
                  className="px-3 py-2 text-sm sm:px-4 sm:py-2 sm:text-base md:px-5 md:py-3 md:text-sm rounded-full hover:bg-muted/50 hover:text-orange-300 opacity-70"
                >
                  <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Back to Home</span>
                  <span className="sm:hidden">Home</span>
                </Button>
              )}
              <div className="text-right flex-shrink-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Your Score</p>
                <p className="text-lg sm:text-xl md:text-2xl font-bold text-secondary">{participant?.score || 0}</p>
              </div>
            </div>
          </div>
        </Card>

        {session.status === 'waiting' && (
          <Card className="p-12 text-center animate-in fade-in zoom-in-95 duration-500">
            <h2 className="text-3xl font-bold mb-4 dark:text-zinc-300">Get Ready!</h2>
            <p className="text-xl text-muted-foreground">
              Waiting for the host to start the quiz...
            </p>
          </Card>
        )}

        {session.status === 'active' && !session.show_leaderboard && currentQuestion && (
          <Card className="p-4 bg-card border-border rounded-3xl animate-in fade-in slide-in-from-right-5 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-semibold text-muted-foreground">Question {session.current_question_index + 1} of {totalQuestions}</h3>
              <div className={`flex items-center gap-2 ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-secondary'}`}>
                <Clock className="h-4 w-4" />
                <span className="text-xl font-bold">{timeLeft}s</span>
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
                    if (!currentQuestion?.time_limit) return 'light-dark(rgba(161, 161, 170, 0.8), rgba(255, 255, 255, 0.7))';

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

            <div className="mt-4 mb-6">
              <p className="text-xl font-bold mb-4 bg-muted p-2 rounded-lg">{currentQuestion.question_text}</p>
              {currentQuestion.question_image_url && (
                <img
                  src={currentQuestion.question_image_url}
                  alt="Question"
                  className="w-full max-h-48 object-contain rounded-2xl"
                />
              )}
            </div>

            <div className="space-y-2 mb-5 text-base sm:text-lg md:text-xl">
              {['A', 'B', 'C', 'D'].map(option => {
                const optionText = currentQuestion[`option_${option.toLowerCase()}`];
                if (!optionText) return null;

                const isSelected = selectedAnswer === option;
                // Stats are only shown when the user has answered and leaderboard is on
                const showStats = hasAnswered && session.show_leaderboard;
                const percentage = 0;
                // Determine if this option is the correct one to highlight when host reveals
                const isCorrect = !!currentQuestion?.correct_answer && session?.reveal_answer && currentQuestion.correct_answer === option;

                return (
                  <div
                    key={option}
                    onClick={() => handleOptionSelect(option)}
                    className={`relative p-2  rounded-xl border-2 transition-all dark:text-zinc-300 ${(hasAnswered || timeLeft === 0)
                      ? 'cursor-default'
                      : 'cursor-pointer hover:border-primary/50'
                      } ${isSelected && !(hasAnswered || timeLeft === 0)
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card/50'
                      } ${hasAnswered && isSelected
                        ? 'border-primary bg-orange-300/10'
                        : ''
                      } 
                    ${isCorrect ? 'ring-4 ring-success/50 bg-success/10 border-success scale-105' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                        {option}
                      </div>
                      <span className="text-base font-medium flex-1">{optionText}</span>
                      {showStats && (
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">{answerStats?.[option] || 0} votes</div>
                          <div className="text-base font-bold text-primary">{percentage}%</div>
                        </div>
                      )}
                    </div>
                    {showStats && (
                      <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!hasAnswered ? (
              <div className="flex justify-center">
                <Button
                  onClick={submitAnswer}
                  disabled={!selectedAnswer || timeLeft === 0}
                  size="lg"
                  className="w-56 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full"
                >
                  Submit Answer
                </Button>
              </div>
            ) : (
              <p className="text-center text-base font-semibold text-secondary">
                <Loader2 className="inline-block mr-2 h-4 w-4 animate-spin" />
                Answer submitted! Waiting for the host...
              </p>
            )}
          </Card>
        )}

        {session.status === 'active' && session.show_leaderboard && (
          <Card className="p-4 text-center animate-in fade-in slide-in-from-left-5 duration-500">
            <Trophy className="h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20  mx-auto mb-4 text-warning" />
            <h2 className="text-xl sm:text-xl md:text-2xl lg:text-2xl xl:text-3xl  font-bold mb-8 dark:text-zinc-200">Current Standings</h2>
            <div className="mb-8">
              <h4 className="text-lg sm:text-lg md:text-xl lg:text-xl xl:text-xl dark:text-white/90 font-semibold">Your Position - {rankText}</h4>
              <p className="text-sm dark:text-white/70">Correct answers: {participant?.score || 0}</p>
              <p className="text-sm dark:text-white/70">Total voting time: {totalVotingTime}</p>
            </div>
            <div className="space-y-3">
              {allParticipants?.map((p, i) => (
                <div
                  key={p._id}
                  className={`flex justify-between items-center p-2 rounded-lg ${p._id === participantId && i > 2 ? 'bg-gradient-to-r from-zinc-200/40 via-zinc-300/40 to-zinc-200/40 dark:from-zinc-700/40 dark:via-zinc-600/40 dark:to-zinc-700/40 border-4 border-zinc-400 dark:border-zinc-600' :
                    p._id === participantId ? 'bg-primary/20 border-2 border-primary' :
                      i === 0 ? 'bg-amber-300/10 dark:bg-warning/15 border border-amber-400 dark:border-warning' :
                        i === 1 ? 'bg-slate-300/15 dark:bg-slate-600/15 border border-slate-300 dark:border-slate-600' :
                          i === 2 ? 'bg-warning/15 dark:bg-amber-700/10 border border-warning dark:border-amber-700' :
                            'bg-muted'
                    }`}
                >
                  <div className="flex items-center gap-5 dark:text-zinc-200 text-base sm:text-lg md:text-xl">
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
            <p className="text-center text-muted mt-8 text-zinc-600">Waiting for host to start the next question...</p>
          </Card>
        )}

        {session.status === 'finished' && (
          <Card className="px-5 py-8 text-center animate-in fade-in zoom-in-95 duration-700">
            {session.ended_early ? (
              // Quiz ended early by host
              <>
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-bold mb-4 dark:text-zinc-300">
                  Host has ended the Quiz
                </h2>
                <p className="text-muted-foreground mb-6">
                  The quiz was ended early by the host.
                </p>
                <Button
                  variant="ghost"
                  onClick={() => navigate(isSignedIn ? '/dashboard' : '/')}
                  className="hover:bg-gradient-to-r from-primary to-secondary mb-6 rounded-full text-zinc-500"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
              </>
            ) : (
              // Quiz completed normally
              <>
                <DotLottieReact src="https://ik.imagekit.io/devsoc/Quizora/public/Trophy.lottie?updatedAt=1764162087115" autoplay
                  className="h-32 w-32 sm:h-32 sm:w-32 md:h-32 md:w-32 lg:h-40 lg:w-40  mx-auto" />
                <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl  font-bold mb-2 dark:text-zinc-300">Final Leaderboard!</h2>
                <div className="my-5">
                  <h4 className="text-xl font-semibold dark:text-white/90">You finished {rankText}!</h4>
                  <p className="text-sm dark:text-white/70">Correct answers: {participant?.score || 0}</p>
                  <p className="text-sm dark:text-white/70">Total voting time: {totalVotingTime}</p>
                </div>
                <div className="space-y-3 dark:text-zinc-200">
                  {allParticipants?.map((p, i) => (
                    <div
                      key={p._id}
                      className={`flex justify-between items-center p-2 rounded-lg ${p._id === participantId && i > 2 ? 'bg-gradient-to-r from-zinc-200/40 via-zinc-300/40 to-zinc-200/40 dark:from-zinc-700/40 dark:via-zinc-600/40 dark:to-zinc-700/40 border-4 border-zinc-400 dark:border-zinc-600' :
                        p._id === participantId ? 'bg-primary/20 border-2 border-primary' :
                          i === 0 ? 'bg-amber-300/10 dark:bg-warning/15 border border-amber-400 dark:border-warning' :
                            i === 1 ? 'bg-slate-300/15 dark:bg-slate-600/15 border border-slate-300 dark:border-slate-600' :
                              i === 2 ? 'bg-warning/15 dark:bg-amber-700/10 border border-warning dark:border-amber-700' :
                                'bg-muted'
                        }`}
                    >
                      <div className="flex items-center gap-5 text-base sm:text-lg md:text-xl">
                        <span className="ml-2 font-bold">{i + 1}</span>
                        <span className="font-semibold">{p.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-orange-300">{p.score}</span>
                        <span className="text-sm text-muted-foreground text-right w-12 sm:w-14 md:w-16">{(p as any).total_time ? `${(p as any).total_time.toFixed(1)}s` : '-'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

          </Card>
        )}
      </div>
    </div >
  );
};

export default PlayQuiz;
