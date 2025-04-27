import { action, internalAction, internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import OpenAI from "openai";
import { api } from "./_generated/api";
import { Configuration, OpenAIApi } from "openai-edge";
import { Id } from "./_generated/dataModel";


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


// This action completes text based on a prompt - used for the ghost text feature
export const completeText = action({
 args: {
   prompt: v.string(),
 },
 handler: async (ctx, args) => {
   try {
     // Prepare the API parameters for text completion
     const completion = await openai.chat.completions.create({
       model: "gpt-4o",
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
- For technical content, maintain accuracy and terminology.
- For creative writing, maintain consistent voice and style.
- Respond ONLY with the completion text. No explanations or formatting.`
         },
         {
           role: "user",
           content: `Please complete the following text naturally. Don't include any explanation, just provide the completion.


Text to complete: ${args.prompt}`
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


// This action processes editor AI commands (improve writing, summarize, etc.)
export const processAICommand = action({
 args: {
   prompt: v.string(),
   commandType: v.string(),
   editorContent: v.optional(v.string()),
 },
 handler: async (ctx, args) => {
   try {
     const { prompt, commandType, editorContent } = args;
    
     console.log(`Processing AI command: ${commandType}`);
     console.log(`Prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
     
     if (editorContent) {
       console.log(`Editor content length: ${editorContent.length} chars`);
     }
    
     // Build the system prompt based on the command type
     let systemPrompt = getSystemPromptForCommand(commandType);
    
     // Parse editor content if available
     let processedEditorContent = "";
     let originalFormat = null;
     let isSelectedContent = false;
     
     if (editorContent) {
       try {
         // Parse the JSON structure of the editor content
         originalFormat = JSON.parse(editorContent);
         
         // Determine if this is a selection (array of nodes) or full editor content
         isSelectedContent = Array.isArray(originalFormat) && 
                           originalFormat.length > 0 && 
                           originalFormat[0].type !== undefined;
         
         // Make sure we're working with an array of nodes either way
         const contentNodes = isSelectedContent ? originalFormat : originalFormat;
                           
         // Extract the actual text content from the editor structure
         processedEditorContent = extractTextFromEditorContent(contentNodes);
         console.log(`Processed editor content length: ${processedEditorContent.length} chars`);
         console.log(`Is selected content: ${isSelectedContent}`);
       } catch (error) {
         console.error("Error parsing editor content:", error);
         processedEditorContent = editorContent;
       }
     }
     
     // Get additional context if needed
     const userPrompt = processedEditorContent
       ? `${processedEditorContent}\n\n${prompt}`
       : prompt;
    
     // Modify system prompt to emphasize we're working on a selected portion if applicable
     if (isSelectedContent) {
       systemPrompt = `${systemPrompt}\n\nYou are working ONLY on a selected portion of the document, not the entire document. Focus only on this selected text.`;
     }
    
     // Call OpenAI
     const completion = await openai.chat.completions.create({
       model: "gpt-4o",
       messages: [
         {
           role: "system",
           content: systemPrompt
         },
         {
           role: "user",
           content: userPrompt
         }
       ],
       temperature: 0.7,
       max_tokens: 1000,
     });
    
     // Extract the AI response
     const responseText = completion.choices[0]?.message?.content || "";
     console.log(`AI Command (${commandType}) response length: ${responseText.length} chars`);
     console.log(`Response preview: ${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}`);
     
     // Return the plain text response
     return { text: responseText };
   } catch (error) {
     console.error("Error processing AI command:", error);
     return {
       error: "Failed to process AI command",
       text: "Sorry, there was an error processing your request. Please try again."
     };
   }
 },
});


// Helper function to extract text from editor content
function extractTextFromEditorContent(content: any[]): string {
  if (!Array.isArray(content)) {
    // If it's not an array, try to convert it to a string
    try {
      return typeof content === 'string' ? content : JSON.stringify(content);
    } catch (e) {
      return "";
    }
  }
  
  // Process the array of nodes
  return content.map(node => {
    // Skip empty nodes
    if (!node) return "";
    
    // Handle nodes with children property (typical Plate node structure)
    if (node.children && Array.isArray(node.children)) {
      return node.children
        .map((child: any) => {
          // Handle child nodes based on their structure
          if (typeof child === 'object') {
            return child.text !== undefined ? child.text : '';
          } else if (typeof child === 'string') {
            return child;
          }
          return '';
        })
        .join("");
    }
    
    // Handle simple text nodes or unknown structures
    if (typeof node === 'string') {
      return node;
    } else if (node.text) {
      return node.text;
    }
    
    return "";
  }).join("\n");
}

// Helper to get the appropriate system prompt based on command type
function getSystemPromptForCommand(commandType: string): string {
 switch (commandType) {
   case 'improveWriting':
     return `You are an expert writing assistant. Your task is to improve the given text by:
       1. Enhancing clarity and flow
       2. Using more precise and engaging language
       3. Fixing any grammatical or spelling errors
       4. Maintaining the original meaning and tone
      
       Respond only with the improved version of the text. Don't include explanations.`;
      
   case 'summarize':
     return `You are an expert summarization assistant. Your task is to create a concise summary of the given text by:
       1. Identifying the main points and key arguments
       2. Reducing the length while preserving essential information
       3. Creating a coherent, readable summary
       4. Maintaining the original tone and perspective
      
       Respond only with the summary. Don't include explanations.`;
      
   case 'makeShorter':
     return `You are an expert editing assistant. Your task is to make the given text shorter by:
       1. Removing redundancies and unnecessary details
       2. Using more concise phrasing
       3. Focusing on the most important information
       4. Maintaining the original meaning and tone
      
       Respond only with the shortened version. Don't include explanations.`;
      
   case 'makeLonger':
     return `You are an expert writing assistant. Your task is to expand the given text by:
       1. Adding relevant details and context
       2. Elaborating on key points
       3. Including examples or explanations where appropriate
       4. Maintaining the original style and tone
      
       Respond only with the expanded version. Don't include explanations.`;
      
   case 'fixSpelling':
     return `You are an expert proofreader. Your task is to fix spelling and grammar in the given text by:
       1. Correcting any spelling errors
       2. Fixing grammatical mistakes
       3. Improving punctuation where needed
       4. Maintaining the original meaning and style
      
       Respond only with the corrected version. Don't include explanations.`;
      
   case 'continueWrite':
     return `You are an expert writing assistant. Your task is to continue the given text by:
       1. Maintaining the same style, tone, and voice
       2. Providing a natural continuation of the current thought or topic
       3. Adding relevant and meaningful content
       4. Ensuring a smooth transition from the original text
      
       Respond only with the continuation. Don't include explanations.`;
      
   default:
     return `You are an expert writing assistant. Your task is to improve the given text while maintaining its original meaning and style. Respond only with the improved version.`;
 }
}




// Generate concept map from note content
export const generateConceptMap = action({
  args: {
    content: v.string(),
    noteId: v.string(),
  },
  handler: async (ctx, args) => {
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
      
      // Parse the content to get the actual text
      const notes = JSON.parse(args.content);
      
      // Extract text content from the notes structure
      const textContent = notes.map((note: any) => {
        // Get the text from each child
        if (note.children) {
          return note.children.map((child: any) => child.text || "").join("");
        }
        return "";
      }).join("\n");

      // Generate concept map with OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a concept map generator. Analyze the provided notes and create a hierarchical concept map structure.
            Extract key concepts and their relationships, organizing them in a clear, hierarchical network structure.
            
            Your output should be a valid JSON object with the following structure:
            {
              "nodes": [
                {
                  "id": "unique_id_1",
                  "type": "default",
                  "data": { "label": "Concept 1" },
                  "position": { "x": 0, "y": 0 }
                },
                ...
              ],
              "edges": [
                {
                  "id": "unique_edge_id_1",
                  "source": "unique_id_1",
                  "target": "unique_id_2",
                  "label": "relationship"
                },
                ...
              ]
            }
            
            Concept Map Structure Rules:
            1. Create a clear HIERARCHICAL structure:
               - Main concept at the top center
               - Sub-concepts branch out below in a tree-like structure
               - Maximum of 3 levels deep
               - Avoid horizontal connections at the same level when possible
            
            2. Node Limits and Selection:
               - Include 5-7 nodes total (not counting the main concept)
               - Focus on the most important concepts only
               - Combine similar concepts
               - Ensure each node adds unique value
               - Limit to maximum 3 nodes per level
               - Keep node labels short (maximum 20 characters if possible)
            
            3. Node Positioning and Spacing:
               - Canvas dimensions: 1200px wide (x: 0 to 1200) × 600px high (y: 0 to 600)
               - Main concept: centered at (600, 50)
               
               - Level 1 nodes (y = 200):
                 * For 1 node: x = 600
                 * For 2 nodes: x = 300, 900
                 * For 3 nodes: x = 200, 600, 1000
               
               - Level 2 nodes (y = 400):
                 * Position relative to parent with minimum 400px horizontal spacing
                 * Left child: parent.x - 400
                 * Right child: parent.x + 400
                 * If single child: parent.x
               
               - Spacing Rules:
                 * Minimum 400px horizontal spacing between ANY two nodes at the same level
                 * For nodes with labels > 15 characters, increase horizontal spacing to 500px
                 * 200px minimum vertical spacing between levels
                 * When positioning nodes, account for label length:
                   - Short labels (<= 15 chars): normal spacing
                   - Medium labels (16-25 chars): add 100px to spacing
                   - Long labels (>25 chars): add 200px to spacing
            
            4. Edge Guidelines:
               - Use clear, concise relationship labels (2-3 words maximum)
               - Relationships should flow from general to specific
               - Use consistent relationship types:
                 * "consists of", "includes", "contains" for part-whole
                 * "leads to", "results in" for cause-effect
                 * "influences", "affects" for relationships
                 * "requires", "needs" for dependencies
            
            5. Layout Balance:
               - Center the entire concept map around x = 600
               - Ensure symmetrical distribution when possible
               - If nodes have long labels:
                 * Stagger their vertical positions slightly (±50px)
                 * Increase horizontal spacing between them
               - For adjacent nodes with long labels, offset one slightly lower
                 than the other to prevent overlap
            
            6. Node Placement Strategy:
               - Start with the widest spacing possible within the canvas
               - When placing nodes at the same level:
                 * Calculate approximate label width (characters × 10px)
                 * Add 100px padding between nodes
                 * Adjust positions to prevent any potential overlap
               - If two nodes would be closer than 400px, offset one vertically
                 by 50px down
            
            7. Special Cases:
               - For nodes with labels > 25 characters:
                 * Consider breaking into two lines using " - " or ": "
                 * If breaking is not possible, ensure extra spacing
               - When multiple long-label nodes are on the same level:
                 * Alternate their y-positions slightly (±30px)
                 * Increase horizontal spacing between them by 100px
            
            Do not include any explanation or text outside the JSON structure.
            Make sure the output is valid JSON that can be parsed.
            `
          },
          {
            role: "user",
            content: `Generate a concept map from these notes: ${textContent}`
          }
        ],
        temperature: 0.2,
        max_tokens: 2000
      });

      // Get the response content
      let conceptMapContent = completion.choices[0].message.content?.trim() || "{}";
      
      // Strip markdown code blocks if present
      if (conceptMapContent.startsWith("```")) {
        // Extract content between code blocks
        const codeBlockMatch = conceptMapContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (codeBlockMatch && codeBlockMatch[1]) {
          conceptMapContent = codeBlockMatch[1].trim();
        } else {
          // If regex didn't work, try a simpler approach
          conceptMapContent = conceptMapContent
            .replace(/^```json\s*/, '')
            .replace(/^```\s*/, '')
            .replace(/\s*```$/, '')
            .trim();
        }
      }
      
      // Validate the response is proper JSON
      try {
        const parsed = JSON.parse(conceptMapContent);
        if (!parsed.nodes || !Array.isArray(parsed.nodes) || !parsed.edges || !Array.isArray(parsed.edges)) {
          throw new Error("Invalid concept map structure");
        }
        
        // Make sure we have at least some content
        if (parsed.nodes.length === 0) {
          throw new Error("No nodes returned in concept map");
        }
        
        // Store the concept map in the database
        await ctx.runMutation(api.conceptMap.storeConceptMap, {
          nodes: parsed.nodes,
          edges: parsed.edges,
          noteId: args.noteId as Id<"notes">,
        });
        
        return { conceptMap: parsed };
      } catch (e) {
        console.error("JSON parsing error:", e, conceptMapContent);
        throw new ConvexError({
          code: 500,
          message: "Invalid response from AI. Could not parse concept map data.",
        });
      }
    } catch (error) {
      console.error("Error in generate-concept-map action:", error);
      
      if (error instanceof ConvexError) {
        throw error;
      }
      
      throw new ConvexError({
        code: 500,
        message: "Failed to generate concept map",
      });
    }
  },
});



