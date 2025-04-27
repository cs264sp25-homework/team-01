"use client";

import * as React from "react";

import { type NodeEntry } from "@udecode/plate";
import {
  AIChatPlugin,
  useEditorChat,
  useLastAssistantMessage,
} from "@udecode/plate-ai/react";
import {
  BlockSelectionPlugin,
  useIsSelecting,
} from "@udecode/plate-selection/react";
import {
  useEditorPlugin,
  useHotkeys,
  usePluginOption,
} from "@udecode/plate/react";
import { Loader2Icon } from "lucide-react";

import { useChat } from "@/editor/hooks/use-chat";

import { AIChatEditor } from "./ai-chat-editor";
import { AIMenuItems } from "./ai-menu-items";
import { Command, CommandList } from "../ui/command";
import { Popover, PopoverAnchor, PopoverContent } from "./popover";

export function AIMenu() {
  const { api, editor } = useEditorPlugin(AIChatPlugin);
  const open = usePluginOption(AIChatPlugin, "open");
  const mode = usePluginOption(AIChatPlugin, "mode");
  const isSelecting = useIsSelecting();

  const [value, setValue] = React.useState("");

  const chat = useChat();

  const { isLoading, messages, setInput } = chat;
  const [anchorElement, setAnchorElement] = React.useState<HTMLElement | null>(
    null
  );

  const content = useLastAssistantMessage()?.content;

  const setOpen = (open: boolean) => {
    if (open) {
      api.aiChat.show();
    } else {
      api.aiChat.hide();
    }
  };

  const show = (anchorElement: HTMLElement) => {
    setAnchorElement(anchorElement);
    setOpen(true);
  };

  useEditorChat({
    chat,
    onOpenBlockSelection: (blocks: NodeEntry[]) => {
      show(editor.api.toDOMNode(blocks.at(-1)![0])!);
    },
    onOpenChange: (open) => {
      if (!open) {
        setAnchorElement(null);
        setInput("");
      }
    },
    onOpenCursor: () => {
      const [ancestor] = editor.api.block({ highest: true })!;

      if (!editor.api.isAt({ end: true }) && !editor.api.isEmpty(ancestor)) {
        editor
          .getApi(BlockSelectionPlugin)
          .blockSelection.set(ancestor.id as string);
      }

      show(editor.api.toDOMNode(ancestor)!);
    },
    onOpenSelection: () => {
      show(editor.api.toDOMNode(editor.api.blocks().at(-1)![0])!);
    },
  });

  useHotkeys(
    "meta+j",
    () => {
      api.aiChat.show();
    },
    { enableOnContentEditable: true, enableOnFormTags: true }
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverAnchor virtualRef={{ current: anchorElement! }} />

      <PopoverContent
        className="p-0 bg-transparent border-none shadow-none fixed-position"
        style={{
          width: anchorElement?.offsetWidth,
          maxHeight: "80vh",
          position: "fixed",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();

          if (isLoading) {
            api.aiChat.stop();
          } else {
            api.aiChat.hide();
          }
        }}
        align="center"
        // avoidCollisions={false}
        side="bottom"
      >
        <Command
          className="w-full border rounded-lg shadow-md"
          value={value}
          onValueChange={setValue}
        >
          {mode === "chat" && isSelecting && content && (
            <div className="overflow-y-auto max-h-60">
              <AIChatEditor content={content} />
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center gap-2 p-2 text-sm select-none grow text-muted-foreground">
              <Loader2Icon className="size-4 animate-spin" />
              {messages.length > 1 ? "Editing..." : "Thinking..."}
            </div>
          ) : (
            <div className="p-2 text-sm text-center border-b border-solid text-muted-foreground border-border">
              AI Menu
            </div>
          )}

          {!isLoading && (
            <CommandList className="overflow-y-auto max-h-60">
              <AIMenuItems setValue={setValue} />
            </CommandList>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
