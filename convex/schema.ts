import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
 
const schema = defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // other "users" fields...
  }).index("email", ["email"]),
  notes: defineTable({
    title: v.string(),
    content: v.string(),
    userId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),
  shared_notes: defineTable({
    noteId: v.id("notes"),
    ownerId: v.string(),
    shareCode: v.string(),
    createdAt: v.number(),
  })
    .index("by_noteId", ["noteId"])
    .index("by_shareCode", ["shareCode"]),
  messages: defineTable({
    content: v.string(),
    sender: v.union(v.literal("user"), v.literal("ai")),
    userId: v.string(),
    noteId: v.string(),
    timestamp: v.number(),
    isComplete: v.optional(v.boolean()),
  })
    .index("by_user", ["userId"])
    .index("by_note", ["noteId"])
    .index("by_user_and_note", ["userId", "noteId"]),
  conceptMaps: defineTable({
    nodes: v.array(v.object({
      id: v.string(),
      type: v.optional(v.string()),
      position: v.object({
        x: v.number(),
        y: v.number(),
      }),
      data: v.object({
        label: v.string(),
      }),
      width: v.optional(v.any()),
      height: v.optional(v.any()),
    })),
    edges: v.array(v.object({
      id: v.string(),
      source: v.string(),
      target: v.string(),
      type: v.optional(v.string()),
      label: v.optional(v.string()),
      data: v.optional(v.object({
        label: v.optional(v.string()),
      })),
      style: v.optional(v.any()),
      markerEnd: v.optional(v.any()),
      labelStyle: v.optional(v.any()),
    })),
    userId: v.string(),
    noteId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_note", ["noteId"])
    .index("by_user_and_note", ["userId", "noteId"]),
  chunks: defineTable({
    noteId: v.id("notes"),
    content: v.string(),
    index: v.number(),
  }).index("by_noteId", ["noteId"]),
  embeddings: defineTable({
    chunkId: v.id("chunks"),
    noteId: v.id("notes"),
    vector: v.array(v.number()),
    createdAt: v.number(),
  })
    .index("by_chunkId", ["chunkId"])
    .index("by_noteId", ["noteId"]),
  // New table for tests
  tests: defineTable({
    title: v.optional(v.string()),
    questions: v.array(
      v.object({
        type: v.string(), // "mcq", "shortAnswer", "trueFalse", "fillInBlank"
        question: v.string(),
        options: v.optional(v.array(v.string())), // For MCQs
        answer: v.string(),
        source: v.optional(v.string()),
      })
    ),
    userId: v.string(),
    noteId: v.id("notes"),
    createdAt: v.number(),
    settings: v.object({
      numQuestions: v.number(),
      types: v.array(v.string()),
      difficulty: v.string(),
    }),
  })
    .index("by_user", ["userId"])
    .index("by_note", ["noteId"])
    .index("by_user_and_note", ["userId", "noteId"]),
});
 
export default schema;