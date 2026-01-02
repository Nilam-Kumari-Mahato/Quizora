import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Submit a score after a relay round
export const submitScore = mutation({
  args: { points: v.number(), quizId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user) throw new Error("User not found");

    // Add score entry
    await ctx.db.insert("scores", {
      userId: user._id,
      quizId: args.quizId,
      points: args.points,
      completedAt: Date.now(),
    });

    // Update total user score
    await ctx.db.patch(user._id, {
      score: user.score + args.points
    });
  },
});

// Get the top 10 players in real-time
export const getLeaderboard = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    // Sort by score descending and take top 10
    return users.sort((a, b) => b.score - a.score).slice(0, 10);
  },
});
