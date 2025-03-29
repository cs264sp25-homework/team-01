'use client';

import type { Value } from '@udecode/plate';

import { withProps } from '@udecode/cn';
import { AIPlugin } from '@udecode/plate-ai/react';
import {
  BoldPlugin,
  ItalicPlugin,
  SubscriptPlugin,
  SuperscriptPlugin,
  UnderlinePlugin,
} from '@udecode/plate-basic-marks/react';

import { HEADING_KEYS } from '@udecode/plate-heading';
import { HighlightPlugin } from '@udecode/plate-highlight/react';
import { HorizontalRulePlugin } from '@udecode/plate-horizontal-rule/react';
import { KbdPlugin } from '@udecode/plate-kbd/react';
import { ColumnItemPlugin, ColumnPlugin } from '@udecode/plate-layout/react';

import {
  EquationPlugin,
  InlineEquationPlugin,
} from '@udecode/plate-math/react';
import {
  PlaceholderPlugin,
} from '@udecode/plate-media/react';

import { SlashInputPlugin } from '@udecode/plate-slash-command/react';

import {
  type CreatePlateEditorOptions,
  ParagraphPlugin,
  PlateLeaf,
  usePlateEditor,
} from '@udecode/plate/react';

import { copilotPlugins } from '@/components/editor/plugins/copilot-plugins';
import { editorPlugins } from '@/components/editor/plugins/editor-plugins';
import { FixedToolbarPlugin } from '@/components/editor/plugins/fixed-toolbar-plugin';
import { FloatingToolbarPlugin } from '@/components/editor/plugins/floating-toolbar-plugin';
import { AILeaf } from '@/components/plate-ui/ai-leaf';
import { ColumnElement } from '@/components/plate-ui/column-element';
import { ColumnGroupElement } from '@/components/plate-ui/column-group-element';
import { EquationElement } from '@/components/plate-ui/equation-element';
import { HeadingElement } from '@/components/plate-ui/heading-element';
import { HighlightLeaf } from '@/components/plate-ui/highlight-leaf';
import { HrElement } from '@/components/plate-ui/hr-element';
import { InlineEquationElement } from '@/components/plate-ui/inline-equation-element';
import { KbdLeaf } from '@/components/plate-ui/kbd-leaf';
import { ParagraphElement } from '@/components/plate-ui/paragraph-element';
import { withPlaceholders } from '@/components/plate-ui/placeholder';
import { SlashInputElement } from '@/components/plate-ui/slash-input-element';



export const viewComponents = {
  //[AudioPlugin.key]: MediaAudioElement,
  //[BlockquotePlugin.key]: BlockquoteElement,
  [BoldPlugin.key]: withProps(PlateLeaf, { as: 'strong' }),
  //[CodeBlockPlugin.key]: CodeBlockElement,
  //[CodeLinePlugin.key]: CodeLineElement,
  //[CodePlugin.key]: CodeLeaf,
  //[CodeSyntaxPlugin.key]: CodeSyntaxLeaf,
  [ColumnItemPlugin.key]: ColumnElement,
  [ColumnPlugin.key]: ColumnGroupElement,
  //[CommentsPlugin.key]: CommentLeaf,
  //[DatePlugin.key]: DateElement,
  [EquationPlugin.key]: EquationElement,
  //[ExcalidrawPlugin.key]: ExcalidrawElement,
  //[FilePlugin.key]: MediaFileElement,
  [HEADING_KEYS.h1]: withProps(HeadingElement, { variant: 'h1' }),
  [HEADING_KEYS.h2]: withProps(HeadingElement, { variant: 'h2' }),
  [HEADING_KEYS.h3]: withProps(HeadingElement, { variant: 'h3' }),
  [HEADING_KEYS.h4]: withProps(HeadingElement, { variant: 'h4' }),
  [HEADING_KEYS.h5]: withProps(HeadingElement, { variant: 'h5' }),
  [HEADING_KEYS.h6]: withProps(HeadingElement, { variant: 'h6' }),
  [HighlightPlugin.key]: HighlightLeaf,
  [HorizontalRulePlugin.key]: HrElement,
  //[ImagePlugin.key]: ImageElement,
  [InlineEquationPlugin.key]: InlineEquationElement,
  [ItalicPlugin.key]: withProps(PlateLeaf, { as: 'em' }),
  [KbdPlugin.key]: KbdLeaf,
  //[LinkPlugin.key]: LinkElement,
  //[MediaEmbedPlugin.key]: MediaEmbedElement,
  //[MentionPlugin.key]: MentionElement,
  [ParagraphPlugin.key]: ParagraphElement,
  //[StrikethroughPlugin.key]: withProps(PlateLeaf, { as: 's' }),
  [SubscriptPlugin.key]: withProps(PlateLeaf, { as: 'sub' }),
  //[SuggestionPlugin.key]: SuggestionLeaf,
  [SuperscriptPlugin.key]: withProps(PlateLeaf, { as: 'sup' }),
  //[TableCellHeaderPlugin.key]: TableCellHeaderElement,
  //[TableCellPlugin.key]: TableCellElement,
  //[TablePlugin.key]: TableElement,
  //[TableRowPlugin.key]: TableRowElement,
  //[TocPlugin.key]: TocElement,
  //[TogglePlugin.key]: ToggleElement,
  [UnderlinePlugin.key]: withProps(PlateLeaf, { as: 'u' }),
  //[VideoPlugin.key]: MediaVideoElement,
};

export const editorComponents = {
  ...viewComponents,
  [AIPlugin.key]: AILeaf,
  //[EmojiInputPlugin.key]: EmojiInputElement,
  //[MentionInputPlugin.key]: MentionInputElement,
  [SlashInputPlugin.key]: SlashInputElement,
};

export const useCreateEditor = (
  {
    components,
    override,
    readOnly,
    ...options
  }: {
    components?: Record<string, any>;
    plugins?: any[];
    readOnly?: boolean;
  } & Omit<CreatePlateEditorOptions, 'plugins'> = {},
  deps: any[] = []
) => {
  return usePlateEditor<Value>(
    {
      override: {
        components: {
          ...(readOnly ? viewComponents : withPlaceholders(editorComponents)),
          ...components,
        },
        ...override,
      },
      plugins: [
        ...copilotPlugins,
        ...editorPlugins,
        FixedToolbarPlugin,
        FloatingToolbarPlugin,
      ],
      value: [
        {
          children: [{ text: 'Playground' }],
          type: 'h1',
        },
        {
          children: [
            { text: 'A rich-text editor with AI capabilities. Try the ' },
            { bold: true, text: 'AI commands' },
            { text: ' or use ' },
            { kbd: true, text: 'Cmd+J' },
            { text: ' to open the AI menu.' },
          ],
          type: ParagraphPlugin.key,
        },
      ],
      ...options,
    },
    deps
  );
};


//this files defines most of the logic for the editor
