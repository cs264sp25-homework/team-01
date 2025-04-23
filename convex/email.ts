"use node";
import { action } from "./_generated/server";
import { v } from "convex/values";
import sgMail from "@sendgrid/mail";

// Define the interfaces for both success and fallback results
export interface EmailResult {
  success: boolean;
  message: string;
}

export interface DirectEmailResult extends EmailResult {
  messageId: string;
}

export interface FallbackEmailResult extends EmailResult {
  fallbackMode: boolean;
  mailtoUrl: string;
}

// Action to temporarily set a sender email for testing
export const setSenderEmail = action({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args): Promise<{ success: boolean; message: string }> => {
    try {
      // Store in global space for this deployment
      (globalThis as any).__TEMP_SENDER_EMAIL = args.email;
      console.log("Temporary sender email set to:", args.email);
      return { 
        success: true, 
        message: `Sender email temporarily set to ${args.email}` 
      };
    } catch (error) {
      console.error("Failed to set sender email:", error);
      throw new Error("Failed to set sender email");
    }
  },
});

// Uses sendgrid to send the email with the attachment
export const sendWithAttachment = action({
  args: {
    recipientEmail: v.string(),
    subject: v.string(),
    message: v.string(),
    attachmentName: v.string(),
    attachmentData: v.string(), // Base64 data
    contentType: v.string()
  },
  handler: async (ctx, args): Promise<DirectEmailResult | FallbackEmailResult> => {
    try {
      const SENDGRID_API_KEY = process.env.NOTESAI_EMAIL_API_KEY || process.env.SENDGRID_API_KEY;
      
      // Sender email address
      const TEMP_SENDER_EMAIL = (globalThis as any).__TEMP_SENDER_EMAIL;
      const SENDER_EMAIL = TEMP_SENDER_EMAIL || process.env.SENDER_EMAIL;
      
      // Check if we have the required configuration
      if (!SENDGRID_API_KEY) {
        console.warn("SendGrid API key not configured. Falling back to mailto URL.");
        return createMailtoFallback(args);
      }
      
      if (!SENDER_EMAIL) {
        console.warn("Sender email not configured. Falling back to mailto URL.");
        return createMailtoFallback(args);
      }
      
      // Set the API key for SendGrid
      sgMail.setApiKey(SENDGRID_API_KEY);
      
      // Create the email message with added diagnostics
      const msg = {
        to: args.recipientEmail,
        from: SENDER_EMAIL, // Must be a verified sender
        subject: args.subject,
        text: `${args.message}\n\nShared from Study Notes App`,
        attachments: [
          {
            content: args.attachmentData,
            filename: args.attachmentName,
            type: args.contentType,
            disposition: "attachment"
          }
        ]
      };
      
      console.log("Attempting to send email via SendGrid...");
      console.log("Using sender:", SENDER_EMAIL);
      console.log("Recipient:", args.recipientEmail);
      console.log("API key length:", SENDGRID_API_KEY.length);
      console.log("Subject:", msg.subject);
      console.log("Attachment filename:", args.attachmentName);
      console.log("Attachment size (base64):", args.attachmentData.length);
      
      try {
        // Send the email
        const result = await sgMail.send(msg);
        console.log("Email sent successfully:", result);
        
        if (Array.isArray(result) && result.length > 0 && result[0].statusCode) {
          console.log("SendGrid response status code:", result[0].statusCode);
        }
        
        if (Array.isArray(result) && result.length > 0 && result[0].headers) {
          console.log("SendGrid message ID:", result[0].headers['x-message-id']);
        }
        
        return { 
          success: true, 
          messageId: `email-${Date.now()}`,
          message: "Email sent successfully with PDF attachment. If you don't see it, please check your spam folder." 
        };
      } catch (sendError) {
        console.error("SendGrid sending error:", sendError);
        
        // Extract SendGrid error details if available
        const sgError = sendError as any;
        if (sgError.response && sgError.response.body) {
          console.error("SendGrid API error details:", JSON.stringify(sgError.response.body, null, 2));
          
          // Check for common errors
          if (sgError.code === 403 || (sgError.response && sgError.response.statusCode === 403)) {
            console.log("Authentication error - sender may not be verified. Falling back to mailto.");
            return createMailtoFallback(args);
          }
        }
        
        throw sendError; // Re-throw to be caught by outer catch
      }
      
    } catch (error) {
      console.error("Email sharing error:", error);
      
      // Fall back to mailto URL as last resort
      try {
        return createMailtoFallback(args);
      } catch (fallbackError) {
        console.error("Even mailto fallback failed:", fallbackError);
        throw new Error("Failed to prepare email by any method. Please try again later.");
      }
    }
  },
});

// Helper function to create a mailto fallback when SendGrid fails
function createMailtoFallback(args: {
  recipientEmail: string;
  subject: string;
  message: string;
  attachmentName: string;
}): FallbackEmailResult {
  const mailtoSubject = encodeURIComponent(args.subject);
  const mailtoBody = encodeURIComponent(
    `${args.message}\n\n---\nNote: This email was meant to include a PDF attachment, but automatic sending failed. Please ask the sender to share the PDF with you separately.`
  );
  
  return {
    success: true,
    fallbackMode: true,
    mailtoUrl: `mailto:${args.recipientEmail}?subject=${mailtoSubject}&body=${mailtoBody}`,
    message: "Could not send automatically. Opening your email client instead."
  };
} 