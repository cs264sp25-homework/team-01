# Plate Editor Copilot Plugin

This plugin adds AI-powered text completion to the Plate Editor. It allows you to get suggestions for text as you type, similar to GitHub Copilot.

## Features

- **AI Text Completion**: Get AI-powered suggestions to complete your text
- **Keyboard Shortcuts**: Simple keyboard shortcuts to trigger and accept suggestions
- **Minimal UI**: Ghost text appears inline without disrupting your writing flow

## How It Works

1. **User presses Ctrl+Space** in the editor
2. The plugin extracts the current text content
3. Text is sent to Convex backend via OpenAI API
4. The AI generates a completion
5. The plugin displays the suggestion as ghost text
6. User can accept it with Tab or word-by-word with Cmd/Ctrl+Right

## Keyboard Shortcuts

- **Ctrl+Space**: Generate AI suggestion
- **Tab**: Accept entire suggestion
- **Cmd/Ctrl+Right Arrow**: Accept suggestion word by word
- **Ctrl+Z**: Undo accepted suggestions

## Installation

The plugin is already integrated into the editor. It's imported in `src/editor/hooks/use-create-editor.ts` and included in the plugins array.

## Prerequisites

- Ensure you have an OpenAI API key set in your Convex environment
- The backend action `api.openai.completeText` must be properly configured

## Troubleshooting

If the plugin isn't working:

1. Check the browser console for logs (with prefix "[Copilot]")
2. Verify your OpenAI API key is set correctly
3. Make sure the Convex backend is running
4. Confirm the editor is properly initialized

## Debugging

The plugin has built-in logging. To see detailed logs:

1. Open your browser's developer tools
2. Check the console for messages with the prefix "[Copilot]"
3. The DEBUG flag at the top of the plugin file can be set to false to disable logging

## Implementation Details

The plugin consists of:

1. A Plate plugin to render ghost text and handle keyboard events
2. A React component to display ghost text
3. Editor extensions to manage state and communicate with the OpenAI API

The API call is made through Convex, which handles the OpenAI integration. 