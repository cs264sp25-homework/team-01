import { Plate, usePlateEditor, PlateContent } from "@udecode/plate/react";
import { EditorContainer, Editor } from "../components/plate-ui/editor";
import { FixedToolbar } from "../components/plate-ui/fixed-toolbar";
import { FixedToolbarButtons } from "../components/plate-ui/fixed-toolbar-buttons";

const value = [
  {
    type: "p", //this tells plate its a paragraph for styling
    children: [
      {
        text: "This is editable plain text with react and history plugins, just like a <textarea>!",
      },
    ],
  },
];

//const htmlValue = "<p>This is <b>bold</b> and <i>italic</i> text!</p>";

//In the future to load in saved text.. we can load it in here and do editor = usePlateEditor({ everytime
//the issue is i do not know how effiicent this is to continously instantiate the editor class?
//also plate docs mention some stuff about formatting w/ html so potentially we can load in that
//to some tool call w/ good prompting/instructions... and have it format the text that way then pass it back in to basic editor

/*
 it's crucial to monitor editor modifications in order to store the values appropriately. 
 The onChange prop will serve this purpose. You can also persist the editor's state by saving the value to local storage or a database 
 and loading it back when needed.

*/

export default function CustomEditor() {
  //this is getting it from local storage.. integrate w/ convex later..
  //const localValue = typeof window !== "undefined" && localStorage.getItem("editorContent");

  // Create a Plate editor
  const editor = usePlateEditor({
    //value: value,
    plugins: [],
  });

  return (
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
  );
}
