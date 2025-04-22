import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { SignOut } from "../../auth/components/sign-out";
import { PlateEditor } from "../../editor/components/plate-editor";
import { Id } from "../../../convex/_generated/dataModel";
import ChatSidebar from "../../editor/components/ChatSidebar";
import {
  MessageCircleIcon,
  Loader2,
  NetworkIcon,
  PencilIcon,
  RefreshCw,
} from "lucide-react";
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
import { navigateToText } from "../hooks/textNavigation";

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
    handleForceEmbed,
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
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold">{note.title}</h1>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 text-gray-500 hover:text-gray-700"
                >
                  <PencilIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                onClick={handleDeleteWithConfirmation}
                className="px-3 py-1 text-white bg-red-600 rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>

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
                  onForceEmbed={handleForceEmbed}
                  lastEmbeddedAt={note.lastEmbeddedAt}
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
