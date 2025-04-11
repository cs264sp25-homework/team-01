import React, { useState, useEffect } from "react";
import { Button } from "@/ui/button";
import { XIcon, RefreshCw, Download } from "lucide-react";
import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  Position,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { toast } from "react-hot-toast";

interface ConceptMapSidebarProps {
  onClose: () => void;
  noteId: Id<"notes">;
}

// Basic node style
const nodeStyle = {
  background: "#f5f5f5",
  color: "#333",
  border: "1px solid #ccc",
  borderRadius: "5px",
  padding: "10px",
  fontSize: "14px",
  width: 180,
  textAlign: "center" as const,
};

export default function ConceptMapSidebar({
  onClose,
  noteId,
}: ConceptMapSidebarProps) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch the note data
  const note = useQuery(api.notes.get, { id: noteId });

  // Get the generateConceptMap action
  const generateConceptMapAction = useAction(api.openai.generateConceptMap);

  // Generate the concept map when the component mounts
  useEffect(() => {
    if (note?.content) {
      generateConceptMap();
    }
  }, [note?.content]);

  // Generate the concept map
  const generateConceptMap = async () => {
    if (!note?.content) return;

    setIsLoading(true);
    setError(null);

    try {
      toast.loading("Generating concept map...", {
        id: "generate-concept-map",
      });
      const result = await generateConceptMapAction({ content: note.content });

      if (result.conceptMap) {
        // Apply custom styles to nodes
        const styledNodes = result.conceptMap.nodes.map((node: any) => ({
          ...node,
          style: nodeStyle,
          sourcePosition: Position.Right,
          targetPosition: Position.Left,
        }));

        // Style edges with arrows
        const styledEdges = result.conceptMap.edges.map((edge: any) => ({
          ...edge,
          type: "smoothstep",
          animated: false,
          style: { stroke: "#555" },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 15,
            height: 15,
            color: "#555",
          },
          labelStyle: {
            fill: "#333",
            fontWeight: 500,
            fontSize: 12,
            background: "white",
            padding: "2px 4px",
          },
        }));

        setNodes(styledNodes);
        setEdges(styledEdges);
        toast.success("Concept map generated!", { id: "generate-concept-map" });
      }
    } catch (error) {
      console.error("Error generating concept map:", error);
      setError("Failed to generate concept map. Please try again.");
      toast.error("Failed to generate concept map", {
        id: "generate-concept-map",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Download concept map as PNG
  const downloadAsPng = () => {
    // This is a placeholder - implementing actual image export would
    // require additional libraries or canvas manipulation
    toast.error("Download functionality not implemented yet", {
      id: "download-concept-map",
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Concept Map</h2>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generateConceptMap}
            disabled={isLoading}
            title="Regenerate concept map"
          >
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={downloadAsPng}
            disabled={isLoading || nodes.length === 0}
            title="Download as PNG"
          >
            <Download className="w-4 h-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={onClose} title="Close">
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="mt-4 text-sm text-gray-500">
              Generating concept map...
            </p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full p-4">
            <p className="text-red-500">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={generateConceptMap}
            >
              Try Again
            </Button>
          </div>
        ) : nodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <p className="text-sm text-gray-500">No concept map available</p>
          </div>
        ) : (
          <div className="w-full h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              fitView
              attributionPosition="bottom-right"
            >
              <Background color="#aaa" gap={16} />
              <Controls />
              <MiniMap nodeStrokeColor="#333" nodeColor="#fff" />
            </ReactFlow>
          </div>
        )}
      </div>
    </div>
  );
}
