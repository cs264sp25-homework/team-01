import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { Id } from "./_generated/dataModel";

// Define a return type for the test generator
type TestContent = {
  questions: Array<{
    type: string;
    question: string;
    options?: string[];
    answer: string;
    source?: string;
  }>;
  settings?: {
    numQuestions: number;
    types: string[];
    difficulty: string;
  };
  title?: string;
};

// Define a type for the note
type Note = {
  title: string;
  content: string;
  userId: string;
  _id: Id<"notes">;
  createdAt: number;
  updatedAt: number;
};

export const generateTest = action({
  args: {
    noteId: v.id("notes"),
    options: v.object({
      numQuestions: v.number(),
      types: v.array(v.string()),
      difficulty: v.string(),
    }),
  },
  handler: async (ctx, args): Promise<TestContent> => {
    // Get the authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Get the note content
    const note = await ctx.runQuery(api.notes.get, { id: args.noteId }) as Note;
    if (!note) {
      throw new Error("Note not found");
    }
    
    // Verify the note belongs to the user
    if (note.userId !== userId) {
      throw new Error("Access denied");
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not found");
    }

    try {
      const systemPrompt = `You are a test question generator. Your task is to create a test based on the provided notes.
            
Generate ${args.options.numQuestions} questions using ONLY the following question types: ${args.options.types.join(", ")}.
The difficulty level should be: ${args.options.difficulty}.
      
For each question:
1. If it's a multiple-choice question (mcq), provide 4 options and indicate the correct answer.
2. If it's a short answer question (shortAnswer), provide the expected answer.
3. If it's a true/false question (trueFalse), indicate whether the statement is true or false.
4. If it's a fill-in-the-blank question (fillInBlank), provide a sentence with a blank and the word that should fill the blank.
      
IMPORTANT: 
- Only generate questions of the types specified in the types array. Do not generate any other types of questions.
- The question type must exactly match one of the provided types (mcq, shortAnswer, trueFalse, or fillInBlank).
- If a type is not in the provided list, do not generate questions of that type.
      
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

      const userPrompt = `Generate test questions based on the following notes:
      
      Title: ${note.title}
      
      Content:
      ${note.content}`;

      const response = await generateText({
        model: openai("gpt-4o"),
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.7,
        maxTokens: 4000,
      });

      // Parse the response as JSON
      let generatedTest;
      try {
        // Access the text content from the response
        generatedTest = JSON.parse(response.text);
        
        // Validate that all questions are of the requested types
        const requestedTypes = new Set(args.options.types);
        generatedTest.questions = generatedTest.questions.filter((q: { type: string }) => {
          if (!requestedTypes.has(q.type)) {
            console.warn(`Filtered out question of type ${q.type} as it was not requested`);
            return false;
          }
          return true;
        });
        
        // If no valid questions remain, throw an error
        if (generatedTest.questions.length === 0) {
          throw new Error("No valid questions were generated with the requested types");
        }
      } catch (error) {
        console.error("Failed to parse AI response as JSON:", error);
        throw new Error("Failed to generate test questions");
      }

      // Return the generated test without saving
      return generatedTest;
    } catch (error) {
      console.error("Error generating test:", error);
      throw new Error("Failed to generate test questions");
    }
  },
});

// Add a new action to get a saved test
export const getSavedTest = action({
  args: {
    testId: v.id("tests"),
  },
  handler: async (ctx, args): Promise<TestContent> => {
    // Get the authenticated user
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized");
    }
    const userId = identity.tokenIdentifier.split("|")[1];
    
    // Get the test from the database
    const test = await ctx.runQuery(api.tests.get, { id: args.testId });
    if (!test) {
      throw new Error("Test not found");
    }
    
    // Verify the test belongs to the user
    if (test.userId !== userId) {
      throw new Error("Access denied");
    }
    
    return {
      questions: test.questions,
      settings: test.settings,
      title: test.title,
    };
  },
});

// Update the gradeShortAnswer action
export const gradeShortAnswer = action({
  args: {
    question: v.string(),
    answer: v.string(),
    userAnswer: v.string(),
  },
  handler: async (ctx, args): Promise<{ score: number; feedback: string }> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OpenAI API key not found");
    }

    try {
      const systemPrompt = `You are an expert grader for short answer questions. Your task is to evaluate how well a my answer matches the expected answer, considering both content and key concepts.

      For each answer:
      1. Score it as either 1 (correct) or 0 (incorrect) based on whether the key concepts and main ideas match the expected answer
      2. Provide specific feedback about what was good and what could be improved
      3. Focus on the key concepts and ideas rather than exact wording
      4. Be constructive and encouraging in your feedback

      Return your response as a JSON object with the following structure:
      {
        "score": 1 or 0,
        "feedback": "Detailed feedback about the answer"
      }

      IMPORTANT: Return only raw JSON with no markdown formatting. Do not wrap your output in triple-backticks.`;

      const userPrompt = `Question: ${args.question}
      
      Expected Answer: ${args.answer}
      
      My Answer: ${args.userAnswer}
      
      Please grade this answer and provide feedback.`;

      const response = await generateText({
        model: openai("gpt-4o"),
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.3,
        maxTokens: 1000,
      });

      // Parse the response as JSON
      let gradingResult;
      try {
        // Clean the response text to remove any markdown formatting
        const cleanResponse = response.text.replace(/```json\n?|\n?```/g, '').trim();
        gradingResult = JSON.parse(cleanResponse);
        
        // Ensure score is either 0 or 1
        gradingResult.score = gradingResult.score >= 0.5 ? 1 : 0;
      } catch (error) {
        console.error("Failed to parse AI response as JSON:", error);
        throw new Error("Failed to grade short answer");
      }

      return gradingResult;
    } catch (error) {
      console.error("Error grading short answer:", error);
      throw new Error("Failed to grade short answer");
    }
  },
}); 