import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Id } from "../../convex/_generated/dataModel";


export default function AttemptDetails() {
   const { sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const participantId = searchParams.get("participant");

  const navigate = useNavigate();

  const data = useQuery(
    api.sessions.getPlayerSessionData,
    sessionId && participantId
      ? {
          sessionId: sessionId as Id<"quiz_sessions">,
          participantId: participantId as Id<"participants">
        }
      : "skip"
  );
  const createMistakeMiniSession = useMutation(
    api.sessions.createMistakeMiniSession
  );

  const joinSession = useMutation(api.sessions.joinSession);

  if (!sessionId || !participantId) {
    return <div className="p-6">Invalid attempt link.</div>;
  }

  if (!data || !data.questions) {
    return <div className="p-6">Loading attempt...</div>;
  }

  console.log("Params:", sessionId, participantId);
  if (data === undefined) return <div>Loading attempt...</div>;
  if (data === null) return <div>Attempt not found.</div>;

  console.log("Params:", sessionId, participantId);
  console.log("sessionId:", sessionId);
  console.log("participantId:", participantId);

  const handleRetryMistakes = async () => {
    const result = await createMistakeMiniSession({
      originalSessionId: data.session._id,
      participantId: data.participant._id,
    });

    if (!result || !result.sessionId || !result.join_code) {
      alert("All mistakes already fixed!");
      return;
    }

    const joinResult = await joinSession({
      join_code: result.join_code,
      name: data.participant.name,
    });

    navigate(
      `/play/${joinResult.sessionId}?participant=${joinResult.participantId}`
    );
  };

  const originalScore =
  data.participantAnswers?.filter((a: any) => a.is_correct)?.length || 0;
  
  const questions = (data as any).questions || [];
  const participantAnswers = (data as any).participantAnswers || [];

  console.log("og score: ",originalScore)
  return (
      // <div className="p-6 space-y-4">
      //   <h1 className="text-2xl font-bold">{data.quiz.title}</h1>

      //   <p className="text-sm text-muted-foreground">
      //     Score: {data.participant.score} / {data.totalQuestions}
      //   </p>

      //   {data.participant.score < data.totalQuestions && (
      //     <Button onClick={handleRetryMistakes}>
      //       Fix My Mistakes
      //     </Button>
      //   )}
      <div className="max-w-4xl mx-auto px-6 pt-12 space-y-8">

    {/* Title */}
    <div>
      <h1 className="text-3xl font-bold">{data.quiz.title}</h1>
      <p className="text-muted-foreground mt-1">
        Attempt Review
      </p>
    </div>

    {/* Score Summary */}
    <div className="border rounded-xl p-6 flex items-center justify-between">

      <div>
        <p className="text-sm text-muted-foreground">Original Quiz Score</p>
        <p className="text-2xl font-semibold">
          {originalScore} / {data.totalQuestions}
        </p>
      </div>

      {data.participant.score < data.totalQuestions && (
        <Button onClick={handleRetryMistakes}>
          Fix My Mistakes
        </Button>
      )}

    </div>

    {/* Placeholder for Analytics */}
    <div className="border rounded-xl p-6 bg-muted/30">
      <p className="text-sm text-muted-foreground">
        Analytics section will appear here
      </p>
    </div>
      </div>
  );
}