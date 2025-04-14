import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SignOut } from "../../auth/components/sign-out";
import { PlateEditor } from "../../editor/components/plate-editor";
import { Id } from "../../../convex/_generated/dataModel";
import ChatSidebar from "../../editor/components/ChatSidebar";
import { MessageCircleIcon, Loader2, NetworkIcon } from "lucide-react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "../../ui/resizable";
import { Button } from "@/ui/button";
import TestGeneratorSidebar from "../../editor/components/TestGeneratorSidebar";
import ConceptMapSidebar from "../../editor/components/ConceptMapSidebar";
import { BookOpenIcon } from "lucide-react";
import { useNotes } from "../hooks/useNotes";
import { searchHighlight } from "../../editor/plugins/searchHighlightPlugin";

export function NotePage() {
  const { noteId } = useParams();
  const navigate = useNavigate();

  // Use the notes hook
  const {
    note,
    title,
    setTitle,
    isEditing,
    setIsEditing,
    isContentSaving,
    handleUpdateNote,
    handleRename,
    handleDelete,
  } = useNotes(noteId);

  // Sidebar states
  const [activeSidebar, setActiveSidebar] = useState<
    "chat" | "test" | "concept-map" | null
  >(null);
  const resizableRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(64); // Default height

  // Toggle sidebar functions
  const toggleChatSidebar = () => {
    setActiveSidebar(activeSidebar === "chat" ? null : "chat");
  };

  const toggleTestSidebar = () => {
    setActiveSidebar(activeSidebar === "test" ? null : "test");
  };

  const toggleConceptMapSidebar = () => {
    setActiveSidebar(activeSidebar === "concept-map" ? null : "concept-map");
  };

  const closeSidebars = () => {
    setActiveSidebar(null);
  };

  // Measure header height on mount and resize
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateHeaderHeight();
    window.addEventListener("resize", updateHeaderHeight);

    return () => {
      window.removeEventListener("resize", updateHeaderHeight);
    };
  }, []);

  // Listen for custom events to show sidebars
  useEffect(() => {
    const handleShowTestGenerator = () => {
      setActiveSidebar("test");
    };

    const handleShowConceptMap = () => {
      setActiveSidebar("concept-map");
    };

    window.addEventListener(
      "showTestGenerator",
      handleShowTestGenerator as EventListener
    );
    window.addEventListener(
      "showConceptMap",
      handleShowConceptMap as EventListener
    );

    return () => {
      window.removeEventListener(
        "showTestGenerator",
        handleShowTestGenerator as EventListener
      );
      window.removeEventListener(
        "showConceptMap",
        handleShowConceptMap as EventListener
      );
    };
  }, []);

  // Handle note deletion with confirmation and navigation
  const handleDeleteWithConfirmation = async () => {
    if (!note || !noteId) return;
    if (window.confirm("Are you sure you want to delete this note?")) {
      const success = await handleDelete();
      if (success) {
        navigate("/");
      }
    }
  };

  const navigateToText = (text: string) => {
    // Get the editor element
    const editorEl = document.querySelector('[data-slate-editor="true"]') as HTMLElement;
    
    if (!editorEl || !text) {
      console.error("Editor element not found or empty text");
      return;
    }
    
    // Clear any existing highlights first
    searchHighlight.clear(editorEl);
    
    // Try exact match first
    const { matchCount, matches } = searchHighlight.highlight(editorEl, text, false);
    
    // If matches were found, highlight the first one
    if (matchCount > 0 && matches.length > 0) {
      searchHighlight.highlightCurrent(matches[0]);
      return;
    }
    
    // If no exact match, try to find the best matching substring
    const findBestMatch = () => {
      // Get all text content from the editor
      const editorText = editorEl.textContent || "";
      
      // Clean up the source text (remove extra spaces)
      const cleanSource = text.replace(/\s+/g, ' ').trim();
      const cleanEditor = editorText.replace(/\s+/g, ' ').trim();
      
      // Extract significant phrases (5+ words) from the source text
      const phrases = cleanSource
        .split(/[.!?;]/)
        .map(phrase => phrase.trim())
        .filter(phrase => phrase.length > 20);
      
      // Try each significant phrase
      for (const phrase of phrases) {
        const { matchCount, matches } = searchHighlight.highlight(editorEl, phrase, false);
        if (matchCount > 0 && matches.length > 0) {
          searchHighlight.highlightCurrent(matches[0]);
          return true;
        }
        searchHighlight.clear(editorEl);
      }
      
      // If no phrase matches, try individual words
      const sourceWords = cleanSource.split(/\s+/).filter(word => word.length > 5);
      const editorWords = cleanEditor.split(/\s+/);
      
      // Find the most unique words from the source
      const uniqueWords = sourceWords
        .filter(word => word.length > 5)
        .sort((a, b) => {
          // Count occurrences in editor text
          const aCount = editorWords.filter(w => w.toLowerCase() === a.toLowerCase()).length;
          const bCount = editorWords.filter(w => w.toLowerCase() === b.toLowerCase()).length;
          // Prefer words that appear less frequently (more unique)
          return aCount - bCount;
        })
        .slice(0, 5); // Take top 5 most unique words
      
      // Try to find a section with multiple unique words close together
      for (let i = 0; i < editorWords.length - 10; i++) {
        const section = editorWords.slice(i, i + 15).join(' ');
        let matchCount = 0;
        
        for (const word of uniqueWords) {
          if (section.toLowerCase().includes(word.toLowerCase())) {
            matchCount++;
          }
        }
        
        if (matchCount >= 2) { // If at least 2 unique words are found close together
          const { matchCount, matches } = searchHighlight.highlight(editorEl, section, false);
          if (matchCount > 0 && matches.length > 0) {
            searchHighlight.highlightCurrent(matches[0]);
            return true;
          }
          searchHighlight.clear(editorEl);
        }
      }
      
      return false;
    };
    
    // Try to find the best match
    const foundMatch = findBestMatch();
    
    if (!foundMatch) {
      console.log("No good matches found for source text:", text);
    }
  };

  if (!note) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Loader2 className="w-10 h-10 text-gray-500 animate-spin" />
        <p className="mt-4 text-lg text-gray-500">Loading note...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header - fixed at top */}
      <div ref={headerRef} className="z-20 w-full bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-2 mx-auto max-w-7xl">
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="px-4 py-2 text-gray-800 transition-colors bg-gray-200 rounded-lg shadow-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              Back to Dashboard
            </button>
            <SignOut />
          </div>

          <div className="flex items-center gap-4">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="px-2 py-1 border-2 border-gray-300 rounded focus:outline-none focus:border-gray-900"
                  autoFocus
                />
                <button
                  onClick={() => handleRename(title)}
                  className="px-3 py-1 text-white bg-gray-900 rounded hover:bg-gray-800"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setTitle(note.title);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1 text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{note.title}</h1>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              </div>
            )}
            <button
              onClick={handleDeleteWithConfirmation}
              className="p-2 text-red-600 hover:text-red-800"
              title="Delete note"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-5 h-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {/* AI Chat Toggle Button */}
            <Button
              variant={activeSidebar === "chat" ? "default" : "ghost"}
              size="icon"
              onClick={toggleChatSidebar}
              className="ml-2"
              title="Toggle AI Chat"
            >
              <MessageCircleIcon className="w-5 h-5" />
            </Button>

            {/* Test Generator Toggle Button */}
            <Button
              variant={activeSidebar === "test" ? "default" : "ghost"}
              size="icon"
              onClick={toggleTestSidebar}
              className="ml-2"
              title="Generate Test Questions"
            >
              <BookOpenIcon className="w-5 h-5" />
            </Button>

            {/* Concept Map Toggle Button */}
            <Button
              variant={activeSidebar === "concept-map" ? "default" : "ghost"}
              size="icon"
              onClick={toggleConceptMapSidebar}
              className="ml-2"
              title="View Concept Map"
            >
              <NetworkIcon className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area - takes remaining height */}
      <div
        className="flex-1 overflow-hidden"
        style={{ height: `calc(100vh - ${headerHeight}px)` }}
      >
        <div className="h-full px-4 mx-auto max-w-7xl" ref={resizableRef}>
          <p className="py-2 text-sm text-gray-500">
            Last edited: {new Date(note.updatedAt).toLocaleString()}
          </p>

          {/* Resizable panel layout */}
          <ResizablePanelGroup
            direction="horizontal"
            className="h-[calc(100%-2rem)]"
          >
            {/* Editor Panel */}
            <ResizablePanel
              defaultSize={activeSidebar ? 60 : 100}
              minSize={30}
              className="transition-all duration-200"
            >
              <div className="h-full overflow-auto border border-gray-200 rounded-md">
                <PlateEditor
                  initialContent={note.content}
                  onUpdate={handleUpdateNote}
                  autoSave={true}
                  isSaving={isContentSaving}
                />
              </div>
            </ResizablePanel>

            {/* Resizable Handle - only shown when a sidebar is open */}
            {activeSidebar && <ResizableHandle withHandle />}

            {/* Sidebar Panel - conditionally rendered based on active sidebar */}
            {activeSidebar && (
              <ResizablePanel defaultSize={40} minSize={25} maxSize={70}>
                <div className="flex-shrink-0 h-full border border-gray-200 rounded-md">
                  {activeSidebar === "chat" ? (
                    <ChatSidebar
                      onClose={closeSidebars}
                      noteId={noteId as string}
                    />
                  ) : activeSidebar === "test" ? (
                    <TestGeneratorSidebar
                      onClose={closeSidebars}
                      noteId={noteId as Id<"notes">}
                      navigateToText={navigateToText}
                    />
                  ) : (
                    <ConceptMapSidebar
                      onClose={closeSidebars}
                      noteId={noteId as Id<"notes">}
                    />
                  )}
                </div>
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}
