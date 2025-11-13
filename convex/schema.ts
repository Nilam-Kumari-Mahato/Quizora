// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server"; 

export default defineSchema({
  ...authTables, // 

  // 'quizzes' table
  quizzes: defineTable({
    creatorId: v.string(), 
    title: v.string(),
    description: v.optional(v.string()),
  }).index("by_creator", ["creatorId"]),

  // 'questions' table
  questions: defineTable({
    quizId: v.id("quizzes"), // Links to the 'quizzes' table
    question_text: v.string(),
    question_image_url: v.optional(v.string()),
    option_a: v.string(),
    option_b: v.string(),
    option_c: v.optional(v.string()),
    option_d: v.optional(v.string()),
    correct_answer: v.string(), // "A", "B", "C", or "D"
    time_limit: v.number(),
    order_number: v.number(),
  })
    .index("by_quizId_order", ["quizId", "order_number"]),

  // 'quiz_sessions' table for live rooms
  quiz_sessions: defineTable({
    quizId: v.id("quizzes"),
    hostId: v.string(), // A simple string to identify the host
    join_code: v.string(),
    status: v.union(
      v.literal("waiting"),
      v.literal("active"),
      v.literal("finished")
    ),
    current_question_index: v.number(),
    show_leaderboard: v.boolean(),
    // Optional flag to indicate that the host has revealed the correct answer
    // This is optional so existing documents without this field will still be valid
    reveal_answer: v.optional(v.boolean()),
  }).index("by_join_code", ["join_code"]), // For players joining

  // 'participants' table for players
  participants: defineTable({
    sessionId: v.id("quiz_sessions"), // Links to the live session
    name: v.string(),
    score: v.number(),
  })
    .index("by_sessionId_score", ["sessionId", "score"]), 

  // 'answers' table
  answers: defineTable({
    sessionId: v.id("quiz_sessions"),
    participantId: v.id("participants"),
    questionId: v.id("questions"),
    answer: v.string(),
    is_correct: v.boolean(),
    score: v.number(),
    time_taken: v.number(), // Time in seconds
  })
    .index("by_session_question", ["sessionId", "questionId"])
    .index("by_participant_question", ["participantId", "questionId"]),
});