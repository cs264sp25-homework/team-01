# Plate Editor Copilot Plugin

This plugin adds AI-powered text completion to the Plate Editor. It allows you to get suggestions for text as you type, similar to GitHub Copilot.

## Features

- **AI Text Completion**: Get AI-powered suggestions to complete your text
- **Simple Keyboard Shortcuts**: Trigger and accept suggestions with keyboard shortcuts
- **Minimal UI**: Ghost text appears inline without disrupting your writing flow

## How It Works

1. **User presses Ctrl+Space** in the editor
2. The plugin extracts the current text content
3. Text is sent to Convex backend via OpenAI API
4. The AI generates a completion
5. The plugin displays the suggestion as ghost text
6. User can accept the entire suggestion with Tab or cancel with Escape

## Keyboard Shortcuts

- **Ctrl+Space**: Generate AI suggestion
- **Tab**: Accept entire suggestion
- **Escape**: Cancel suggestion
- **Ctrl+Z**: Undo accepted suggestions

## Implementation Details

The copilot plugin is implemented as a custom Plate editor plugin. Here's an overview of the architecture:

### Core Components

1. **Plate Plugin**: Created with `createPlatePlugin` to integrate with the Plate editor
2. **Ghost Text Component**: React component for rendering inline suggestions
3. **Convex Backend**: Handles OpenAI API calls via `completeText` action

### Key Files

- `src/editor/plugins/copilot-plugin.tsx`: Main plugin implementation
- `src/editor/plugins/copilot-plugins.tsx`: Plugin exports
- `src/plate-ui/ghost-text.tsx`: Ghost text UI component
- `convex/openai.ts`: Backend OpenAI integration

### State Management

The plugin manages several pieces of state:
- `isActive`: Whether a suggestion is currently active
- `currentText`: The current suggestion text
- `blockSuggestions`: Record of suggestions mapped to block IDs

### DOM Integration

The plugin uses multiple strategies to integrate with the DOM:
- Direct editor API calls via Slate/Plate
- DOM manipulation for ghost text injection when React doesn't render
- Event listeners for keyboard events and editor changes

### Integration with Plate Editor

The plugin is imported and registered in the editor's plugin array. It exposes global functions that the editor component can access for triggering suggestions and querying state.

## Extending the Plugin

If you want to extend the copilot plugin, here are key areas you might focus on:

### Adding New Features

1. **New Suggestion Types**:
   - Modify the `generateSuggestion` function in `copilot-plugin.tsx`
   - Add parameters to specify different suggestion types
   - Update the OpenAI prompt in `openai.ts` to handle different suggestion types

2. **Additional Keyboard Shortcuts**:
   - Add new event listeners in the main event handling section
   - Register new global functions for external access

### Improving the AI Suggestions

1. **Enhance Prompts**:
   - Update the OpenAI prompt in `completeText` action in `openai.ts`
   - Experiment with different temperature and max_tokens values
   - Add context from previous paragraphs for better continuations

2. **Model Selection**:
   - Modify the `completeText` action to use different OpenAI models

### UI Enhancements

1. **Ghost Text Styling**:
   - Update the `GhostText` component for different visual styles
   - Add animation or transitions for a smoother experience

2. **Suggestion Controls**:
   - Add buttons for accepting/rejecting suggestions
   - Add a suggestions panel for multiple alternative completions

### Technical Improvements

1. **Performance Optimization**:
   - Implement caching for frequently used suggestions
   - Optimize DOM operations for better performance

2. **Better Slate/Plate Integration**:
   - Use Slate/Plate APIs more deeply for direct integration
   - Add custom node types for ghost text

## Troubleshooting

If the plugin isn't working:

1. Check the browser console for logs (with prefix "[Copilot]")
2. Verify your OpenAI API key is set correctly in Convex environment
3. Make sure the Convex backend is running
4. Confirm the editor is properly initialized

## Debugging

The plugin uses several techniques to facilitate debugging:

1. **Global Variables**: The plugin exposes several global variables for state inspection
2. **Console Logging**: Watch for logs with the "[Copilot]" prefix
3. **DOM Inspection**: Ghost text elements have distinct classes for easy inspection
4. **Global Functions**: You can manually trigger functions like `acceptCurrentSuggestion` from the console

## Implementation Notes

The plugin uses a hybrid approach of both direct Slate API manipulation and DOM manipulation to ensure compatibility across different editor states. This makes it resilient to React rendering issues but can complicate the logic in some areas.

For future development, consider refactoring toward a more pure Slate plugin approach as the Plate editor matures and provides more stable extension points. 