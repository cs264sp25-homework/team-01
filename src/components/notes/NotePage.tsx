import { useState, useRef, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SignOut } from "../auth/sign-out";
import { PlateEditor } from "../editor/plate-editor";
import { Id } from "../../../convex/_generated/dataModel";
import ChatSidebar from "../editor/ChatSidebar";
import { MessageCircleIcon, Loader2 } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "../../components/ui/resizable";
import { Button } from "../plate-ui/button";
import { toast } from "react-hot-toast";

export function NotePage() {
  const { noteId } = useParams();
  const navigate = useNavigate();
  const note = useQuery(
    api.notes.get,
    noteId ? { id: noteId as Id<"notes"> } : "skip"
  );
  const updateNote = useMutation(api.notes.update);
  const renameNote = useMutation(api.notes.rename);
  const deleteNote = useMutation(api.notes.remove);
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [isContentSaving, setIsContentSaving] = useState(false);
  
  // Add state for chat sidebar
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const resizableRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [headerHeight, setHeaderHeight] = useState(64); // Default height

  // Measure header height on mount and resize
  useEffect(() => {
    const updateHeaderHeight = () => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    };

    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    
    return () => {
      window.removeEventListener('resize', updateHeaderHeight);
    };
  }, []);

  // Update title when note data is loaded
  useEffect(() => {
    if (note && !isEditing) {
      setTitle(note.title);
    }
  }, [note, isEditing]);

  const handleUpdateNote = async (content: string, isManualSave = false) => {
    if (!note || !noteId) return;
    
    try {
      setIsContentSaving(true);
      await updateNote({
        id: noteId as Id<"notes">,
        title: note.title,
        content,
      });
      // Only show toast notification for manual saves
      if (isManualSave) {
        toast.success("Note content saved successfully!");
      }
    } catch (error) {
      console.error("Failed to save note content:", error);
      // Always show errors regardless of save type
      toast.error("Failed to save note content");
    } finally {
      setIsContentSaving(false);
    }
  };

  const handleRename = async () => {
    if (!note || !noteId || !title.trim()) return;
    await renameNote({
      id: noteId as Id<"notes">,
      title: title.trim(),
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    if (!note || !noteId) return;
    if (window.confirm("Are you sure you want to delete this note?")) {
      await deleteNote({ id: noteId as Id<"notes"> });
      navigate("/");
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
    <div className="relative flex flex-col h-screen">
      {/* Header - fixed at top */}
      <div ref={headerRef} className="w-full bg-white shadow-sm z-20">
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
                  onClick={handleRename}
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
              onClick={handleDelete}
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
            
            {/* Add AI Chat Toggle Button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setChatSidebarOpen(!chatSidebarOpen)}
              className="ml-2"
              title="Toggle AI Chat"
            >
              <MessageCircleIcon className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main content area - takes remaining height */}
      <div 
        className="flex-1 overflow-hidden" 
        style={{ height: `calc(100vh - ${headerHeight}px)` }}
      >
        <div className="h-full mx-auto max-w-7xl px-4" ref={resizableRef}>
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
              defaultSize={chatSidebarOpen ? 60 : 100} 
              minSize={30}
              className="transition-all duration-200"
            >
              <div className="h-full overflow-auto">
                {isContentSaving ? (
                  <div className="flex items-center justify-center p-4 text-gray-500">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Saving...
                  </div>
                ) : (
                  <PlateEditor 
                    initialContent={note.content}
                    onUpdate={handleUpdateNote}
                    autoSave={true}
                  />
                )}
              </div>
            </ResizablePanel>

            {/* Resizable Handle - only shown when chat is open */}
            {chatSidebarOpen && (
              <ResizableHandle withHandle />
            )}

            {/* Chat Panel - conditionally rendered */}
            {chatSidebarOpen && (
              <ResizablePanel defaultSize={40} minSize={25} maxSize={70}>
                <div className="h-full flex-shrink-0">
                  <ChatSidebar 
                    onClose={() => setChatSidebarOpen(false)} 
                    noteId={noteId as string}
                  />
                </div>
              </ResizablePanel>
            )}
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
}
