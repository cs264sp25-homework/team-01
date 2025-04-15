"use client";

import type { TElement, PlateEditor } from "@udecode/plate";
// Import our custom copilot plugin instead of the built-in one
import { copilotPlugins } from "./copilot-plugin";
import { serializeMdNodes, stripMarkdown } from "@udecode/plate-markdown";

import { ConvexReactClient } from "convex/react";
import { api } from "../../../convex/_generated/api";

import { GhostText } from "@/plate-ui/ghost-text";

// Initialize Convex client
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL || "");

// Debug flag for logging
const DEBUG = true;

function log(...args: any[]) {
  if (DEBUG) {
    console.log("[Copilot]", ...args);
  }
}

// Export our custom implementation
export { copilotPlugins };

// For debugging, log the Convex URL
log("Convex URL:", import.meta.env.VITE_CONVEX_URL);

// Test the OpenAI API directly
if (typeof window !== 'undefined') {
  setTimeout(async () => {
    try {
      log("Testing OpenAI API...");
      const result = await convex.action(api.openai.completeText, { 
        prompt: "This is a test prompt to check if OpenAI API is working properly." 
      });
      log("API Test Response:", result);
      
      // If the API is working, log success
      if (result && result.text) {
        log("OpenAI API is working! Sample response:", result.text);
      } else {
        log("OpenAI API request succeeded but returned no text.");
      }
    } catch (error) {
      console.error("[Copilot] Error testing OpenAI API:", error);
    }
  }, 5000);
}