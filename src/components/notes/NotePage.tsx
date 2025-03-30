import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { SignOut } from "../auth/sign-out";
import { PlateEditor } from "../editor/plate-editor";
import { Id } from "../../../convex/_generated/dataModel";

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
  const [title, setTitle] = useState(note?.title || "");

  const handleUpdateNote = async (content: string) => {
    if (!note || !noteId) return;
    await updateNote({
      id: noteId as Id<"notes">,
      title: note.title,
      content,
    });
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

  // Update local title when note changes
  if (note && note.title !== title && !isEditing) {
    setTitle(note.title);
  }

  if (!note) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="fixed z-10 w-full bg-white shadow-sm">
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
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center min-h-screen pt-16">
        <div className="w-full max-w-4xl px-4">
          <p className="mb-4 text-sm text-gray-500">
            Last edited: {new Date(note.updatedAt).toLocaleString()}
          </p>
          <PlateEditor />
        </div>
      </div>
    </div>
  );
}
