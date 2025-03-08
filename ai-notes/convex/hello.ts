import { query } from "./_generated/server";
import { v } from "convex/values"

export const greet = query({
  args: {
    name: v.optional(v.string())
  }, 
  handler: async (ctx, args) => {
    return `Hello, ${args.name}!`
  }
})