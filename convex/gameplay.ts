// convex/gameplay.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";
// import { getAuthUserId } from "@convex-dev/auth/server"; // <-- REMOVED

// Helper function to check if the user is the host (AUTH REMOVED)
const checkHost = async (ctx: any, sessionId: any) => {
  const session = await ctx.db.get(sessionId);
  if (!session) {
    throw new Error("Session not found.");
  }
  // Auth check removed. Any user can perform host actions.
  return session;
};

// --- Host Actions (Secured) ---

// Admin: Starts the quiz
export const startQuiz = mutation({
  args: { 
    sessionId: v.id("quiz_sessions"),
    // hostId removed from args
  },
  handler: async (ctx, args) => {
    await checkHost(ctx, args.sessionId); // Security check (now just checks for session existence)
    await ctx.db.patch(args.sessionId, { status: "active" });
  },
});

// Admin: Shows the leaderboard for the current question
export const showLeaderboard = mutation({
  args: { 
    sessionId: v.id("quiz_sessions"),
    // hostId removed from args
  },
  handler: async (ctx, args) => {
    await checkHost(ctx, args.sessionId); // Security check (now just checks for session existence)
    await ctx.db.patch(args.sessionId, { show_leaderboard: true });
  },
});

// Admin: Moves to the next question or finishes the quiz
export const nextQuestion = mutation({
  args: { 
    sessionId: v.id("quiz_sessions"),
    // hostId removed from args
  },
  handler: async (ctx, args) => {
    const session = await checkHost(ctx, args.sessionId); // Security check (now just checks for session existence)
    
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quizId_order", (q) => q.eq("quizId", session.quizId))
      .order("asc")
      .collect();
    
    const nextIndex = session.current_question_index + 1;

    if (nextIndex >= questions.length) {
      // End of quiz
      await ctx.db.patch(args.sessionId, { status: "finished" });
    } else {
      // Move to next question
      await ctx.db.patch(args.sessionId, {
        current_question_index: nextIndex,
        show_leaderboard: false,
        // Reset any revealed-answer flag when moving to the next question
        reveal_answer: false,
      });
    }
  },
});

// Admin: Reveal or hide the correct answer independently
export const setRevealAnswer = mutation({
  args: {
    sessionId: v.id("quiz_sessions"),
    reveal: v.boolean(),
  },
  handler: async (ctx, args) => {
    await checkHost(ctx, args.sessionId);
    await ctx.db.patch(args.sessionId, { reveal_answer: args.reveal });
  },
});


// --- Player Action (Public) ---

// Player: Submits an answer for a question
export const submitAnswer = mutation({
  args: {
    participantId: v.id("participants"),
    questionId: v.id("questions"),
    sessionId: v.id("quiz_sessions"),
    answer: v.string(), // "A", "B", "C", or "D"
    time_taken: v.number(), // Time elapsed in seconds
  },
  handler: async (ctx, args) => {
    const { participantId, questionId, sessionId, answer, time_taken } = args;

    // 1. Check if already answered
    const existingAnswer = await ctx.db
      .query("answers")
      .withIndex("by_participant_question", (q) =>
        q.eq("participantId", participantId).eq("questionId", questionId)
      )
      .first();

    if (existingAnswer) {
      return; // Already answered
    }

    // 2. Get question details to check answer and score
    const question = await ctx.db.get(questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    const is_correct = question.correct_answer === answer;
    let score = 0;

    // 3. Calculate score
    if (is_correct) {
      score = 1;
    } else {
      score = 0;
    }

    // 4. Save the answer
    await ctx.db.insert("answers", {
      sessionId,
      participantId,
      questionId,
      answer,
      is_correct,
      score,
      time_taken,
    });

    // 5. Update the participant's total score
    const participant = await ctx.db.get(participantId);
    if (participant) {
      await ctx.db.patch(participantId, {
        score: participant.score + score,
      });
    }
  },
});