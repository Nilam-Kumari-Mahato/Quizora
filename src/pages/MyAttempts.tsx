import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export default function MyAttempts() {
  const navigate = useNavigate();
  const attempts = useQuery(api.sessions.getMyAttempts);

  if (!attempts) return <div className="p-6">Loading...</div>;

  // Filter to keep only the first attempt per quiz (original attempt)
  const uniqueAttemptsMap = new Map();
  for (const attempt of attempts) {
    if (!uniqueAttemptsMap.has(attempt.quiz._id)) {
      uniqueAttemptsMap.set(attempt.quiz._id, attempt);
    }
  }
  const uniqueAttempts = Array.from(uniqueAttemptsMap.values());
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">My Attempts</h1>

      {uniqueAttempts.length === 0 && (
        <p>No attempts yet.</p>
      )}

      {uniqueAttempts.map((a: any) => (
        <Card
          key={a.participant._id}
          className="p-4 flex justify-between items-center"
        >
          <div>
            <h2 className="font-semibold text-lg">
              {a.quiz.title}
            </h2>

            <p className="text-sm text-muted-foreground">
              Score: {a.participant.score}
            </p>

            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(a.createdAt))} ago
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() =>
              navigate(
                `/attempt/${a.session._id}?participant=${a.participant._id}`
              )
            }
          >
            View
          </Button>
        </Card>
      ))}
    </div>
  );
}
