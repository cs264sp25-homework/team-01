import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { searchHighlight } from "../plugins/searchHighlightPlugin";

interface CustomNodeData {
  label: string;
  onLabelChange?: (newLabel: string) => void;
}

export default function CustomNode({
  data,
  isConnectable,
}: NodeProps<CustomNodeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.label);
  const [isHighlighted, setIsHighlighted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    setIsEditing(true);
  };

  const handleKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === "Enter") {
      setIsEditing(false);
      data.onLabelChange?.(editValue);
    }
    if (evt.key === "Escape") {
      setIsEditing(false);
      setEditValue(data.label);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    data.onLabelChange?.(editValue);
  };

  const handleClick = (_: React.MouseEvent) => {
    // Get the editor element
    const editorEl = document.querySelector(
      '[data-slate-editor="true"]'
    ) as HTMLElement;
    if (!editorEl) return;

    // Clear any existing highlights first
    searchHighlight.clear(editorEl);
    setIsHighlighted(false);

    // If already highlighted, just clear
    if (isHighlighted) {
      return;
    }

    // Highlight the node's label text
    const { matchCount, matches } = searchHighlight.highlight(
      editorEl,
      data.label,
      false
    );

    if (matchCount > 0 && matches.length > 0) {
      searchHighlight.highlightCurrent(matches[0]);
      setIsHighlighted(true);
    }
  };

  return (
    <div
      className={`px-4 py-2 shadow-md rounded-md bg-white border-2 ${
        isHighlighted ? "border-yellow-400" : "border-gray-200"
      }`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <Handle
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
      />

      {isEditing ? (
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="w-full text-center bg-transparent border-none focus:outline-none"
        />
      ) : (
        <div className="text-center">{data.label}</div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
      />
    </div>
  );
}
