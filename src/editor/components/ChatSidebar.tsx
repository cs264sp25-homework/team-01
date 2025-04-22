import React, { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/ui/button";
import {
  Copy,
  Edit,
  RefreshCw,
  SendIcon,
  User2,
  XIcon,
  Check,
  BotMessageSquare,
  Paperclip,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/ui/avatar";
import { cn } from "@/shared/lib/utils";
import { Textarea } from "@/ui/textarea";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type Message = {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
  isLoading?: boolean;
  error?: boolean;
  isStreaming?: boolean;
};

interface ChatSidebarProps {
  onClose: () => void;
  noteId: string;
}

// Message component for displaying individual messages
const ChatMessage = ({
  message,
  onEdit,
  onRegenerate,
}: {
  message: Message;
  onEdit: (id: string, content: string) => void;
  onRegenerate: (id: string) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [copied, setCopied] = useState(false);
  const isAi = message.sender === "ai";

  const handleSaveEdit = () => {
    if (editContent.trim()) {
      onEdit(message.id, editContent);
      setIsEditing(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    setEditContent(message.content);
  }, [message.content]);

  return (
    <div className="flex gap-3 p-2 transition-colors rounded-md group hover:bg-accent/50">
      <div className="flex-shrink-0">
        <Avatar className="w-8 h-8">
          {isAi ? (
            <AvatarFallback className="bg-primary/10">
              <BotMessageSquare className="w-4 h-4 text-primary" />
            </AvatarFallback>
          ) : (
            <AvatarFallback className="bg-secondary">
              <User2 className="w-4 h-4 text-secondary-foreground" />
            </AvatarFallback>
          )}
        </Avatar>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">
              {isAi ? "AI Assistant" : "You"}
            </span>
            <span className="text-xs text-muted-foreground">
              {message.timestamp.toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>

          <div className="flex items-center gap-1 transition-opacity opacity-0 group-hover:opacity-100">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-7 w-7", {
                "text-primary": copied,
              })}
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </Button>

            {isAi ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onRegenerate(message.id)}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            ) : !isEditing ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            ) : null}
          </div>
        </div>

        <div className="mt-1 text-sm">
          {isEditing ? (
            <div className="mt-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="resize-y min-h-[80px] w-full text-sm"
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button size="sm" variant="secondary" onClick={handleSaveEdit}>
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className={cn("whitespace-pre-wrap break-words text-left", {
                "opacity-70": message.isLoading,
              })}
            >
              {message.isLoading ? (
                <div className="flex items-center gap-2">
                  <span>Thinking...</span>
                  <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="h-2 w-2 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                </div>
              ) : message.error ? (
                <span className="text-destructive">
                  Error generating response. Please try again.
                </span>
              ) : (
                message.content
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default function ChatSidebar({ onClose, noteId }: ChatSidebarProps) {
  // Load chat history from Convex
  const chatHistory = useQuery(api.chat.getChatHistory, {
    noteId: noteId,
    limit: 100,
  });

  // Fetch the note data to provide context to the AI
  const note = useQuery(api.notes.get, { id: noteId as Id<"notes"> });

  // Track if we're currently regenerating a message to prevent re-fetching issues
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<
    string | null
  >(null);

  // Initialize messages with chat history or default welcome message
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get the Convex actions and mutations
  const streamingChatAction = useAction(api.chat.streamingChatResponse);
  const regenerateStreamingAction = useAction(
    api.chat.regenerateStreamingResponse
  );
  const deleteMessagesAfterMutation = useMutation(api.chat.deleteMessagesAfter);
  const updateMessageMutation = useMutation(api.chat.updateMessage);
  const clearChatHistoryMutation = useMutation(api.chat.clearChatHistory);

  // Move the function outside the component or use useCallback
  const getDefaultWelcomeMessage = useCallback(
    (): Message => ({
      id: "welcome",
      content: `Hi! I'm your AI assistant. I have access to your document${note?.title ? ` "${note.title}"` : ""} and can help you with questions about its content. How can I assist you?`,
      sender: "ai",
      timestamp: new Date(),
    }),
    [note?.title]
  );

  // Initialize messages with chat history when it loads
  useEffect(() => {
    // Skip updating messages if we're currently regenerating a message
    if (regeneratingMessageId) return;

    // Use the fallback inside the effect
    const history = chatHistory || [];

    if (history.length > 0) {
      setMessages(
        history.map((msg) => ({
          id: msg._id,
          content: msg.content,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp),
          isStreaming: msg.isComplete === false,
        }))
      );
    } else {
      // Set default welcome message if no history
      setMessages([getDefaultWelcomeMessage()]);
    }
  }, [chatHistory, regeneratingMessageId, getDefaultWelcomeMessage]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [inputValue]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: `temp_user_${Date.now()}`,
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    // Create a placeholder for AI response
    const aiMessageId = `temp_ai_${Date.now() + 1}`;
    const aiMessagePlaceholder: Message = {
      id: aiMessageId,
      content: "",
      sender: "ai",
      timestamp: new Date(),
      isLoading: true,
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMessage, aiMessagePlaceholder]);
    setInputValue("");

    // Call the AI service through Convex with streaming
    try {
      const response = await streamingChatAction({
        message: inputValue,
        noteId: noteId,
        noteTitle: note?.title,
        noteContent: note?.content,
      });

      // Update the AI message with the final response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                id: response.messageId,
                content: response.content,
                isLoading: false,
                isStreaming: false,
              }
            : msg
        )
      );
    } catch (error) {
      console.error("Error in streaming chat:", error);
      // Handle error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, isLoading: false, error: true, isStreaming: false }
            : msg
        )
      );
    }
  };

  const handleRegenerateMessage = async (id: string) => {
    // Find the AI message to regenerate
    const messageToRegenerate = messages.find((msg) => msg.id === id);
    if (!messageToRegenerate || messageToRegenerate.sender !== "ai") return;

    // Set regenerating flag to prevent chat history updates
    setRegeneratingMessageId(id);

    // Find the index of the message being regenerated
    const messageIndex = messages.findIndex((msg) => msg.id === id);

    // Remove all messages after this one from the UI
    if (messageIndex >= 0 && messageIndex < messages.length - 1) {
      setMessages((prev) => prev.slice(0, messageIndex + 1));
    }

    // Update the current AI message to show loading
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === id
          ? {
              ...msg,
              content: "",
              isLoading: true,
              error: false,
              isStreaming: true,
            }
          : msg
      )
    );

    try {
      // For database messages (not temporary ones), use the ID for regeneration
      if (!id.startsWith("temp_")) {
        const response = await regenerateStreamingAction({
          messageId: id as Id<"messages">,
          noteId: noteId,
          contextMessageCount: 10,
          noteTitle: note?.title,
          noteContent: note?.content,
        });

        // Update the AI message with the final response
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === id
              ? {
                  ...msg,
                  content: response.content,
                  isLoading: false,
                  isStreaming: false,
                }
              : msg
          )
        );
      } else {
        // Handle temporary messages (shouldn't normally happen)
        throw new Error("Cannot regenerate temporary message");
      }

      // Clear regenerating flag after a short delay to ensure UI is updated
      setTimeout(() => {
        setRegeneratingMessageId(null);
      }, 500);
    } catch (error) {
      console.error("Error regenerating message:", error);
      // Handle error
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === id
            ? { ...msg, isLoading: false, error: true, isStreaming: false }
            : msg
        )
      );
      setRegeneratingMessageId(null);
    }
  };

  const handleEditMessage = async (id: string, newContent: string) => {
    // Find the message being edited
    const messageIndex = messages.findIndex((msg) => msg.id === id);
    if (messageIndex < 0) return;

    const message = messages[messageIndex];

    // Update the edited message
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content: newContent } : msg))
    );

    // Remove all messages after this one from the UI
    if (messageIndex < messages.length - 1) {
      setMessages((prev) => prev.slice(0, messageIndex + 1));

      // Delete subsequent messages from the database if this is a database message
      if (!id.startsWith("temp_")) {
        try {
          await deleteMessagesAfterMutation({
            messageId: id as Id<"messages">,
            noteId: noteId,
          });
        } catch (error) {
          console.error("Failed to delete subsequent messages:", error);
        }
      }
    }

    // Update the message in the database if it's not a temporary message
    if (!id.startsWith("temp_") && message.sender === "user") {
      try {
        await updateMessageMutation({
          messageId: id as Id<"messages">,
          content: newContent,
        });

        // If this is a user message, we need to regenerate the AI response
        if (messageIndex < messages.length - 1) {
          const nextMessage = messages[messageIndex + 1];
          if (nextMessage && nextMessage.sender === "ai") {
            handleRegenerateMessage(nextMessage.id);
          }
        }
      } catch (error) {
        console.error("Failed to update message:", error);
      }
    }
  };

  const handleClearChatHistory = async () => {
    try {
      // Clear chat history in the database
      await clearChatHistoryMutation({ noteId });

      // Reset UI to show only the welcome message
      setMessages([getDefaultWelcomeMessage()]);
    } catch (error) {
      console.error("Failed to clear chat history:", error);
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden border-l bg-background border-border">
      {/* Header - fixed at top */}
      <div className="flex items-center justify-between flex-shrink-0 p-4 border-b bg-muted/30">
        <div className="flex flex-col text-left">
          <h3 className="text-lg font-semibold">Note Assistant</h3>
          {note && (
            <div className="flex items-center mt-1 text-xs text-muted-foreground">
              <span className="inline-block w-2 h-2 mr-2 bg-green-500 rounded-full"></span>
              Context: {note.title || "Current document"}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChatHistory}
            className="text-xs"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            Clear Chat
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages Area - scrollable with fixed height */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 text-left max-h-[calc(100vh-200px)]">
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            onEdit={handleEditMessage}
            onRegenerate={handleRegenerateMessage}
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area - fixed at bottom */}
      <div className="flex-shrink-0 p-4 border-t bg-muted/20">
        <div className="relative flex items-end border rounded-lg border-input bg-background">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute w-8 h-8 left-4 bottom-3 hover:bg-accent"
          >
            <Paperclip className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className={cn(
              "w-full overflow-y-auto",
              "pl-14 pr-14 py-5", // Space for icons
              "focus-visible:ring-0",
              "border-0 focus-visible:ring-offset-0 rounded-lg",
              "min-h-[60px]",
              "resize-none",
              "bg-background text-foreground"
            )}
            rows={1}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            type="button"
            size="icon"
            variant="ghost"
            className="absolute flex items-center justify-center w-8 h-8 right-4 bottom-3 hover:bg-accent disabled:opacity-50"
          >
            <SendIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
