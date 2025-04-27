import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/ui/button";
import { XIcon, RefreshCw, Download } from "lucide-react";
import { useQuery, useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import ReactFlow, {
  Background,
  Controls,
  ReactFlowInstance,
  useNodesState,
  useEdgesState,
  Connection,
  addEdge,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";
import { toast } from "react-hot-toast";
import { toPng } from "html-to-image";
import CustomNode from "./CustomNode";
import CustomEdge from "./CustomEdge";

// Define node types for ReactFlow
const nodeTypes = {
  custom: CustomNode,
};

// Define edge types for ReactFlow
const edgeTypes = {
  custom: CustomEdge,
};

interface ConceptMapSidebarProps {
  onClose: () => void;
  noteId: Id<"notes">;
}

export default function ConceptMapSidebar({
  onClose,
  noteId,
}: ConceptMapSidebarProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactFlowInstance, setReactFlowInstance] =
    useState<ReactFlowInstance | null>(null);
  const reactFlowRef = useRef<HTMLDivElement>(null);

  // Get the note data
  const note = useQuery(api.notes.get, { id: noteId });

  // Get the generateConceptMap action
  const generateConceptMapAction = useAction(api.openai.generateConceptMap);

  // Get the storeConceptMap mutation
  const storeConceptMap = useMutation(api.conceptMap.storeConceptMap);

  // Fetch existing concept map from the database
  const conceptMap = useQuery(api.conceptMap.getConceptMap, { noteId });

  // Save changes to the database
  const saveChanges = useCallback(
    async (showToast = false) => {
      if (!nodes.length) return;

      try {
        // Ensure nodes have proper position data and remove callbacks
        const nodesToSave = nodes.map((node) => ({
          id: node.id,
          type: node.type,
          position: node.position || { x: 0, y: 0 },
          data: {
            label: node.data.label || "Untitled",
          },
          // Preserve width and height if they exist
          ...(node.width ? { width: node.width } : {}),
          ...(node.height ? { height: node.height } : {}),
        }));

        // Ensure edges have proper data structure and remove callbacks
        const edgesToSave = edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          type: edge.type,
          label: edge.label || edge.data?.label || "",
          data: {
            label: edge.label || edge.data?.label || "",
          },
        }));

        await storeConceptMap({
          nodes: nodesToSave,
          edges: edgesToSave,
          noteId,
        });

        if (showToast) {
          toast.success("Changes saved", { id: "save-concept-map" });
        }
      } catch (error) {
        console.error("Error saving changes:", error);
        toast.error("Failed to save changes", { id: "save-concept-map" });
      }
    },
    [nodes, edges, noteId, storeConceptMap]
  );

  // Handle closing the sidebar
  const handleClose = useCallback(async () => {
    if (nodes.length || edges.length) {
      await saveChanges(true);
    }
    onClose();
  }, [nodes, edges, saveChanges, onClose]);

  // Handle node label changes
  const onNodeLabelChange = useCallback(
    (nodeId: string, newLabel: string) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            // Ensure we maintain the node's position when updating
            return {
              ...node,
              data: {
                ...node.data,
                label: newLabel || "Untitled",
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  // Handle edge label changes
  const onEdgeLabelChange = useCallback(
    (edgeId: string, newLabel: string) => {
      setEdges((eds) =>
        eds.map((edge) => {
          if (edge.id === edgeId) {
            return {
              ...edge,
              label: newLabel,
              data: {
                ...edge.data,
                label: newLabel,
              },
            };
          }
          return edge;
        })
      );
    },
    [setEdges]
  );

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            type: "custom",
            label: "New Connection",
            data: { label: "New Connection" },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 20,
              height: 20,
              color: "#555",
            },
            style: {
              strokeWidth: 2,
            },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  // Auto fit view when nodes are loaded or component is resized
  useEffect(() => {
    if (reactFlowInstance && nodes.length > 0) {
      const timeoutId = setTimeout(() => {
        reactFlowInstance.fitView({ padding: 0.1 });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [reactFlowInstance, nodes]);

  // Handle container resizes
  useEffect(() => {
    if (reactFlowRef.current && reactFlowInstance && nodes.length > 0) {
      const observer = new ResizeObserver(() => {
        setTimeout(() => {
          reactFlowInstance.fitView({ padding: 0.1 });
        }, 100);
      });

      observer.observe(reactFlowRef.current);
      return () => observer.disconnect();
    }
  }, [reactFlowInstance, nodes]);

  // Apply styling to the nodes and edges
  const applyStyles = (conceptMapData: any) => {
    if (!conceptMapData) return;

    // Apply custom styles to nodes
    const styledNodes = conceptMapData.nodes.map((node: any) => ({
      ...node,
      type: "custom",
      position: node.position || { x: 0, y: 0 },
      data: {
        label: node.data?.label || "Untitled",
        onLabelChange: (newLabel: string) =>
          onNodeLabelChange(node.id, newLabel),
      },
    }));

    // Style edges
    const styledEdges = conceptMapData.edges.map((edge: any) => ({
      ...edge,
      type: "custom",
      label: edge.label || edge.data?.label || "",
      data: {
        label: edge.label || edge.data?.label || "",
        onLabelChange: (newLabel: string) =>
          onEdgeLabelChange(edge.id, newLabel),
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 20,
        height: 20,
        color: "#555",
      },
      style: {
        strokeWidth: 2,
      },
    }));

    setNodes(styledNodes);
    setEdges(styledEdges);
  };

  // When the component mounts or conceptMap changes, load the stored concept map
  useEffect(() => {
    if (conceptMap) {
      applyStyles(conceptMap);
    }
  }, [conceptMap]);

  // Auto-save changes after a delay
  useEffect(() => {
    if (nodes.length || edges.length) {
      const timeoutId = setTimeout(() => {
        saveChanges(false);
      }, 10000); // 10 seconds
      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, saveChanges]);

  // Generate the concept map
  const generateConceptMap = async () => {
    if (!note?.content) return;

    setIsLoading(true);
    setError(null);

    try {
      toast.loading("Generating concept map...", {
        id: "generate-concept-map",
      });

      const result = await generateConceptMapAction({
        content: note.content,
        noteId: noteId,
      });

      if (result.conceptMap) {
        applyStyles(result.conceptMap);
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
    if (!reactFlowRef.current) {
      toast.error("Cannot export concept map");
      return;
    }

    toast.loading("Exporting concept map...", {
      id: "download-concept-map",
    });

    const exportOptions = {
      quality: 1.0,
      backgroundColor: "white",
      width: reactFlowRef.current.offsetWidth,
      height: reactFlowRef.current.offsetHeight,
      style: {
        fontKerning: "normal",
        textRendering: "optimizeLegibility",
      },
      filter: (node: HTMLElement) => {
        return !node.classList?.contains?.("Toastify");
      },
    };

    toPng(reactFlowRef.current, exportOptions)
      .then((dataUrl) => {
        const link = document.createElement("a");
        link.download = `concept-map-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = dataUrl;
        link.click();
        toast.success("Exported concept map", {
          id: "download-concept-map",
        });
      })
      .catch((error) => {
        console.error("Error exporting concept map:", error);
        toast.error("Failed to export concept map", {
          id: "download-concept-map",
        });
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

          <Button variant="ghost" size="sm" onClick={handleClose} title="Close">
            <XIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-10 h-10 border-4 rounded-full border-primary border-t-transparent animate-spin" />
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
            <p className="mb-4 text-sm text-gray-500">
              No concept map available
            </p>
            <Button
              variant="outline"
              onClick={generateConceptMap}
              disabled={isLoading || !note?.content}
            >
              Generate Concept Map
            </Button>
          </div>
        ) : (
          <div className="w-full h-full pb-16" ref={reactFlowRef}>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              edgeTypes={edgeTypes}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              attributionPosition="bottom-right"
              onInit={setReactFlowInstance}
            >
              <Background color="#aaa" gap={16} />
              <Controls />
            </ReactFlow>
          </div>
        )}
      </div>
    </div>
  );
}
