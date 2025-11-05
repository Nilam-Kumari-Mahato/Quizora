import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server"; // Correct helper for Convex Auth

// Helper function to generate a 6-character join code
const generateJoinCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};


export const createSession = mutation({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    // Get the currently authenticated user's ID
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be logged in to host a quiz.");

    // Fetch the quiz and ensure the host is the creator
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz || quiz.creatorId !== userId) {
      throw new Error("You are not authorized to host this quiz.");
    }

    // Generate unique join code
    let join_code: string | undefined;
    for (let i = 0; i < 10; i++) {
      const candidate = generateJoinCode();
      const exists = await ctx.db
        .query("quiz_sessions")
        .withIndex("by_join_code", (q) => q.eq("join_code", candidate))
        .first();
      if (!exists) {
        join_code = candidate;
        break;
      }
    }

    if (!join_code) throw new Error("Failed to generate unique join code.");

    // Create the quiz session
    const sessionId = await ctx.db.insert("quiz_sessions", {
      quizId: args.quizId,
      hostId: userId,
      join_code,
      status: "waiting",
      current_question_index: 0,
      show_leaderboard: false,
    });

    return sessionId;
  },
});

// ---------------------------
// 🎮 PLAYER: Join Session (Public)
// ---------------------------
export const joinSession = mutation({
  args: { join_code: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("quiz_sessions")
      .withIndex("by_join_code", (q) => q.eq("join_code", args.join_code.toUpperCase()))
      .first();

    if (!session) throw new Error("Quiz code not found.");
    if (session.status !== "waiting")
      throw new Error("This quiz is no longer accepting new players.");

    const participantId = await ctx.db.insert("participants", {
      sessionId: session._id,
      name: args.name,
      score: 0,
    });

    return { sessionId: session._id, participantId };
  },
});


export const getHostSessionData = query({
  args: { sessionId: v.id("quiz_sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const userId = await getAuthUserId(ctx);
    if (session.hostId !== userId) return null; // Security: Only host can view

    const quiz = await ctx.db.get(session.quizId);
    if (!quiz) return null;

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quizId_order", (q) => q.eq("quizId", quiz._id))
      .order("asc")
      .collect();

    const participants = await ctx.db
      .query("participants")
      .withIndex("by_sessionId_score", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();

    const currentQuestion = questions[session.current_question_index] || null;

    // ✅ Admin analytics (answer statistics)
    let answerStats: Record<string, number> = {};
    if (session.show_leaderboard && currentQuestion) {
      const answers = await ctx.db
        .query("answers")
        .withIndex("by_session_question", (q) =>
          q.eq("sessionId", args.sessionId).eq("questionId", currentQuestion._id)
        )
        .collect();

      answerStats = answers.reduce((acc, ans) => {
        acc[ans.answer] = (acc[ans.answer] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      for (const opt of ["A", "B", "C", "D"]) {
        if (answerStats[opt] === undefined) answerStats[opt] = 0;
      }
    }

    return { session, quiz, questions, participants, currentQuestion, answerStats };
  },
});

export const getPlayerSessionData = query({
  args: {
    sessionId: v.id("quiz_sessions"),
    participantId: v.id("participants"),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) return null;

    const participant = await ctx.db.get(args.participantId);
    if (!participant || participant.sessionId !== args.sessionId) return null;

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quizId_order", (q) => q.eq("quizId", session.quizId))
      .order("asc")
      .collect();

    const currentQuestion = questions[session.current_question_index] || null;

    const allParticipants = await ctx.db
      .query("participants")
      .withIndex("by_sessionId_score", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();

    let answerStats: Record<string, number> = {};
    let hasAnswered = false;

    if (currentQuestion) {
      const answerDoc = await ctx.db
        .query("answers")
        .withIndex("by_participant_question", (q) =>
          q.eq("participantId", args.participantId).eq("questionId", currentQuestion._id)
        )
        .first();

      hasAnswered = !!answerDoc;

      if (session.show_leaderboard) {
        const answers = await ctx.db
          .query("answers")
          .withIndex("by_session_question", (q) =>
            q.eq("sessionId", args.sessionId).eq("questionId", currentQuestion._id)
          )
          .collect();

        answerStats = answers.reduce((acc, ans) => {
          acc[ans.answer] = (acc[ans.answer] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        for (const opt of ["A", "B", "C", "D"]) {
          if (answerStats[opt] === undefined) answerStats[opt] = 0;
        }
      }
    }

    return {
      session,
      participant,
      allParticipants,
      currentQuestion,
      answerStats,
      hasAnswered,
    };
  },
});
