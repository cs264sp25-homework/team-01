# Concept Map Documentation

## Overview

The Concept Map is an AI-powered visualization tool that automatically generates and displays hierarchical relationships between concepts in user notes. It provides an interactive graph interface where nodes represent key concepts and edges represent the relationships between them.

## Features

- AI-Powered Generation: Automatically create concept maps from note content
- Interactive Visualization: Manipulate, edit, and arrange concept nodes and relationships
- Node and Edge Editing: Double-click to edit node and edge labels
- Save and Auto-save: Changes are saved automatically and persisted in the database
- Regeneration: Regenerate concept maps with updated note content
- Export Functionality: Download concept maps as PNG images
- Responsive Layout: Automatically fit to view and adjust to container resizing
- Hierarchical Structure: Clean organization with main concepts and sub-concepts

## Architecture

### Frontend Components

- ConceptMapSidebar.tsx
  - Main container component for the concept map interface
  - Manages ReactFlow integration and state
  - Handles user interactions and API calls
- CustomNode.tsx
  - Custom node component for displaying concepts
  - Handles node editing and styling
- CustomEdge.tsx
  - Custom edge component for displaying relationships
  - Handles edge editing and styling

### Backend Implementation

- conceptMap.ts
  - Database operations for concept maps
  - Query and mutation functions for storing and retrieving concept maps
- openai.ts
  - AI-powered concept map generation
  - Processes note content and creates structured concept maps
  - Uses OpenAI API with specific formatting instructions

## Data Flow

1. **Generation Flow**

   ```
   Note Content → OpenAI API → Structured Concept Map → Database → UI Rendering
   ```

2. **Editing Flow**

   ```
   User Edit → ReactFlow State → Auto-save → Database Update
   ```

3. **Export Flow**
   ```
   ReactFlow Instance → HTML-to-Image Conversion → PNG Download
   ```

## How to Extend

### Adding New Node Types

1. Create a new custom node component:

   ```typescript
   const NewNodeType = ({ data }) => {
     // Custom node implementation
   };
   ```

2. Register the new node type:

   ```typescript
   const nodeTypes = {
     custom: CustomNode,
     newType: NewNodeType,
   };
   ```

3. Apply the new node type when creating nodes:
   ```typescript
   const newNode = {
     id: "node-id",
     type: "newType",
     // Other node properties
   };
   ```


## Troubleshooting

1. **Generation Issues**

   - Verify OpenAI API key configuration
   - Check if note content is sufficient for concept extraction
   - Review OpenAI response format in the console logs

2. **Rendering Problems**

   - Check browser console for errors
   - Verify ReactFlow dependencies are correctly installed
   - Ensure container element has proper dimensions

3. **Editing Functionality**
   - Verify event handlers are properly attached to nodes and edges
   - Check state update functions for proper implementation
   - Ensure data structures maintain required properties

## Future Improvements

1. **Enhanced AI Generation**

   - Improve concept extraction accuracy
   - Add options for different concept map styles (radial, hierarchical, mind map)
   - Support for multi-note concept map generation

2. **Collaboration Features**

   - Real-time collaborative editing
   - Shared concept maps with commenting
   - Version history for concept map changes

3. **Integration Enhancements**
   - Import/export in standard concept map formats
   - Integrate with other knowledge organization tools
