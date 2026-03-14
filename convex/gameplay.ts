// convex/gameplay.ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

const GRACE_PERIOD_MS = 5000;

const checkHost = async (ctx: any, sessionId: any) => {
  const [session, identity] = await Promise.all([
    ctx.db.get(sessionId),
    ctx.auth.getUserIdentity(),
  ]);

  if (!session) throw new Error("Session not found.");
  if (session.hostId !== identity?.subject) {
    throw new Error("You are not authorized to perform this action.");
  }
  return session;
};


export const startQuiz = mutation({
  args: {
    sessionId: v.id("quiz_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await checkHost(ctx, args.sessionId);

    const firstQuestion = await ctx.db
      .query("questions")
      .withIndex("by_quizId_order", (q) => q.eq("quizId", session.quizId))
      .order("asc")
      .first();

    if (!firstQuestion) {
      throw new Error("No questions found for this quiz.");
    }

    const timeLimitMs = firstQuestion.time_limit * 1000;
    const startTime = Date.now();
    const endTime = startTime + timeLimitMs;

    await ctx.db.patch(args.sessionId, {
      status: "active",
      currentQuestionStartTime: startTime,
      currentQuestionEndTime: endTime,
    });
  },
});

export const showLeaderboard = mutation({
  args: {
    sessionId: v.id("quiz_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await checkHost(ctx, args.sessionId);

    // Get all questions to check if this is the last one
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quizId_order", (q) => q.eq("quizId", session.quizId))
      .order("asc")
      .collect();

    // If we're on the last question, go directly to finished state
    if (session.current_question_index === questions.length - 1) {
      await ctx.db.patch(args.sessionId, {
        status: "finished",
        show_leaderboard: false,
        currentQuestionStartTime: undefined,
        currentQuestionEndTime: undefined,
      });
    } else {
      // Otherwise, show intermediate leaderboard
      await ctx.db.patch(args.sessionId, { show_leaderboard: true });
    }
  },
});

export const nextQuestion = mutation({
  args: {
    sessionId: v.id("quiz_sessions"),
  },
  handler: async (ctx, args) => {
    const session = await checkHost(ctx, args.sessionId);

    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quizId_order", (q) => q.eq("quizId", session.quizId))
      .order("asc")
      .collect();

    const nextIndex = session.current_question_index + 1;

    // If we're currently on the last question, go directly to finished state
    if (session.current_question_index === questions.length - 1) {
      await ctx.db.patch(args.sessionId, {
        status: "finished",
        show_leaderboard: false,
        currentQuestionStartTime: undefined,
        currentQuestionEndTime: undefined,
      });
    } else if (nextIndex >= questions.length) {
      await ctx.db.patch(args.sessionId, {
        status: "finished",
        currentQuestionStartTime: undefined,
        currentQuestionEndTime: undefined,
      });
    } else {
      const nextQuestion = questions[nextIndex];
      const timeLimitMs = nextQuestion.time_limit * 1000;
      const startTime = Date.now();
      const endTime = startTime + timeLimitMs;

      await ctx.db.patch(args.sessionId, {
        current_question_index: nextIndex,
        show_leaderboard: false,
        reveal_answer: false,
        currentQuestionStartTime: startTime,
        currentQuestionEndTime: endTime,
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

// Admin: End the quiz prematurely
export const endQuiz = mutation({
  args: {
    sessionId: v.id("quiz_sessions"),
  },
  handler: async (ctx, args) => {
    await checkHost(ctx, args.sessionId);
    await ctx.db.patch(args.sessionId, {
      status: "finished",
      show_leaderboard: false,
      ended_early: true,
      currentQuestionStartTime: undefined,
      currentQuestionEndTime: undefined,
    });
  },
});



// Player: Submits an answer for a question
export const submitAnswer = mutation({
  args: {
    participantId: v.id("participants"),
    questionId: v.id("questions"),
    sessionId: v.id("quiz_sessions"),
    answer: v.string(),
    time_taken: v.number(),
    client_timestamp: v.number(),
  },

  handler: async (ctx, args) => {
    const { participantId, questionId, sessionId, answer, time_taken } = args;

    const participant = await ctx.db.get(participantId);
    if (!participant) throw new Error("Participant not found");

    const question = await ctx.db.get(questionId);
    if (!question) throw new Error("Question not found");

    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("Session not found");

    const isMiniMode = session.mode === "mistake_mini";

   const existingAnswer = await ctx.db
    .query("answers")
    .withIndex("by_participant_session", (q) =>
      q.eq("participantId", participantId)
      .eq("sessionId", sessionId)
    )
    .filter((q) => q.eq(q.field("questionId"), questionId))
    .first();

    if (existingAnswer) {
      return { success: false };
    }

    const is_correct = question.correct_answer === answer;
    const score = is_correct ? 1 : 0;

    await ctx.db.insert("answers", {
      sessionId,
      participantId,
      questionId,
      answer,
      is_correct,
      score,
      time_taken,
    });

    if (score > 0) {
      await ctx.db.patch(participantId, {
        score: participant.score + score,
      });
    }

    return { success: true };
  },
});