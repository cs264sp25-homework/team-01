import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import OpenAI from "openai";
import { Configuration, OpenAIApi } from "openai-edge";

// Organize notes using OpenAI
export const organizeNotes = action({
  args: {
    content: v.string(),
  },
  handler: async (_, args) => {
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ConvexError({ 
        code: 500, 
        message: "OpenAI API key not configured" 
      });
    }
    
    try {
      // Initialize OpenAI client
      const openai = new OpenAI({ apiKey });
      
      // Parse the content to get the actual text and structure
      const notes = JSON.parse(args.content);
      
      // Make a standard OpenAI API call

      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { 
            role: "system", 
            content: `You are a notes organization assistant. Your task is to organize notes by:
            
            1. Creating clear headings to break up sections
            2. Organizing information into relevant bullet points
            3. Adding sub-bullets to expand on unclear points
            4. Maintaining all original formatting (bold, underline, etc.)
            5. Preserving any special styling and colors from the original
            
            EXTREMELY IMPORTANT: 
            1. You MUST return ALL content from the original notes - don't lose any information - but add infromation based on below instructions.
            2. Your response MUST be a valid JSON ARRAY (starting with [ and ending with ])
            3. Return the same structure but better organized, with all original nodes preserved
            4. Each object in the array must have all its original properties
            5. DO NOT wrap your response in markdown code blocks or any formatting
            
            The notes are structured as an array of objects with:
            - "type" property (usually "p" for paragraph)
            - "children" array with text content and formatting attributes
            - "id" property that must be preserved
            - Other properties like "indent", "listStyleType" that must be kept

            NOTE STRUCTURE REFERENCE
            below is an example of the structure of the notes passed in to you 
            [{"type":"h1","children":[{"text":"Backpropogation"},{"text":" ","bold":true,"fontSize":"21px"}],"id":"doiAiRm0Bp"},
            {"type":"p","children":[{"text":"As we saw with the example of a scalar NN, we can think of the prediction error signal as flowing backwards from the loss function towards the input layer. This is intuitive: if forward propagation sends the signal from the input to the DNN output, then backpropagation sends the signal from the output (i.e. the deepest part of the network) towards to shallow layers. This can be seen in the general form of the chain rule"}],"id":"mryOwZKgvX"},
            {"type":"p","children":[{"text":""}],"id":"TYYZ58ddOb"},
            {"children":[{"text":"Certainly! Here are the key points about the chain rule:"}],"type":"p","id":"XP_8l9Jjth"},
            {"children":[{"text":"Definition","bold":true},{"text":": The chain rule is a fundamental calculus principle used to compute the derivative of a composite function. It expresses how the derivative of a composite function relates to the derivatives of its constituent functions."}],"indent":1,"listStyleType":"decimal","type":"p","id":"KwJy2WI5-O"},
            {"children":[{"text":"Formula","bold":true},{"text":": If you have a composite function ( y = f(g(x)) ), the chain rule states that the derivative ( \\frac{dy}{dx} ) is the product of the derivative of the outer function evaluated at the inner function and the derivative of the inner function: ( \\frac{dy}{dx} = f'(g(x)) \\cdot g'(x) )."}],"indent":1,"listStyleType":"decimal","type":"p","listStart":2,"id":"Z-AlDS3Fbt"},
            {"children":[{"text":"Application in Layers","bold":true},{"text":": In deep learning, the chain rule is applied layer by layer for backpropagation, allowing the calculation of gradients of the loss function with respect to network parameters."}],"indent":1,"listStyleType":"decimal","type":"p","listStart":3,"id":"liRvM7OqFk"},{"children":[{"text":"Backward Flow","bold":true},{"text":": It facilitates the flow of error gradients backward through the network, from output to input, which is crucial for adjusting the weights during training."}],"indent":1,"listStyleType":"decimal","type":"p","listStart":4,"id":"-mLrrP7-71"},{"children":[{"text":"Recursive Process","bold":true},{"text":": The chain rule is applied recursively as you move from the output layer to the input layer, updating each weight based on the gradient computed"}],"indent":1,"listStyleType":"decimal","type":"p","listStart":5,"id":"gR4Y49nffw"},
            {"type":"p","children":[{"text":""}],"id":"test-1743726027217"},{"type":"p","children":[{"text":""}],"id":"test-1743779275158"},{"type":"p","children":[{"text":"testing last sentence in prompt openai.ts"}],"id":"test-1743779304909"},
            {"type":"p","id":"GT7ve7IUnM","children":[{"text":"Gradient Descent "}],"align":"left"},{"type":"p","id":"IfMziuEr3K","align":"left","children":[{"text":"If you try to take the derivative of the cross-entropy loss above, set it to zero, and solve for w, you will find that you cannot isolate w to one side of the equation, meaning that the optimization problem has no 'closed-form' solution. Instead we need to find a numerical solution that will only approximate the true optimum. We will use a procedure known as 'gradient descent', a.k.a. 'steepest descent'. The intuition is that we'll start with an initial guess at the value of w and slowly walk down the loss surface, following the direction of steepest descent according to the derivative at our current point. For a generic function 12 ϕ(z) that we wish to minimize, we can apply gradient descent by iterating the gradient descent equatoin"}]},{"type":"p","id":"JVTE4Qltup","align":"left","children":[{"text":"Why is gradient descent useful?"}]},{"type":"p","id":"6Ii_utsjBT","align":"left","children":[{"text":"optimization "}],"indent":1,"listStyleType":"disc"},
            {"type":"p","id":"cLz6RH1qEU","align":"left","indent":1,"listStyleType":"disc","children":[{"text":"scalability "}],"listStart":2},{"type":"p","id":"SmjNjpoBkL","align":"left","indent":1,"listStyleType":"disc","listStart":3,"children":[{"text":"iterative improvement "}]},
            {"type":"p","id":"-tSEqK2DkS","align":"left","indent":1,"listStyleType":"disc","listStart":4,"children":[{"text":"flexibility "}]},
            {"type":"p","id":"7MyPW1DgO0","align":"left","children":[{"text":""}]},
            {"type":"p","id":"NgetQluXTh","align":"left","children":[{"text":"Stochastic Gradient Descent SGD"}]},
            {"type":"p","id":"0bXp3TP2So","align":"left","children":[{"text":"helps make it more efficient"}],"indent":1,"listStyleType":"disc"},{"type":"p","id":"ybbIJsOMFG","align":"left","indent":1,"listStyleType":"disc","children":[{"text":"Instead of training on full batches use mini batches "}],"listStart":2},
            {"type":"p","id":"i3hQrKjIuK","align":"left","children":[{"text":""}]},{"type":"p","id":"dMh10JcxUs","align":"left","children":[{"text":""}]},{"type":"p","id":"Cd6-UsCMDh","children":[{"text":""}]}]
            ABOVE IS JUST FOR YOUR UNDERSTANDING 

            Note, in general their are types which consist of <p> for paragraph ,<h1> for heading 1, <h2> for heading 2, <h3> for heading 3, <h4> for heading 4, <h5> for heading 5, <h6> for heading 6. 
            There are also Lists which consist of <ul> for unordered list and <ol> for ordered list. and <li> for list items.
            you can set the text to bold, underlined, italic or update the font size. "bold":true,"fontSize":"21px" "underline":true "italic":true



            Steps to follow:
                1. read and understand all of the notes passed into you. 
                2. If you see a few similar sentences grouped together, add a relevent heading tag above. 
                3. if you see a list or bulleted list of items expand on the sentences by adding sub-bullets.
                    for example if you see a bulleted list which can be recognized because of the "indent":1,"listStyleType":"disc" property, expand on the sentences by adding sub-bullets.
                    below is an example of a bulleted list:
                    {"type":"p","id":"6Ii_utsjBT","align":"left","children":[{"text":"optimization "}],"indent":1,"listStyleType":"disc"},
                    {"type":"p","id":"cLz6RH1qEU","align":"left","indent":1,"listStyleType":"disc","children":[{"text":"scalability "}],"listStart":2},
                    {"type":"p","id":"SmjNjpoBkL","align":"left","indent":1,"listStyleType":"disc","listStart":3,"children":[{"text":"iterative improvement "}]},{"type":"p","id":"-tSEqK2DkS","align":"left","indent":1,"listStyleType":"disc","listStart":4,"children":[{"text":"flexibility "}]},{"type":"p","id":"7MyPW1DgO0","align":"left","children":[{"text":""}]} 

                    example of a bulleted list with sub-bullets:
                    {"type":"p","id":"6Ii_utsjBT","align":"left","children":[{"text":"optimization"}],"indent":1,"listStyleType":"disc"},
                    {"type":"p","id":"0NQjCPLdmn","align":"left","indent":2,"listStyleType":"disc","children":[{"text":"Gradient descent helps find the minimum of a loss function, which corresponds to the optimal parameters for a model. By minimizing the loss, the model's predictions become more accurate."}]},
                    {"type":"p","id":"cLz6RH1qEU","align":"left","indent":1,"listStyleType":"disc","children":[{"text":"scalability "}],"listStart":2},
                    {"type":"p","id":"jxOf4WbPMi","align":"left","indent":2,"listStyleType":"disc","children":[{"text":"gradient descent is efficient and scalable for large datasets and complex models, making it suitable for deep learning applicationa where datasets can be large and models have milions of paramaters"}]},
                    {"type":"p","id":"SmjNjpoBkL","align":"left","indent":1,"listStyleType":"disc","listStart":3,"children":[{"text":"iterative improvement "}]},
                    {"type":"p","id":"OYjaidQxJ5","align":"left","indent":2,"listStyleType":"disc","children":[{"text":"it provides a system way to iteratively improve the models weights"}]},
                    {"type":"p","id":"-tSEqK2DkS","align":"left","indent":1,"listStyleType":"disc","listStart":4,"children":[{"text":"flexibility "}]},
                    {"type":"p","id":"4AHkKqtaP-","align":"left","indent":2,"listStyleType":"disc","children":[{"text":"their are various forms such as batch, stochastic and mini batch which offer flexibility in terms of computational complexity"}]}
                    Notice how you can define the elements of the list with an indent and listStart. sub bullets have a higher indent no list start.

                    When you see a list, add proper sub-bullets based on the context of the entire note focusing more on immediate context.
                 
                4. if you see a list of items that are not related to the current section, add a new heading tag above.
                5. if you see a long paragraph on a topic insert a list below with the key points of the paragraph. 
                6. If you see any sections that seem vague or lack proper explanation, indented underneath add context/explanation. 

                MAKE SURE TO RETURN A NEW AND IMPROVED VERSION OF THE NOTES
            
            NEVER RETURN A SINGLE OBJECT - ALWAYS RETURN AN ARRAY OF OBJECTS
            DO NOT include markdown like \`\`\`json or \`\`\` - just output the raw JSON array
            `
          },
          { 
            role: "user", 
            content: `Please organize these notes while preserving their complete format and all content:
            ${JSON.stringify(notes, null, 2)}`
          }
        ],
        temperature: 0.2,
        max_tokens: 4000
      });

      console.log("Completion.....:", completion);
      
      // Get the response content
      let organizedContent = completion.choices[0].message.content?.trim() || "[]";
      console.log("Original response:", organizedContent);
      
      // Strip markdown code blocks if present
      if (organizedContent.startsWith("```")) {
        // Extract content between code blocks
        const codeBlockMatch = organizedContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          organizedContent = codeBlockMatch[1].trim();
          console.log("Extracted content from code block:", organizedContent);
        } else {
          // If regex didn't work, try a simpler approach
          organizedContent = organizedContent
            .replace(/^```json\s*/, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
          console.log("Stripped code block markers:", organizedContent);
        }
      }
      
      // Check if the response starts and ends with array brackets
      if (!organizedContent.startsWith('[') || !organizedContent.endsWith(']')) {
        console.error("Response is not a JSON array after cleanup:", organizedContent);
        throw new ConvexError({
          code: 500,
          message: "Response from AI is not a JSON array.",
        });
      }
      
      // Validate the response is proper JSON
      try {
        const parsed = JSON.parse(organizedContent);
        if (!Array.isArray(parsed)) {
          throw new Error("Parsed result is not an array");
        }
        
        // Make sure we have at least some content
        if (parsed.length === 0) {
          throw new Error("Empty array returned");
        }
        
        console.log("Successfully parsed array with", parsed.length, "items");
        
        // Add the test sentence to the last paragraph if not already there
        const lastItem = parsed[parsed.length - 1];
        if (lastItem && lastItem.children && lastItem.children.length > 0) {
          const lastText = lastItem.children[0].text || "";
          
          if (!lastText.includes("testing last sentence in prompt openai.ts")) {
            parsed.push({
              type: "p",
              children: [{ text: "testing last sentence in prompt openai.ts" }],
              id: "test-" + Date.now()
            });
            
            // Re-stringify with the added test paragraph
            organizedContent = JSON.stringify(parsed);
          }
        }
        
      } catch (e) {
        console.error("JSON parsing error:", e, organizedContent);
        throw new ConvexError({
          code: 500,
          message: "Invalid response from AI. Could not parse as JSON array.",
        });
      }
      
      return { organizedContent };
    } catch (error) {
      console.error("Error in organize-notes action:", error);
      
      if (error instanceof ConvexError) {
        throw error;
      }
      
      throw new ConvexError({
        code: 500,
        message: "Failed to organize notes",
      });
    }
  },
});

// Set up OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const edgeConfiguration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openaiEdge = new OpenAIApi(edgeConfiguration);

// This action completes text based on a prompt - used for the ghost text feature
export const completeText = action({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Prepare the API parameters for text completion
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo-0125",
        messages: [
          {
            role: "system",
            content: `You are an AI writing assistant that predicts and suggests the next part of text that a user might want to write. 
Your task is to continue the text naturally, completing the thought or idea.

Rules:
- Continue the text naturally with 10-30 words.
- Match the style, tone, and format of the existing text.
- Don't repeat what's already in the prompt.
- If it's a list, continue with more relevant items.
- If it's code, continue with logical next steps.
- For technical content, maintain accuracy and terminology.
- For creative writing, maintain consistent voice and style.
- Respond ONLY with the completion text. No explanations or formatting.`
          },
          {
            role: "user",
            content: `Please complete the following text naturally. Don't include any explanation, just provide the completion.

Text to complete: "${args.prompt}"`
          },
        ],
        temperature: 0.7,
        max_tokens: 100,
        top_p: 1,
      });

      // Extract the completion text
      const text = completion.choices[0]?.message?.content || "";
      console.log("Generated completion:", text.substring(0, 50) + (text.length > 50 ? "..." : ""));
      
      return { text };
    } catch (error) {
      console.error("Error completing text:", error);
      return { error: "Failed to generate completion", text: "" };
    }
  },
});


