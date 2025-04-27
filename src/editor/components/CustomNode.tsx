import React, { useState, useRef, useEffect } from "react";
import { Handle, Position, NodeProps } from "reactflow";

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

  return (
    <div
      className="px-4 py-2 shadow-md rounded-md bg-white border-2 border-gray-200"
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
          className="w-full bg-transparent border-none text-center focus:outline-none"
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
