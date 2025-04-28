import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// Define the HTTP endpoint for the Ask AI chat stream - REMOVED as we use useAction now
/*
http.route({
  path: "/askAIChatStream",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    console.log("HTTP Action /askAIChatStream invoked"); 
    try {
      // Get the message body
      const body = await request.json();
      console.log("Received request body:", body); 
      const { messages } = body;
      
      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        console.error("Bad request: Invalid or empty messages array");
        return new Response("Bad request: Invalid messages array", { status: 400 });
      }
      
      // Extract the last message content as the query
      const query = messages[messages.length - 1]?.content;
      console.log("Extracted query:", query); 

      if (!query) {
        console.error("Bad request: No query content in last message");
        return new Response("Bad request: No query provided", { status: 400 });
      }

      // Call the internal action
      console.log("Calling internal action api.chat.askAIChatStream..."); 
      // This should call askAI now, but the stream logic is different
      // const streamResponse = await ctx.runAction(api.chat.askAIChatStream, { query }); 
      // Reverting to non-streaming, so this handler is no longer needed
      console.log("Internal action returned. Returning stream response.");
      // Return the stream response
      // return streamResponse;
      return new Response("Endpoint deprecated, use direct action call.", { status: 410 });
    } catch (error) {
      console.error("Error in HTTP action /askAIChatStream:", error); 
      return new Response("Internal Server Error", { status: 500 });
    }
  }),
});
*/

export default http;
