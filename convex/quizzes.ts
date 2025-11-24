// convex/quizzes.ts
import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Admin: Create a new quiz and its questions
export const createQuiz = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    questions: v.array(
      v.object({
        question_text: v.string(),
        question_image_url: v.optional(v.string()),
        option_a: v.string(),
        option_b: v.string(),
        option_c: v.optional(v.string()),
        option_d: v.optional(v.string()),
        correct_answer: v.string(),
        time_limit: v.number(),
        order_number: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
   const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to create a quiz.");
    }
    const creatorId = identity.subject; // This is the Clerk User ID

    const quizId = await ctx.db.insert("quizzes", {
      title: args.title,
      description: args.description,
      creatorId: creatorId,
    });

    for (let i = 0; i < args.questions.length; i++) {
      const q = args.questions[i];
      await ctx.db.insert("questions", {
        quizId,
        question_text: q.question_text,
        question_image_url: q.question_image_url || undefined,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c || undefined,
        option_d: q.option_d || undefined,
        correct_answer: q.correct_answer,
        time_limit: q.time_limit,
        order_number: q.order_number,
      });
    }

    return quizId;
  },
});

// Admin: Edit an existing quiz
export const editQuiz = mutation({
  args: {
    quizId: v.id("quizzes"),
    title: v.string(),
    description: v.optional(v.string()),
    questions: v.array(
      v.object({
        question_text: v.string(),
        question_image_url: v.optional(v.string()),
        option_a: v.string(),
        option_b: v.string(),
        option_c: v.optional(v.string()),
        option_d: v.optional(v.string()),
        correct_answer: v.string(),
        time_limit: v.number(),
        order_number: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be logged in to edit a quiz.");
    }
    const creatorId = identity.subject;

    const quiz = await ctx.db.get(args.quizId);
    if (!quiz || quiz.creatorId !== creatorId) {
      throw new Error("Quiz not found or you are not authorized to edit it.");
    }

    // Update quiz details
    await ctx.db.patch(args.quizId, {
      title: args.title,
      description: args.description,
    });

    // Delete existing questions (simple strategy: replace all)
    const existingQuestions = await ctx.db
      .query("questions")
      .withIndex("by_quizId_order", (q) => q.eq("quizId", args.quizId))
      .collect();

    for (const q of existingQuestions) {
      await ctx.db.delete(q._id);
    }

    // Insert new questions
    for (const q of args.questions) {
      await ctx.db.insert("questions", {
        quizId: args.quizId,
        question_text: q.question_text,
        question_image_url: q.question_image_url || undefined,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c || undefined,
        option_d: q.option_d || undefined,
        correct_answer: q.correct_answer,
        time_limit: q.time_limit,
        order_number: q.order_number,
      });
    }

    return args.quizId;
  },
});

// Public: Get Quiz Details for the QuizDetails page
export const getQuizDetails = query({
  args: { id: v.id("quizzes") },
  handler: async (ctx, args) => {
    const quiz = await ctx.db.get(args.id);
    if (!quiz) {
      return null;
    }
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quizId_order", (q) => q.eq("quizId", args.id))
      .order("asc") 
      .collect();

    return { quiz, questions, creatorId: quiz.creatorId };
  },
});

// Get quizzes created by the currently authenticated user
export const getMyQuizzes = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const creatorId = identity.subject;

    const quizzes = await ctx.db
      .query("quizzes")
      .withIndex("by_creator", (q) => q.eq("creatorId", creatorId))
      .order("desc")
      .collect();

    // Return fields needed by the client, including creation time
    return quizzes.map((q) => ({ 
      _id: q._id, 
      title: q.title, 
      description: q.description,
      _creationTime: q._creationTime // Expose the system creation time
    }));
  },
});

// Delete a quiz and its questions. Only the creator may delete.
export const deleteQuiz = mutation({
  args: { id: v.id("quizzes") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const quiz = await ctx.db.get(args.id);
    if (!quiz) throw new Error("Quiz not found");
    if (quiz.creatorId !== identity.subject) throw new Error("Not authorized to delete this quiz");

    // Delete questions belonging to the quiz
    const questions = await ctx.db
      .query("questions")
      .withIndex("by_quizId_order", (q) => q.eq("quizId", args.id))
      .collect();

    for (const q of questions) {
      await ctx.db.delete(q._id);
    }

    // Delete the quiz
    await ctx.db.delete(args.id);

    return true;
  },
});

// Internal mutation for Cron jobs to clean up old quizzes
export const deleteOldQuizzes = internalMutation({
  handler: async (ctx) => {
    const cutoffDate = Date.now() - (90 * 24 * 60 * 60 * 1000); // 90 days ago

    // We iterate through quizzes. 
    // Note: For very large databases, this should be paginated, but fine for this scale.
    const quizzes = await ctx.db.query("quizzes").collect();

    let deletedCount = 0;
    for (const quiz of quizzes) {
      if (quiz._creationTime < cutoffDate) {
        // Delete questions first
        const questions = await ctx.db
          .query("questions")
          .withIndex("by_quizId_order", (q) => q.eq("quizId", quiz._id))
          .collect();
        
        for (const q of questions) {
          await ctx.db.delete(q._id);
        }
        // Delete quiz
        await ctx.db.delete(quiz._id);
        deletedCount++;
      }
    }
    console.log(`Cron: Deleted ${deletedCount} old quizzes.`);
  },
});
