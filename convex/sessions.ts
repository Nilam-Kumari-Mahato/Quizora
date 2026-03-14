import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";
// Helper function to generate a 6-character join code
const generateJoinCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const generateUniqueJoinCode = async (ctx: any) => {
  for (let i = 0; i < 10; i++) {
    const candidate = generateJoinCode();
    const exists = await ctx.db
      .query("quiz_sessions")
      .withIndex("by_join_code", (q:any) => q.eq("join_code", candidate))
      .first();
    if (!exists) {
      return candidate;
    }
  }
  throw new Error("Failed to generate unique join code.");
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
    const join_code = await generateUniqueJoinCode(ctx);

    const sessionId = await ctx.db.insert("quiz_sessions", {
      quizId: args.quizId,
      hostId: identity.subject,
      join_code,
      status: "waiting",
      current_question_index: 0,
      show_leaderboard: false,
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
// console.log("Join code:", result.join_code);

export const joinSession = mutation({
  args: { join_code: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("quiz_sessions")
      .withIndex("by_join_code", (q) => q.eq("join_code", args.join_code.replace(/\s/g, "").toUpperCase()))
      .first();

    if (!session) throw new Error("Quiz code not found.");

    if (session.status !== "waiting" && session.mode !== "mistake_mini") {
      throw new Error("This quiz has already started.");
    }

    const identity = await ctx.auth.getUserIdentity();

    const participantId = await ctx.db.insert("participants", {
      sessionId: session._id,
      name: args.name,
      score: 0,
      userId: identity?.subject,
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

    const [quiz, questions, participants] = await Promise.all([
      ctx.db.get(session.quizId),
      ctx.db
        .query("questions")
        .withIndex("by_quizId_order", (q) => q.eq("quizId", session.quizId))
        .order("asc")
        .collect(),
      ctx.db
        .query("participants")
        .withIndex("by_sessionId_score", (q) => q.eq("sessionId", args.sessionId))
        .order("desc")
        .collect(),
    ]);

    if (!quiz) return null;

    const currentQuestion = questions[session.current_question_index] || null;

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

    return { session, quiz, questions, participants: sortedParticipants, currentQuestion, answerStats };
  },
});


export const createMistakeMiniSession = mutation({
  args: {
    originalSessionId: v.id("quiz_sessions"),
    participantId: v.id("participants"),
  },

  handler: async (ctx, args) => {
    const originalSession = await ctx.db.get(args.originalSessionId);
    if (!originalSession) throw new Error("Session not found");

    // Determine the scope of questions to check for mistakes
    // let scopeQuestionIds: string[];
    let scopeQuestionIds: Id<"questions">[];
    if (originalSession.customQuestionIds) {
      // If reviewing a mini-session, only check questions from that session
      scopeQuestionIds = originalSession.customQuestionIds;
    } else {
      // If reviewing original session, check all questions in the quiz
      const allQuestions = await ctx.db
        .query("questions")
        .withIndex("by_quizId_order", (q) => q.eq("quizId", originalSession.quizId))
        .collect();
      scopeQuestionIds = allQuestions.map((q) => q._id);
    }

    const answers = await ctx.db
      .query("answers")
      .withIndex("by_participant_session", (q) =>
        q.eq("participantId", args.participantId)
         .eq("sessionId", args.originalSessionId)
      )
      .collect();

    // Identify mistakes: questions in scope that were NOT answered correctly
    const correctQuestionIds = new Set(
      answers.filter((a) => a.is_correct).map((a) => a.questionId)
    );

    const mistakeQuestionIds = scopeQuestionIds.filter(
      (qId) => !correctQuestionIds.has(qId)
    );

    if (mistakeQuestionIds.length === 0) {
      return { sessionId: null, join_code: null };
    }

    const join_code = await generateUniqueJoinCode(ctx);

    const newSessionId = await ctx.db.insert("quiz_sessions", {
      quizId: originalSession.quizId,
      hostId: originalSession.hostId,
      join_code,
      status: "active",
      mode: "mistake_mini",
      current_question_index: 0,
      show_leaderboard: false,
      customQuestionIds: mistakeQuestionIds,
      currentQuestionStartTime: Date.now(),
      // Propagate original attempt info to show score correctly in mini-mode
      originalSessionId: originalSession.originalSessionId ?? args.originalSessionId,
      originalParticipantId: originalSession.originalParticipantId ?? args.participantId,
    });

    return { sessionId: newSessionId, join_code };
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
    const participantAnswers = await ctx.db
    .query("answers")
    .withIndex("by_participant_session", (q) =>
      q.eq("participantId", args.participantId)
      .eq("sessionId", args.sessionId)
    )
    .collect();
    const participant = await ctx.db.get(args.participantId);
    if (!participant || participant.sessionId !== args.sessionId) return null;

    let originalAttemptData: { score: number } | null = null;
    if (session.mode === "mistake_mini" && session.originalParticipantId) {
      const originalParticipant = await ctx.db.get(
        session.originalParticipantId
      );
      if (originalParticipant) {
        originalAttemptData = { score: originalParticipant.score };
      }
    }

    let questions: Doc<"questions">[] = [];

      if (session.mode === "mistake_mini" && session.customQuestionIds) {
        const fetched = await Promise.all(
          session.customQuestionIds.map((id) => ctx.db.get(id))
        );

        questions = fetched.filter((q): q is Doc<"questions"> => q !== null);

      } else {

        questions = await ctx.db
          .query("questions")
          .withIndex("by_quizId_order", (q) =>
            q.eq("quizId", session.quizId)
          )
          .collect();
      }


    const currentQuestion = questions[session.current_question_index] || null;

    const allParticipants = await ctx.db
      .query("participants")
      .withIndex("by_sessionId_score", (q) => q.eq("sessionId", args.sessionId))
      .order("desc")
      .collect();

    let answerStats: Record<string, number> = {};
    let hasAnswered = false;
    let answerDoc: Doc<"answers"> | null = null;

    // Map of participantId -> score awarded for the current question (if any)
    const currentQuestionScores: Record<string, number> = {} as Record<string, number>;

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
    const participantTotalTimes: Record<string, number> = {} as Record<string, number>;
    for (const answer of allSessionAnswers) {
      const pid = answer.participantId as string;
      participantTotalTimes[pid] = (participantTotalTimes[pid] || 0) + (answer.time_taken || 0);
    }

    // For players, hide the score gained from the current question until reveal
    const visibleParticipants = allParticipants.map((p) => {
    const extra = currentQuestion ? (currentQuestionScores[p._id] || 0) : 0;

      const visibleScore =
        session.status === "finished"
          ? p.score
          : session.reveal_answer
          ? p.score
          : Math.max(0, (p.score ?? 0) - extra);

      return { ...p, score: visibleScore, total_time: participantTotalTimes[p._id] || 0 };
    });

    // Sort by score DESC, then by total_time ASC (lower time taken = faster)
    const sortedVisibleParticipants = visibleParticipants.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.total_time - b.total_time;  // Lower total time taken wins (faster)
    });

    const visibleParticipant = (() => {
      const extra = currentQuestion ? (currentQuestionScores[participant._id] || 0) : 0;

      const visibleScore =
        session.status === "finished"
          ? participant.score
          : session.reveal_answer
          ? participant.score
          : Math.max(0, (participant.score ?? 0) - extra);

      return { ...participant, score: visibleScore };
    })();

    const quiz = await ctx.db.get(session.quizId);

    // Hide correct answer from client
    const secureCurrentQuestion = currentQuestion
    ? {
      ...currentQuestion,
      correct_answer:
        session.mode === "mistake_mini"
          ? currentQuestion.correct_answer
          : session.reveal_answer
          ? currentQuestion.correct_answer
          : undefined,
    }
    : null;

    // let originalScore = participant.score;
    // if (session.mode === "mistake_mini") {
    //   const originalSession = await ctx.db.get(session.originalSessionId);
    //   if (originalSession) {
    //     const originalParticipant = await ctx.db
    //       .query("participants")
    //       .withIndex("by_sessionId_score", q => q.eq("sessionId", originalSession._id))
    //       .filter(q => q.eq(q.field("userId"), participant.userId))
    //       .first();

    //     if (originalParticipant) {
    //       originalScore = originalParticipant.score;
    //     }
    //   }
    // }
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
      totalQuestions: questions.length,
      questions,
      participantAnswers,
      originalAttemptData,
    };
  },
});
export const getMyAttempts = query({
  handler: async (ctx) => {

    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return [];
    }

    // Get all participants belonging to this user
    const participants = await ctx.db
      .query("participants")
      .withIndex("by_userId", (q) => q.eq("userId", identity.subject))
      .collect();

    // Sort by creation time to ensure we process attempts in chronological order
    participants.sort((a, b) => a._creationTime - b._creationTime);

    const attempts = [];

    for (const participant of participants) {
      const session = await ctx.db.get(participant.sessionId);
      if (!session || session.mode === "mistake_mini") continue;

      const quiz = await ctx.db.get(session.quizId);
      if (!quiz) continue;

      attempts.push({
        session,
        participant,
        quiz,
        createdAt: participant._creationTime,
      });
    }

    return attempts;
  },
})

export const advanceMiniSession = mutation({
  args: {
    sessionId: v.id("quiz_sessions"),
  },

  handler: async (ctx, args) => {

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    if (session.mode !== "mistake_mini") {
      throw new Error("Not a mini session");
    }

    const total = session.customQuestionIds?.length ?? 0;
    const nextIndex = session.current_question_index + 1;

    if (nextIndex >= total) {
      await ctx.db.patch(args.sessionId, {
        status: "finished",
      });
      return;
    }

    await ctx.db.patch(args.sessionId, {
      current_question_index: nextIndex,
    });
  }
});
export const startReviewSession = query({
  args: {
    sessionId: v.id("quiz_sessions"),
    participantId: v.id("participants"),
  },

  handler: async (ctx, args) => {

    const session = await ctx.db.get(args.sessionId);
    if (!session) throw new Error("Session not found");

    const participant = await ctx.db.get(args.participantId);
    if (!participant) throw new Error("Participant not found");

    // Fetch questions used in mini session
    const questions = await Promise.all(
      (session.customQuestionIds ?? []).map((qId) => ctx.db.get(qId))
    );

    const filteredQuestions = questions.filter(
      (q): q is Doc<"questions"> => q !== null
    );

    // Fetch answers by this participant
    const answers = await ctx.db
      .query("answers")
      .withIndex("by_participant_session", (q) =>
        q.eq("participantId", args.participantId)
         .eq("sessionId", args.sessionId)
      )
      .collect();

    const answerMap = new Map(
      answers.map((a) => [a.questionId, a])
    );

    const reviewData = filteredQuestions.map((q) => {

      const userAnswer = answerMap.get(q._id);

      return {
        question: q,
        userAnswer: userAnswer?.answer ?? null,
        correctAnswer: q.correct_answer,
        isCorrect: userAnswer?.is_correct ?? false,
      };
    });

    return {
      score: participant.score,
      totalQuestions: filteredQuestions.length,
      reviewData,
    };
  },
});