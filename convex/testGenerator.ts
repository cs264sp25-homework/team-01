import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const generateTest = action({
  args: {
    noteId: v.id("notes"),
    options: v.object({
      numQuestions: v.number(),
      types: v.array(v.string()),
      difficulty: v.string(),
    }),
  },
  handler: async (ctx, args): Promise<any> => {
    // Get the note content
    const note: any = await ctx.runQuery(api.notes.get, { id: args.noteId });
    if (!note) {
      throw new Error("Note not found");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not found");
    }

    try {
      const systemPrompt = `You are a test question generator. Your task is to create a test based on the provided notes.
            
      Generate ${args.options.numQuestions} questions of the following types: ${args.options.types.join(", ")}.
      The difficulty level should be: ${args.options.difficulty}.
      
      For each question:
      1. If it's a multiple-choice question (mcq), provide 4 options and indicate the correct answer.
      2. If it's a short answer question, provide the expected answer.
      3. If it's a true/false question, indicate whether the statement is true or false.
      4. If it's a fill-in-the-blank question (fillInBlank), provide a sentence with a blank and the word that should fill the blank.
      
      Additionally, for each question, include a "source" field that contains a direct quote from the notes (10-30 words) that the question is based on. This will help users locate where the information came from.
      
      Return your response as a JSON object with the following structure:
      {
        "questions": [
          {
            "type": "mcq",
            "question": "Question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "answer": "Option A",
            "source": "Direct quote from notes that contains the answer"
          },
          {
            "type": "shortAnswer",
            "question": "Question text",
            "answer": "Expected answer",
            "source": "Direct quote from notes that contains the answer"
          },
          {
            "type": "trueFalse",
            "question": "Statement",
            "answer": "True" or "False",
            "source": "Direct quote from notes that contains the answer"
          },
          {
            "type": "fillInBlank",
            "question": "Sentence with _____ to fill in.",
            "answer": "word",
            "source": "Direct quote from notes that contains the answer"
          }
        ]
      }
      
      Ensure all questions are directly based on the content of the notes.
      Do not include any explanations or additional text outside the JSON structure.
      IMPORTANT: Return only raw JSON with no markdown formatting. Do not wrap your output in triple-backticks.`;

      const result = await generateText({
        model: openai("gpt-4o"),
        messages: [
          {
            role: "user",
            content: `Generate a test based on these notes:\n\n${note.content}`,
          }
        ],
        temperature: 0.7,
        system: systemPrompt
      });

      try {
        // Parse the JSON response
        const testContent = JSON.parse(result.text);
        return testContent;
      } catch {
        // If direct parsing fails, try to extract the JSON object
        try {
          const jsonMatch: RegExpMatchArray | null = result.text.match(/(\{[\s\S]*\})/);
          if (jsonMatch && jsonMatch[1]) {
            const extractedJson: string = jsonMatch[1];
            return JSON.parse(extractedJson);
          }
        } catch {
          // Extraction attempt also failed
        }
        
        console.error("Failed to parse JSON response:", result);
        throw new Error("Invalid response format from OpenAI");
      }
    } catch (error) {
      console.error("Error generating test:", error);
      throw new Error(`Failed to generate test: ${error}`);
    }
  },
}); 