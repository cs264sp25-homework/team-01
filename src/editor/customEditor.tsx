import { Plate, usePlateEditor } from "@udecode/plate/react";
import { EditorContainer, Editor } from "../components/plate-ui/editor";
import { FixedToolbar } from "../components/plate-ui/fixed-toolbar";
import { FixedToolbarButtons } from "../components/plate-ui/fixed-toolbar-buttons";
import ChatSidebar from "../components/editor/ChatSidebar";
import { useState, useRef } from "react";
import { Button } from "../components/plate-ui/button";
import { MessageCircleIcon } from "lucide-react";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "../components/ui/resizable";

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
  const [chatSidebarOpen, setChatSidebarOpen] = useState(false);
  const resizableRef = useRef<HTMLDivElement>(null);

  //this is getting it from local storage.. integrate w/ convex later..
  //const localValue = typeof window !== "undefined" && localStorage.getItem("editorContent");

  // Create a Plate editor
  const editor = usePlateEditor({
    plugins: [],
  });

  return (
    <div className="relative w-full h-full" ref={resizableRef}>
      <ResizablePanelGroup direction="horizontal" className="h-full">
        {/* Editor Panel */}
        <ResizablePanel 
          defaultSize={chatSidebarOpen ? 60 : 100} 
          minSize={30}
          className="transition-all duration-200"
        >
          <div className="h-full overflow-auto"> 
            <Plate editor={editor}>
              <EditorContainer className="editor-container min-h-[500px] h-full" variant="default">
                <FixedToolbar>
                  <div className="flex w-full justify-between">
                    <FixedToolbarButtons />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => setChatSidebarOpen(!chatSidebarOpen)}
                      className="ml-2"
                      title="Toggle AI Chat"
                    >
                      <MessageCircleIcon className="h-5 w-5" />
                    </Button>
                  </div>
                </FixedToolbar>
                <Editor
                  variant="default"
                  className="editor"
                  placeholder="Type something..."
                />
              </EditorContainer>
            </Plate>
          </div>
        </ResizablePanel>

        {/* Resizable Handle - only shown when chat is open */}
        {chatSidebarOpen && (
          <ResizableHandle withHandle />
        )}

        {/* Chat Panel - conditionally rendered */}
        {chatSidebarOpen && (
          <ResizablePanel defaultSize={40} minSize={25} maxSize={70}>
            <div className="h-full flex-shrink-0">
              <ChatSidebar onClose={() => setChatSidebarOpen(false)} />
            </div>
          </ResizablePanel>
        )}
      </ResizablePanelGroup>
    </div>
  );
}

//s