import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    tokenIdentifier: v.string(),
    score: v.number(),
  }).index("by_token", ["tokenIdentifier"]),

  scores: defineTable({
    userId: v.id("users"),
    quizId: v.string(),
    points: v.number(),
    completedAt: v.number(),
  }).index("by_quiz", ["quizId"]),
  
  // Real-time Relay State
  relayState: defineTable({
    isActive: v.boolean(),
    currentQuestionIndex: v.number(),
    endTime: v.number(),
  }),
});
