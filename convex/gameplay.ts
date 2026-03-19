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

    if (session.total_questions === 0) {
      throw new Error("No questions found for this quiz.");
    }

    // O(1) via index — fetch only the first question by order
    const firstQuestion = await ctx.db
      .query("questions")
      .withIndex("by_quizId_order", (q) =>
        q.eq("quizId", session.quizId).eq("order_number", 0)
      )
      .first();

    if (!firstQuestion) {
      throw new Error("No questions found for this quiz.");
    }

    const startTime = Date.now();
    const endTime = startTime + firstQuestion.time_limit * 1000;

    await ctx.db.patch(args.sessionId, {
      status: "active",
      current_question_id: firstQuestion._id,
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

    // O(1) — use cached total_questions instead of querying the questions table
    if (session.current_question_index === session.total_questions - 1) {
      // Last question → finish the quiz
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

    const nextIndex = session.current_question_index + 1;

    // O(1) — compare against cached total_questions
    if (session.current_question_index === session.total_questions - 1) {
      // Already on the last question → finish
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
      // O(1) via composite index — fetch only the next question
      const nextQ = await ctx.db
        .query("questions")
        .withIndex("by_quizId_order", (q) =>
          q.eq("quizId", session.quizId).eq("order_number", nextIndex)
        )
        .first();

      if (!nextQ) {
        throw new Error("Next question not found.");
      }

      const startTime = Date.now();
      const endTime = startTime + nextQ.time_limit * 1000;

      await ctx.db.patch(args.sessionId, {
        current_question_index: nextIndex,
        current_question_id: nextQ._id,
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