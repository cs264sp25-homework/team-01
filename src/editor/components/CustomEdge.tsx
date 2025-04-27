import React, { useState, useRef, useEffect } from "react";
import {
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
  BaseEdge,
} from "reactflow";

interface CustomEdgeData {
  label?: string;
  onLabelChange?: (newLabel: string) => void;
}

export default function CustomEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style = {},
  markerEnd,
  label,
}: EdgeProps<CustomEdgeData>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(label || data?.label || "");
  const inputRef = useRef<HTMLInputElement>(null);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (evt: React.MouseEvent) => {
    evt.stopPropagation();
    setIsEditing(true);
  };

  const handleKeyDown = (evt: React.KeyboardEvent) => {
    if (evt.key === "Enter") {
      setIsEditing(false);
      data?.onLabelChange?.(editValue);
    }
    if (evt.key === "Escape") {
      setIsEditing(false);
      setEditValue(label || data?.label || "");
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
    data?.onLabelChange?.(editValue);
  };

  const displayLabel = label || data?.label;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          strokeWidth: 2,
          stroke: "#555",
        }}
        markerEnd={markerEnd}
      />

      {(isEditing || displayLabel) && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: "all",
              fontSize: 12,
              fontWeight: 500,
              textShadow: "2px 2px 8px white",
            }}
            className="nodrag nopan"
          >
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                className="bg-white/80 px-2 py-1 rounded text-sm border focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ width: Math.max(50, editValue.length * 8) }}
              />
            ) : (
              <div
                onDoubleClick={handleDoubleClick}
                className="px-1 py-0.5 text-sm cursor-pointer hover:bg-white/50 rounded transition-colors"
              >
                {displayLabel}
              </div>
            )}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}
