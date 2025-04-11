import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

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

    // Similar to your existing organizeNotes action
    const response: Response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a test question generator. Your task is to create a test based on the provided notes.
            
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
            IMPORTANT: Return only raw JSON with no markdown formatting. Do not wrap your output in triple-backticks.`,
          },
          {
            role: "user",
            content: `Generate a test based on these notes:\n\n${note.content}`,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data: any = await response.json();
    
    // Log the raw response for debugging
    // console.log("Raw OpenAI API response:", data);
    
    let content: string = data.choices[0].message.content;
    // console.log("Content before parsing:", content);

    // Clean up the response if it contains markdown code blocks
    // Remove any markdown code block indicators (```json, ```, etc.)
    content = content.replace(/```(?:json)?\s*/g, '').replace(/\s*```/g, '').trim();
    
    // console.log("Content after cleanup:", content);

    try {
      // Replace escaped single quotes with properly escaped ones for JSON
      content = content.replace(/\\'/g, "'");
      const testContent = JSON.parse(content);
      return testContent;
    } catch (error) {
      // If direct parsing fails, try to extract the JSON object
      try {
        // Replace escaped single quotes here too
        content = content.replace(/\\'/g, "'");
        const jsonMatch: RegExpMatchArray | null = content.match(/(\{[\s\S]*\})/);
        if (jsonMatch && jsonMatch[1]) {
          const extractedJson: string = jsonMatch[1];
          // console.log("Extracted JSON:", extractedJson);
          return JSON.parse(extractedJson);
        }
      } catch (extractError) {
        // Extraction attempt also failed
      }
      
      console.error("Failed to parse JSON response:", content);
      throw new Error("Invalid response format from OpenAI");
    }
  },
}); 