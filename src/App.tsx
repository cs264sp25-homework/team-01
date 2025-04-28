import { useState, useEffect, useMemo } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { SignIn } from "./auth/components/sign-in";
import { SignOut } from "./auth/components/sign-out";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { CreateNoteModal } from "./notes/components/CreateNoteModal";
import { NotePage } from "./notes/components/NotePage";
import { Id } from "../convex/_generated/dataModel";
import "./App.css";
import { RenameModal } from "./notes/components/RenameModal";
import { Toaster } from "react-hot-toast";
import { AskAIModal } from "./components/AskAIModal";

interface Note {
  _id: Id<"notes">;
  _creationTime?: number;
  title: string;
  content: string;
  userId?: string;
  createdAt?: number;
  updatedAt: number;
  contentPreview?: string;
}

function MainContent() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [noteToRename, setNoteToRename] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAskAIModalOpen, setIsAskAIModalOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const createNote = useMutation(api.notes.create);
  const renameNote = useMutation(api.notes.rename);
  const deleteNote = useMutation(api.notes.remove);
  const notes = useQuery(api.notes.list);
  
  const searchResults = useQuery(
    api.notes.search,
    searchQuery.length >= 2 ? { query: searchQuery } : "skip"
  );
  
  const filteredNotes = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) {
      return notes;
    }
    return searchResults || [];
  }, [notes, searchQuery, searchResults]);

  useEffect(() => {
    console.log("MainContent mounted");
    console.log("Current location:", location.pathname);
  }, [location]);

  const handleCreateNote = async (title: string) => {
    const noteId = await createNote({ title, content: "" });
    setIsModalOpen(false);
    navigate(`/notes/${noteId}`);
  };

  const handleRenameNote = async (newTitle: string) => {
    if (!noteToRename) return;
    try {
      await renameNote({
        id: noteToRename._id,
        title: newTitle.trim()
      });
      setIsRenameModalOpen(false);
      setNoteToRename(null);
    } catch (error) {
      console.error("Failed to rename note:", error);
    }
  };

  const handleDeleteNote = async (note: Note) => {
    if (window.confirm("Are you sure you want to delete this note?")) {
      try {
        await deleteNote({ id: note._id });
      } catch (error) {
        console.error("Failed to delete note:", error);
      }
    }
  };

  const openRenameModal = (note: Note, e: React.MouseEvent) => {
    e.stopPropagation();
    setNoteToRename(note);
    setIsRenameModalOpen(true);
  };

    return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 mx-auto max-w-7xl sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold leading-none text-gray-900">AI Notes</h1>
          <SignOut />
        </div>
      </header>

      <main className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 mb-8 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-medium text-gray-900">My Notes</h2>
          
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search in notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full py-2 pl-10 pr-3 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-300 focus:border-transparent"
              />
              {searchQuery && (
                <button 
                  className="absolute inset-y-0 right-0 flex items-center pr-3"
                  onClick={() => setSearchQuery("")}
                >
                  <svg className="w-5 h-5 text-gray-400 hover:text-gray-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
            
            <button
              onClick={() => setIsAskAIModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-100 transition-colors bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 18a4.5 4.5 0 0 0-4.5-4.5H9.5a4.5 4.5 0 0 0-4.5 4.5"/><path d="M12 12a3 3 0 1 0-3-3"/><path d="M12 2v4"/><path d="m16.2 7.8 2.9-2.9"/><path d="M18 12h4"/><path d="m16.2 16.2 2.9 2.9"/><path d="M12 18v4"/><path d="m7.8 16.2-2.9 2.9"/><path d="M6 12H2"/><path d="m7.8 7.8-2.9-2.9"/></svg>
              Ask AI
            </button>
            
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-gray-100 transition-colors bg-gray-900 rounded-lg shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Create Note
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {!notes ? (
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="mb-2 text-sm text-gray-500">Loading notes...</div>
            </div>
          ) : notes.length === 0 ? (
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="mb-2 text-sm text-gray-500">No notes yet</div>
              <p className="text-gray-600">Create your first note to get started!</p>
            </div>
          ) : filteredNotes?.length === 0 ? (
            <div className="p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="mb-2 text-sm text-gray-500">No matching notes</div>
              <p className="text-gray-600">Try a different search term</p>
            </div>
          ) : (
            filteredNotes?.map((note: Note) => (
              <div
                key={note._id}
                onClick={() => navigate(`/notes/${note._id}`)}
                className="relative p-6 transition-shadow bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer hover:shadow-md group"
              >
                <div className="absolute transition-opacity opacity-0 top-2 right-2 group-hover:opacity-100">
        <button
                    onClick={(e) => openRenameModal(note, e)}
                    className="p-1.5 text-gray-500 hover:text-gray-700"
                    title="Rename note"
        >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
        </button>
        <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteNote(note);
                    }}
                    className="p-1.5 text-red-500 hover:text-red-700"
                    title="Delete note"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
        </button>
      </div>
                <h3 className="mb-2 text-lg font-medium text-gray-900">{note.title}</h3>
                {searchQuery && note.contentPreview && !note.title.toLowerCase().includes(searchQuery.toLowerCase()) && (
                  <p className="mb-2 text-sm text-gray-600">
                    <span className="font-medium">Match:</span> {note.contentPreview}...
                  </p>
                )}
                <p className="text-sm text-gray-500">
                  Last updated: {new Date(note.updatedAt).toLocaleString()}
                </p>
        </div>
            ))
      )}
        </div>

        <CreateNoteModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreate={handleCreateNote}
        />

        <RenameModal
          isOpen={isRenameModalOpen}
          onClose={() => {
            setIsRenameModalOpen(false);
            setNoteToRename(null);
          }}
          onRename={handleRenameNote}
          initialTitle={noteToRename?.title || ""}
        />

        <AskAIModal 
          isOpen={isAskAIModalOpen}
          onClose={() => setIsAskAIModalOpen(false)}
        />

      </main>
    </div>
  );
}

function App() {
  const location = useLocation();
  const { isLoading, isAuthenticated } = useConvexAuth();
  
  useEffect(() => {
    console.log("App mounted");
    console.log("Current route:", location.pathname);
    console.log("Auth state:", { isLoading, isAuthenticated });
  }, [location, isLoading, isAuthenticated]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    return isAuthenticated ? <>{children}</> : <Navigate to="/team-01/signin" replace />;
  };

  return (
    <>
      <Toaster position="top-right" />
      <Routes>
        <Route path="/" element={<Navigate to="/team-01" replace />} />
        <Route path="/signin" element={<Navigate to="/team-01/signin" replace />} />
        <Route 
          path="/team-01/signin" 
          element={!isAuthenticated ? <SignIn /> : <Navigate to="/team-01" replace />} 
        />
        <Route path="/team-01" element={<ProtectedRoute><MainContent /></ProtectedRoute>} />
        <Route path="/notes/:noteId" element={<Navigate to={location.pathname.replace('/notes/', '/team-01/notes/')} replace />} />
        <Route path="/team-01/notes/:noteId" element={<ProtectedRoute><NotePage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/team-01" replace />} />
      </Routes>
    </>
  );
}

export default App;

