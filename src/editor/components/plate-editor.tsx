import { useEffect, useCallback, useState, useMemo } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { Plate } from "@udecode/plate/react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { FallbackEmailResult } from "../../../convex/email";
import { useCreateEditor } from "@/editor/hooks/use-create-editor";
import { Editor, EditorContainer } from "@/plate-ui/editor";
import { Button } from "@/ui/button";
import {
  SaveIcon,
  SearchIcon,
  ListFilterIcon,
  NetworkIcon,
  FileDownIcon,
  ShareIcon
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  SearchBar,
  createSearchHighlightPlugin,
} from "@/editor/components/search-bar";
import { jsPDF } from 'jspdf';
import { 
  Dialog,
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/plate-ui/dialog';
import { Input } from '@/plate-ui/input';

// A simple debounce helper
function debounce(func: Function, wait: number) {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return function executedFunction(...args: any[]) {
    const later = () => {
      timeout = null;
      func(...args);
    };
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

interface PlateEditorProps {
  initialContent?: string;
  onUpdate?: (content: string, isManualSave?: boolean) => void;
  autoSave?: boolean;
  isSaving?: boolean;
}

export function PlateEditor({
  initialContent = "",
  onUpdate,
  autoSave = true,
  isSaving = false,
}: PlateEditorProps) {
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(true);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [pdfFileName, setPdfFileName] = useState("notes");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("Shared Notes");
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [customSenderEmail, setCustomSenderEmail] = useState("");
  const [isSettingSender, setIsSettingSender] = useState(false);

  const organizeNotesAction = useAction(api.openai.organizeNotes);
  const sendEmailAction = useAction(api.email.sendWithAttachment);
  const setSenderEmailAction = useAction(api.email.setSenderEmail);

  // Parse initialContent for the editor
  const parsedInitialContent = useMemo(() => {
    if (!initialContent) return [{ type: "p", children: [{ text: "" }] }];
    
    try {
      const parsed = JSON.parse(initialContent);
      return Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      console.error("Error parsing initialContent:", e);
      return [{ type: "p", children: [{ text: "" }] }];
    }
  }, [initialContent]);

  // Create the editor and include the custom search plugin as part of the override.
  const editor = useCreateEditor({
    value: parsedInitialContent,
    override: {
      plugins: {
        search: createSearchHighlightPlugin(),
      },
    },
  });

  // Set global editor reference for plugin access
  useEffect(() => {
    if (editor) {
      (window as any).__PLATE_EDITOR__ = editor;
      
      // Use the store function from copilot-plugin if available
      if (typeof (window as any).__STORE_EDITOR_REF__ === 'function') {
        (window as any).__STORE_EDITOR_REF__(editor);
      }
    }
  }, [editor]);

  const saveContent = useCallback(
    (isManualSave = true) => {
      if (onUpdate) {
        if (!isManualSave) setIsAutoSaving(true);
        const content = JSON.stringify(editor.children);
        Promise.resolve().then(() => {
          onUpdate(content, isManualSave);
          setLastSavedAt(new Date());
          setIsDirty(false);
          if (!isManualSave) setIsAutoSaving(false);
        });
      }
    },
    [editor, onUpdate]
  );

  const debouncedSave = useCallback(
    debounce(() => saveContent(false), 2000),
    [saveContent]
  );

  const handleEditorChange = useCallback(() => {
    setIsDirty(true);
    if (autoSave) debouncedSave();
  }, [autoSave, debouncedSave]);
  
  // Expose handleEditorChange globally for plugins to access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__PLATE_EDITOR_HANDLE_CHANGE__ = handleEditorChange;
      
      // Also store the plate instance if possible
      if (typeof (window as any).__PLATE_INSTANCE__ === 'undefined') {
        setTimeout(() => {
          try {
            // Look for the Plate component in React fibers
            document.querySelectorAll('[data-slate-plugin-plate]');
          } catch (e) {
            // Error finding Plate instance
          }
        }, 500);
      }
    }
    
    return () => {
      // Clean up global reference when component unmounts
      if (typeof window !== 'undefined') {
        delete (window as any).__PLATE_EDITOR_HANDLE_CHANGE__;
      }
    };
  }, [handleEditorChange]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        saveContent(false);
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty, saveContent]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setShowSearchBar((prev) => !prev);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  // Listen for external changes from plugins (like copilot)
  useEffect(() => {
    const handleExternalChange = () => {
      // Mark as dirty and trigger autosave if enabled
      setIsDirty(true);
      if (autoSave) debouncedSave();
    };
    
    // Direct save content trigger from plugins
    const handleSaveContent = (e: Event) => {
      const customEvent = e as CustomEvent;
      const isManual = customEvent.detail?.manual === true;
      saveContent(isManual);
    };
    
    // Force save with specific content
    const handleForceSave = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.content && onUpdate) {
        const content = JSON.stringify(customEvent.detail.content);
        onUpdate(content, false);
        setLastSavedAt(new Date());
        setIsDirty(false);
      }
    };
    
    // Listen for our custom events
    document.addEventListener('plate-editor-change', handleExternalChange);
    document.addEventListener('editor-content-changed', handleExternalChange);
    document.addEventListener('plate-editor-save-content', handleSaveContent);
    document.addEventListener('plate-editor-force-save', handleForceSave);
    
    return () => {
      document.removeEventListener('plate-editor-change', handleExternalChange);
      document.removeEventListener('editor-content-changed', handleExternalChange);
      document.removeEventListener('plate-editor-save-content', handleSaveContent);
      document.removeEventListener('plate-editor-force-save', handleForceSave);
    };
  }, [autoSave, debouncedSave, saveContent, onUpdate]);

  const organizeNotes = useCallback(async () => {
    try {
      setIsOrganizing(true);
      toast.loading("Organizing your notes...", { id: "organize-notes" });
      const currentContent = JSON.stringify(editor.children);
      const { organizedContent } = await organizeNotesAction({
        content: currentContent,
      });
      try {
        const rawContent = organizedContent.trim();
        let processedContent;
        try {
          const parsed = JSON.parse(rawContent);
          processedContent = Array.isArray(parsed) ? parsed : [parsed];
          if (processedContent.length === 0)
            throw new Error("Empty array returned from AI");
        } catch (e) {
          console.error("JSON parsing error:", e, rawContent);
          throw new Error(
            "Invalid response from AI. Could not parse as JSON array."
          );
        }
        editor.children = processedContent;
        // Trigger normalization on the editor.
        // @ts-ignore
        editor.normalize();
        setTimeout(() => {
          handleEditorChange();
          setIsDirty(true);
        }, 0);
        toast.success("Notes organized successfully!", {
          id: "organize-notes",
        });
      } catch (parseError) {
        console.error("Error parsing organized content:", parseError);
        toast.error(
          "Failed to apply organized notes - invalid format returned",
          { id: "organize-notes" }
        );
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to organize notes",
        { id: "organize-notes" }
      );
    } finally {
      setIsOrganizing(false);
    }
  }, [editor, handleEditorChange, organizeNotesAction]);

  // Function to generate concept map
  const generateConceptMap = useCallback(() => {
    // Create and dispatch a custom event to show the concept map sidebar
    const event = new CustomEvent("showConceptMap");
    window.dispatchEvent(event);
  }, []);

  const handleExportButtonClick = useCallback(() => {
    setPdfFileName("notes");
    setShowExportDialog(true);
  }, []);

  const handleExportDialogClose = useCallback(() => {
    setShowExportDialog(false);
  }, []);

  // Define types for PDF creation
  interface PdfCreationOptions {
    title?: string;
    saveLocally?: boolean;
    filename?: string;
  }

  // Helper utility functions for PDF generation
  const parseColor = (color: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { r: 0, g: 0, b: 0 };
    
    ctx.fillStyle = color;
    const rgb = ctx.fillStyle;
    const match = rgb.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    
    if (match) {
      return {
        r: parseInt(match[1], 16),
        g: parseInt(match[2], 16),
        b: parseInt(match[3], 16)
      };
    }
    return { r: 0, g: 0, b: 0 };
  };

  const hasStyledProperty = (obj: any, propName: string): boolean => {
    if (!obj || typeof obj !== 'object') return false;
    if (obj[propName] !== undefined) return true;
    
    // Check in nested style objects
    if (obj.style && obj.style[propName] !== undefined) return true;
    
    // Check all other properties for nested objects
    for (const key in obj) {
      if (typeof obj[key] === 'object' && key !== 'children') {
        if (hasStyledProperty(obj[key], propName)) return true;
      }
    }
    
    return false;
  };
  
  const getStyledPropertyValue = (obj: any, propName: string): any => {
    if (!obj || typeof obj !== 'object') return undefined;
    if (obj[propName] !== undefined) return obj[propName];
    
    // Check in nested style objects
    if (obj.style && obj.style[propName] !== undefined) return obj.style[propName];
    
    // Check all other properties for nested objects
    for (const key in obj) {
      if (typeof obj[key] === 'object' && key !== 'children') {
        const value = getStyledPropertyValue(obj[key], propName);
        if (value !== undefined) return value;
      }
    }
    
    return undefined;
  };

  const normalizeContentFormat = (content: any[]): any[] => {
    const processNode = (node: any): any => {
      // Handle paragraphs and other block elements
      if (node.type) {
        const newNode = { ...node };
        
        // Process children
        if (Array.isArray(node.children)) {
          newNode.children = node.children.map(processNode);
        } else {
          newNode.children = [{ text: "" }];
        }
        
        return newNode;
      }
      
      // Handle text nodes
      if (typeof node === 'object' && node.text !== undefined) {
        // Start with a clean normalized object with all original properties
        const normalized = { ...node };
        
        // Use recursive property checks for formatting
        if (hasStyledProperty(node, 'bold') || hasStyledProperty(node, 'Bold') || 
            hasStyledProperty(node, 'fontWeight') || 
            getStyledPropertyValue(node, 'fontWeight') === 'bold' ||
            getStyledPropertyValue(node, 'fontWeight') === '700') {
          normalized.bold = true;
        }
        
        // Normalize italic formatting
        if (hasStyledProperty(node, 'italic') || hasStyledProperty(node, 'Italic') ||
            getStyledPropertyValue(node, 'fontStyle') === 'italic') {
          normalized.italic = true;
        }
        
        // Normalize underline
        if (hasStyledProperty(node, 'underline') || hasStyledProperty(node, 'Underline') ||
            getStyledPropertyValue(node, 'textDecoration') === 'underline') {
          normalized.underline = true;
        }
        
        // Normalize strikethrough
        if (hasStyledProperty(node, 'strikethrough') || hasStyledProperty(node, 'Strikethrough') ||
            getStyledPropertyValue(node, 'textDecoration') === 'line-through') {
          normalized.strikethrough = true;
        }
        
        // Handle color
        const colorValue = getStyledPropertyValue(node, 'color') || getStyledPropertyValue(node, 'Color');
        if (colorValue) {
          normalized.color = colorValue;
        }
        
        // Handle fontSize
        const fontSizeValue = getStyledPropertyValue(node, 'fontSize') || getStyledPropertyValue(node, 'FontSize');
        if (fontSizeValue) {
          normalized.fontSize = fontSizeValue;
        }
        
        // Clean up any style objects - we've extracted what we need
        delete normalized.style;
        
        // Ensure we remove any non-standard properties that might confuse Plate
        delete normalized.Bold;
        delete normalized.Italic;
        delete normalized.Underline;
        delete normalized.Strikethrough;
        delete normalized.Color;
        delete normalized.FontSize;
        delete normalized['font-weight'];
        delete normalized['font-style'];
        
        return normalized;
      }
      
      // Handle strings
      if (typeof node === 'string') {
        return { text: node };
      }
      
      // Default case
      return node;
    };
    
    return content.map(processNode);
  };
  
  const createPdfFromContent = (content: any[], options: PdfCreationOptions = {}) => {
    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4',
    });

    // First, normalize the content to ensure consistent formatting
    const normalizedContent = normalizeContentFormat(content);
    
    // Set up initial position and line height
    const margin = 20;
    let yPos = margin;
    const lineHeight = 7;
    const pageHeight = doc.internal.pageSize.height;
    const maxWidth = doc.internal.pageSize.width - (margin * 2);
    let listCounters: { [key: number]: number } = {};
    
    // Add title if provided
    if (options.title) {
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(16);
      doc.text(options.title, margin, yPos);
      yPos += lineHeight * 2;
    }

    // Process the document
    normalizedContent.forEach((node) => processNode(node));
    
    // Function to process a node and its children
    function processNode(node: any, level: number = 0) {
      // Reset styles for new block
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);

      let indent = margin + (level * 10);
      
      // Handle different node types depending on Plate's structure
      if (node.type === 'p' && node.indent && node.indent > 0) {
        // This is likely a list item from IndentListPlugin
        
        // Determine if it's a numbered list or bullet list
        const isNumbered = node.listStyleType === 'decimal' || node.listStyleType === 'number';
        
        // Set indent based on the indent level
        indent = margin + (node.indent * 10);
        
        // Generate appropriate marker
        let marker = '';
        if (isNumbered) {
          // For numbered lists
          listCounters[node.indent] = (listCounters[node.indent] || 0) + 1;
          marker = `${listCounters[node.indent]}. `;
        } else {
          // For bullet points
          marker = '• ';
        }
        
        // Draw the marker
        doc.text(marker, indent - 10, yPos);
        indent += 5; // Add space after marker
      }
      
      // Continue with normal node processing
      if (node.children) {
        let currentText = '';
        let currentDecorations: Function[] = [];

        node.children.forEach((child: any) => {
          if (typeof child === 'string') {
            currentText += child;
          } else if (child.type) {
            // Process structured child node recursively
            if (currentText) {
              // Render accumulated text before processing child
              const textWidth = maxWidth - (indent - margin);
              const lines = doc.splitTextToSize(currentText, textWidth);
              lines.forEach((line: string) => {
                if (yPos > pageHeight - margin) {
                  doc.addPage();
                  yPos = margin;
                }
                doc.text(line, indent, yPos);
                currentDecorations.forEach(decoration => decoration(indent, doc.getTextWidth(line)));
                yPos += lineHeight;
              });
              currentText = '';
              currentDecorations = [];
            }
            
            // Process child node
            processNode(child, level + 1);
          } else {
            // Process text node with styling
            const processed = processTextNode(child);
            currentText += processed.text;
            currentDecorations = [...currentDecorations, ...processed.decorations];
          }
        });

        // Render any remaining text
        if (currentText) {
          const textWidth = maxWidth - (indent - margin);
          const lines = doc.splitTextToSize(currentText, textWidth);
          lines.forEach((line: string) => {
            if (yPos > pageHeight - margin) {
              doc.addPage();
              yPos = margin;
            }
            doc.text(line, indent, yPos);
            currentDecorations.forEach(decoration => decoration(indent, doc.getTextWidth(line)));
            yPos += lineHeight;
          });
        }
      }

      // Add spacing after blocks
      if (node.type === 'p') {
        yPos += lineHeight / 2;
      }
    }
    
    // Function to process text nodes with styling
    function processTextNode(node: any) {
      let text = node.text || '';
      const decorations: ((x: number, width: number) => void)[] = [];
      
      // Handle text styling
      const fontStyle = [];
      // Use recursive property checks
      if (hasStyledProperty(node, 'bold') || hasStyledProperty(node, 'Bold') || 
          hasStyledProperty(node, 'fontWeight') || 
          getStyledPropertyValue(node, 'fontWeight') === 'bold' ||
          getStyledPropertyValue(node, 'fontWeight') === '700') {
        fontStyle.push('bold');
      }
      
      if (hasStyledProperty(node, 'italic') || hasStyledProperty(node, 'Italic') ||
          getStyledPropertyValue(node, 'fontStyle') === 'italic') {
        fontStyle.push('italic');
      }
      doc.setFont('Helvetica', fontStyle.length ? fontStyle.join('-') : 'normal');

      // Handle text color
      if (node.color || node.Color || node.style?.color) {
        try {
          const colorValue = node.color || node.Color || node.style?.color;
          const { r, g, b } = parseColor(colorValue);
          doc.setTextColor(r, g, b);
        } catch (e) {
          console.warn('Color parsing failed:', e);
          doc.setTextColor(0, 0, 0);
        }
      }

      // Handle font size
      if (node.fontSize || node.FontSize || node.style?.fontSize) {
        const sizeValue = node.fontSize || node.FontSize || node.style?.fontSize;
        const ptSize = parseFloat(sizeValue) * 0.75;
        doc.setFontSize(ptSize);
      }

      // Handle underline and strikethrough
      if (node.underline || node.Underline || node.style?.textDecoration === 'underline') {
        decorations.push((x: number, width: number) => {
          doc.line(x, yPos + 1, x + width, yPos + 1);
        });
      }

      if (node.strikethrough || node.Strikethrough || node.style?.textDecoration === 'line-through') {
        decorations.push((x: number, width: number) => {
          doc.line(x, yPos - 2, x + width, yPos - 2);
        });
      }

      return { text, decorations };
    }
    
    // Save locally if requested
    if (options.saveLocally && options.filename) {
      doc.save(options.filename);
    }
    
    return doc;
  };

  // Now update the exportToPDF function to use the shared utility
  const exportToPDF = useCallback(async () => {
    try {
      setIsExporting(true);
      setShowExportDialog(false);
      toast.loading("Exporting to PDF...", { id: "export-pdf" });
      
      // Create the PDF document using the shared utility
      const doc = createPdfFromContent(editor.children, {
        saveLocally: true,
        filename: `${pdfFileName}.pdf`
      });
      
      toast.success("PDF exported successfully!", { id: "export-pdf" });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to export PDF",
        { id: "export-pdf" }
      );
    } finally {
      setIsExporting(false);
    }
  }, [editor, pdfFileName]);

  const handleShareButtonClick = useCallback(() => {
    setRecipientEmail("");
    setEmailSubject("Shared Notes");
    setShareMessage("");
    
    // Set default custom sender email from localStorage if available
    const storedEmail = localStorage.getItem('lastCustomSenderEmail');
    if (storedEmail) {
      setCustomSenderEmail(storedEmail);
    } else {
      setCustomSenderEmail("");
    }
    
    setShowShareDialog(true);
  }, []);

  const handleShareDialogClose = useCallback(() => {
    setShowShareDialog(false);
  }, []);

  // Update the shareViaEmail function to use the shared utility
  const shareViaEmail = useCallback(async () => {
    try {
      setIsSharing(true);
      setShowShareDialog(false);
      toast.loading("Sending your notes via email...", { id: "share-notes" });
      
      // Generate a filename for the PDF
      const pdfFilename = `${emailSubject.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
      
      // Create the PDF document using the shared utility
      const doc = createPdfFromContent(editor.children);
      
      // Get PDF as base64 string
      const pdfBase64 = doc.output('datauristring').split(',')[1];
      
      // Call the backend to send the email with PDF attachment
      const result = await sendEmailAction({
        recipientEmail,
        subject: emailSubject,
        message: shareMessage || "Shared note as PDF attachment.",
        attachmentName: pdfFilename,
        attachmentData: pdfBase64,
        contentType: "application/pdf"
      });
      
      // Check if we're in fallback mode (direct sending failed)
      const isFallbackResult = (result as FallbackEmailResult).fallbackMode === true;
      
      if (isFallbackResult) {
        const fallbackResult = result as FallbackEmailResult;
        // Save the PDF locally for manual attachment
        doc.save(pdfFilename);
        
        // Open the mailto URL
        if (fallbackResult.mailtoUrl) {
          window.location.href = fallbackResult.mailtoUrl;
        }
        
        toast.success("PDF downloaded for manual attachment. Opening email client...", { id: "share-notes" });
      } else {
        // Direct email sending succeeded
        toast.success(result.message || "Email sent successfully!", { id: "share-notes" });
      }
    } catch (error) {
      console.error("Error sharing notes:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to share notes",
        { id: "share-notes" }
      );
    } finally {
      setIsSharing(false);
    }
  }, [editor, recipientEmail, emailSubject, shareMessage, sendEmailAction]);

  const handleSetSenderEmail = useCallback(async () => {
    if (!customSenderEmail.trim()) return;
    
    try {
      setIsSettingSender(true);
      const result = await setSenderEmailAction({
        email: customSenderEmail.trim()
      });
      
      // Store in localStorage for future use
      localStorage.setItem('lastCustomSenderEmail', customSenderEmail.trim());
      
      toast.success(result.message);
    } catch (error) {
      console.error("Failed to set sender email:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to set sender email"
      );
    } finally {
      setIsSettingSender(false);
    }
  }, [customSenderEmail, setSenderEmailAction]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col h-full">
        {onUpdate && (
          <div className="sticky top-0 z-10 flex items-center justify-between p-2 bg-white border-b">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => saveContent(true)}
                variant="outline"
                className="flex items-center gap-2"
                disabled={!isDirty || isSaving}
              >
                {isSaving ? (
                  <>
                    <span className="w-4 h-4 animate-spin">◌</span>
                    Saving...
                  </>
                ) : (
                  <>
                    <SaveIcon className="w-4 h-4" />
                    Save
                  </>
                )}
              </Button>
              <Button
                onClick={organizeNotes}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isOrganizing}
              >
                {isOrganizing ? (
                  <>
                    <span className="w-4 h-4 animate-spin">◌</span>
                    Organizing...
                  </>
                ) : (
                  <>
                    <ListFilterIcon className="w-4 h-4" />
                    Organize Notes
                  </>
                )}
              </Button>
              <Button
                onClick={generateConceptMap}
                variant="outline"
                className="flex items-center gap-2"
              >
                <NetworkIcon className="w-4 h-4" />
                Generate Concept Map
              </Button>
              <Button
                onClick={handleExportButtonClick}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isExporting}
              >
                {isExporting ? (
                  <>
                    <span className="w-4 h-4 animate-spin">◌</span>
                    Exporting...
                  </>
                ) : (
                  <>
                    <FileDownIcon className="w-4 h-4" />
                    Export PDF
                  </>
                )}
              </Button>
              <Button
                onClick={handleShareButtonClick}
                variant="outline"
                className="flex items-center gap-2"
                disabled={isSharing}
              >
                {isSharing ? (
                  <>
                    <span className="w-4 h-4 animate-spin">◌</span>
                    Sharing...
                  </>
                ) : (
                  <>
                    <ShareIcon className="w-4 h-4" />
                    Share via Email
                  </>
                )}
              </Button>
            </div>
            {lastSavedAt && (
              <span className="text-sm text-gray-500">
                {isAutoSaving
                  ? "Auto-saving..."
                  : `Last saved: ${lastSavedAt.toLocaleTimeString()}`}
              </span>
            )}
          </div>
        )}
        <Plate editor={editor} onChange={handleEditorChange}>
          <div className="relative">
            {showSearchBar && (
              <div className="sticky top-0 z-10 p-2 mb-2 border-b border-gray-200 bg-background">
                <SearchBar />
              </div>
            )}
            <EditorContainer>
              <Editor placeholder="Type here..." autoFocus />
            </EditorContainer>
            <div className="absolute top-2 right-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSearchBar((prev) => !prev)}
                title="Search (Ctrl+F)"
              >
                <SearchIcon className="w-4 h-4" />
                {!showSearchBar && <span className="ml-2">Search</span>}
              </Button>
            </div>
          </div>
        </Plate>

        {/* PDF Export Dialog */}
        <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export PDF</DialogTitle>
              <DialogDescription>
                Enter a name for your PDF file.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Input
                id="pdf-filename"
                value={pdfFileName}
                onChange={(e) => setPdfFileName(e.target.value)}
                placeholder="Enter file name"
                className="w-full"
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleExportDialogClose}>
                Cancel
              </Button>
              <Button onClick={exportToPDF} disabled={!pdfFileName.trim()}>
                Export
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Share via Email Dialog */}
        <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share via Email</DialogTitle>
              <DialogDescription>
                Enter recipient's email and customize the message. The note will be attached as a PDF.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div>
                <label htmlFor="recipient-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Email
                </label>
                <Input
                  id="recipient-email"
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="example@example.com"
                  className="w-full"
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="email-subject" className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <Input
                  id="email-subject"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full"
                />
              </div>
              <div>
                <label htmlFor="email-message" className="block text-sm font-medium text-gray-700 mb-1">
                  Message (Optional)
                </label>
                <Input
                  id="email-message"
                  value={shareMessage}
                  onChange={(e) => setShareMessage(e.target.value)}
                  placeholder="Add a message to your email"
                  className="w-full"
                />
              </div>
              
              {/* Required Sender Email Section */}
              <div className="border-t pt-4 mt-4">
                <div>
                  <label htmlFor="custom-sender" className="block text-sm font-medium text-gray-700 mb-1">
                    Sender Email (required for automatic sending)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-sender"
                      type="email"
                      value={customSenderEmail}
                      onChange={(e) => setCustomSenderEmail(e.target.value)}
                      placeholder="your-verified-email@gmail.com"
                      className="flex-grow"
                    />
                    <Button 
                      onClick={handleSetSenderEmail} 
                      disabled={!customSenderEmail.trim() || isSettingSender}
                      className="whitespace-nowrap"
                      size="sm"
                    >
                      {isSettingSender ? "Setting..." : "Set Sender"}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    This must be your verified email in SendGrid.
                  </p>
                </div>
              </div>
              
              {/* Advanced Debugging Section - Collapsible */}
              <details className="mt-2">
                <summary className="cursor-pointer text-xs text-gray-500">Troubleshooting Info</summary>
                <div className="mt-2 p-3 bg-gray-50 rounded text-xs">
                  <p>To ensure proper email delivery:</p>
                  <ol className="list-decimal ml-4 mt-1 space-y-1">
                    <li>Use a verified email as the sender</li>
                    <li>Verify this email in the SendGrid dashboard</li>
                    <li>If automatic sending fails, the app will fall back to your local email client</li>
                  </ol>
                </div>
              </details>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleShareDialogClose}>
                Cancel
              </Button>
              <Button 
                onClick={shareViaEmail} 
                disabled={!recipientEmail.trim() || !emailSubject.trim() || !customSenderEmail.trim()}
              >
                Send Email with PDF
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndProvider>
  );
}

