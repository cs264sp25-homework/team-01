import { Plate, usePlateEditor } from "@udecode/plate/react";
import { EditorContainer, Editor } from "../components/plate-ui/editor";
import { FixedToolbar } from "../components/plate-ui/fixed-toolbar";
import { FixedToolbarButtons } from "../components/plate-ui/fixed-toolbar-buttons";
import "../App.css";
import "./editor-theme.css";

const value = [
  {
    type: "p",
    children: [
      {
        text: "This is editable plain text with react and history plugins, just like a <textarea>!",
      },
    ],
  },
];

function BasicEditor() {
  // Create a Plate editor
  const editor = usePlateEditor({
    plugins: [],
    //value: value, //this allows us to load in initial text.. unsure how to remember spacing but..
    //to remmebr spacing can pass in html see docs...
  });

  return (
    <div className="app-container">
      <Plate editor={editor}>
        <EditorContainer className="editor-container" variant="default">
          <FixedToolbar className="fixed-toolbar-theme">
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
