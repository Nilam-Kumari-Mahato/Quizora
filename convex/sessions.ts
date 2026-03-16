import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

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
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to host a quiz.");
    }

    const [quiz] = await Promise.all([
      ctx.db.get(args.quizId),
    ]);

    if (!quiz) {
      throw new Error("Quiz not found.");
    }

    if (quiz.creatorId !== identity.subject) {
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

    // Write-side optimization: cache question count at session creation
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quizId_order", (q) => q.eq("quizId", args.quizId))
      .collect();

    const sessionId = await ctx.db.insert("quiz_sessions", {
      quizId: args.quizId,
      hostId: identity.subject,
      join_code,
      status: "waiting",
      current_question_index: 0,
      show_leaderboard: false,
      total_questions: questions.length,
    });

    return sessionId;
  },
});


export const getSessionByJoinCode = query({
  args: { join_code: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("quiz_sessions")
      .withIndex("by_join_code", (q) => q.eq("join_code", args.join_code.toUpperCase()))
      .first();

    if (!session) return null;

    return {
      _id: session._id,
      status: session.status,
      currentQuestionStartTime: session.currentQuestionStartTime ?? null,
      currentQuestionEndTime: session.currentQuestionEndTime ?? null,
    };
  },
});


export const joinSession = mutation({
  args: { join_code: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("quiz_sessions")
      .withIndex("by_join_code", (q) => q.eq("join_code", args.join_code.toUpperCase()))
      .first();

    if (!session) throw new Error("Quiz code not found.");

    if (session.status !== "waiting")
      throw new Error("This quiz has already started.");

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
    const [session, identity] = await Promise.all([
      ctx.db.get(args.sessionId),
      ctx.auth.getUserIdentity(),
    ]);

    if (!session || session.hostId !== identity?.subject) {
      return null;
    }

    const [quiz, participants] = await Promise.all([
      ctx.db.get(session.quizId),
      ctx.db
        .query("participants")
        .withIndex("by_sessionId_score", (q) => q.eq("sessionId", args.sessionId))
        .order("desc")
        .collect(),
    ]);

    if (!quiz) return null;

    // O(1) lookup via cached current_question_id
    const currentQuestion = session.current_question_id
      ? await ctx.db.get(session.current_question_id)
      : null;

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

    // Calculate total time for all participants
    const allSessionAnswers = await ctx.db
      .query("answers")
      .withIndex("by_session_question", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    const participantTotalTimes: Record<string, number> = {};
    for (const answer of allSessionAnswers) {
      const pid = answer.participantId as string;
      participantTotalTimes[pid] = (participantTotalTimes[pid] || 0) + (answer.time_taken || 0);
    }

    // Add total_time to each participant
    const participantsWithTime = participants.map((p) => ({
      ...p,
      total_time: participantTotalTimes[p._id] || 0
    }));

    // Sort by score DESC, then by total_time ASC (lower time taken = faster)
    const sortedParticipants = participantsWithTime.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.total_time - b.total_time;  // Lower total time taken wins (faster)
    });

    return { session, quiz, totalQuestions: session.total_questions, participants: sortedParticipants, currentQuestion, answerStats };
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

    // O(1) lookup via cached current_question_id
    const currentQuestion = session.current_question_id
      ? await ctx.db.get(session.current_question_id)
      : null;

    const allParticipants = await ctx.db
      .query("participants")
      .withIndex("by_sessionId_score", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();

    let answerStats: Record<string, number> = {};
    let hasAnswered = false;
    let answerDoc: Doc<"answers"> | null = null;

    // Map of participantId -> score awarded for the current question (if any)
    const currentQuestionScores: Record<string, number> = {};

    if (currentQuestion) {
      answerDoc = await ctx.db
        .query("answers")
        .withIndex("by_participant_question", (q) =>
          q.eq("participantId", args.participantId).eq("questionId", currentQuestion._id)
        )
        .first();

      hasAnswered = !!answerDoc;

      // Always fetch answers for the current question so we can mask scores for players
      const answers = await ctx.db
        .query("answers")
        .withIndex("by_session_question", (q) =>
          q.eq("sessionId", args.sessionId).eq("questionId", currentQuestion._id)
        )
        .collect();

      // Build per-option stats (used when leaderboard is shown)
      if (session.show_leaderboard) {
        answerStats = answers.reduce((acc, ans) => {
          acc[ans.answer] = (acc[ans.answer] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        for (const opt of ["A", "B", "C", "D"]) {
          if (answerStats[opt] === undefined) answerStats[opt] = 0;
        }
      }

      // Record per-participant score for the current question so we can subtract it from
      // their displayed score until the host reveals the answer.
      for (const a of answers) {
        const pid = a.participantId as string;
        currentQuestionScores[pid] = (currentQuestionScores[pid] || 0) + (a.score || 0);
      }
    }

    // Calculate total time for all participants
    // Get all answers for this session
    const allSessionAnswers = await ctx.db
      .query("answers")
      .withIndex("by_session_question", (q) => q.eq("sessionId", args.sessionId))
      .collect();

    // Group by participant and calculate total time
    const participantTotalTimes: Record<string, number> = {};
    for (const answer of allSessionAnswers) {
      const pid = answer.participantId as string;
      participantTotalTimes[pid] = (participantTotalTimes[pid] || 0) + (answer.time_taken || 0);
    }

    // For players, hide the score gained from the current question until reveal
    const visibleParticipants = allParticipants.map((p) => {
      const extra = currentQuestion ? (currentQuestionScores[p._id] || 0) : 0;
      const visibleScore = session.reveal_answer ? p.score : Math.max(0, p.score - extra);
      return { ...p, score: visibleScore, total_time: participantTotalTimes[p._id] || 0 };
    });

    // Sort by score DESC, then by total_time ASC (lower time taken = faster)
    const sortedVisibleParticipants = visibleParticipants.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.total_time - b.total_time;  // Lower total time taken wins (faster)
    });

    const visibleParticipant = (() => {
      const extra = currentQuestion ? (currentQuestionScores[participant._id] || 0) : 0;
      const visibleScore = session.reveal_answer ? participant.score : Math.max(0, participant.score - extra);
      return { ...participant, score: visibleScore };
    })();

    const quiz = await ctx.db.get(session.quizId);

    // Hide correct answer from client
    const secureCurrentQuestion = currentQuestion ? {
      ...currentQuestion,
      correct_answer: session.reveal_answer ? currentQuestion.correct_answer : undefined,
    } : null;

    return {
      session,
      quiz,
      participant: visibleParticipant,
      allParticipants: sortedVisibleParticipants,
      currentQuestion: secureCurrentQuestion,
      answerStats,
      hasAnswered,
      submittedAnswer: answerDoc?.answer || null,
      lastTimeTaken: answerDoc?.time_taken || null,
      totalQuestions: session.total_questions,
    };
  },
});