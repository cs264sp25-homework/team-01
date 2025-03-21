import { Plate, usePlateEditor } from "@udecode/plate/react";
import { EditorContainer, Editor } from "../components/plate-ui/editor";
import { FixedToolbar } from "../components/plate-ui/fixed-toolbar";
import { FixedToolbarButtons } from "../components/plate-ui/fixed-toolbar-buttons";
import "../App.css";

function BasicEditor() {
  // Create a Plate editor
  const editor = usePlateEditor({
    plugins: [],
  });

  return (
    <div className="app-container">
      <Plate editor={editor}>
        <EditorContainer className="editor-container" variant="default">
          <FixedToolbar>
            <FixedToolbarButtons />
          </FixedToolbar>

          <Editor
            variant="default"
            className="editor"
            placeholder="Type something..."
          />
        </EditorContainer>
      </Plate>
    </div>
  );
}

export default BasicEditor;
