import { query } from "./_generated/server";
import { v } from "convex/values"

// Export the greet function as a Convex query
export const greet = query({
  args: {
    name: v.optional(v.string())
  }, 
  handler: async (_ctx, args) => {
    return `Hello, ${args.name ?? "world"}!`
  }
})