import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { Modal, Input, Button, InputRef, App } from 'antd';
import { Bold, Italic, List, CheckSquare } from 'lucide-react';
import { RichTextEditor, formatText } from './RichTextEditor';
import { ChecklistEditor } from './ChecklistEditor';
import { FormLayout } from './FormLayout';
import { NoteType, ChecklistItem, convertTextToChecklist, convertChecklistToText, isNoteEmpty, createEmptyChecklistItem } from '../../types/notes';
import { DEFAULT_NOTE_COLOR, NOTE_COLORS } from '../../utils/colorUtils';

type ComposerState = 'COLLAPSED' | 'EXPANDED_TEXT' | 'EXPANDED_CHECKLIST';

interface NoteComposerModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (note: {
    title: string;
    type: NoteType;
    content?: string;
    items?: ChecklistItem[];
    color: string;
  }) => Promise<void>;
  initialNote?: {
    id?: number;
    title: string;
    type: NoteType;
    content?: string;
    items?: ChecklistItem[];
    color: string;
  } | null;
}

export function NoteComposerModal({ open, onClose, onSave, initialNote }: Readonly<NoteComposerModalProps>) {
  const { message } = App.useApp();
  const [state, setState] = useState<ComposerState>('COLLAPSED');
  const [noteType, setNoteType] = useState<NoteType>(initialNote?.type || 'TEXT_NOTE');
  const [title, setTitle] = useState(initialNote?.title || '');
  const [content, setContent] = useState(initialNote?.content || '');
  const [items, setItems] = useState<ChecklistItem[]>(
    initialNote?.items && initialNote.items.length > 0
      ? initialNote.items
      : [createEmptyChecklistItem(0)]
  );
  const [color, setColor] = useState(() => {
    const initial = initialNote?.color || DEFAULT_NOTE_COLOR;
    return NOTE_COLORS.includes(initial as any) ? initial : NOTE_COLORS[0];
  });
  const [isSaving, setIsSaving] = useState(false);

  const titleInputRef = useRef<InputRef>(null);
  const hasChangesRef = useRef(false);

  // Initialize from initialNote
  useEffect(() => {
    if (initialNote) {
      setTitle(initialNote.title || '');
      setNoteType(initialNote.type || 'TEXT_NOTE');
      setContent(initialNote.content || '');

      // Convert backend items format to ChecklistItem format
      if (initialNote.items && initialNote.items.length > 0) {
        const convertedItems: ChecklistItem[] = initialNote.items.map((item, index) => {
          // Check if item is already in ChecklistItem format
          if ('id' in item && 'isChecked' in item && typeof item.isChecked === 'boolean') {
            return item as ChecklistItem;
          }

          // Convert from backend format {text, checked}
          const backendItem = item as { text?: string; checked?: boolean; id?: string };
          return {
            id: backendItem.id || `item-${Date.now()}-${index}`,
            text: backendItem.text || '',
            isChecked: backendItem.checked || false,
            order: 'order' in item && typeof item.order === 'number' ? item.order : index,
            indentLevel: 'indentLevel' in item && typeof item.indentLevel === 'number' ? item.indentLevel : 0,
            parentId: 'parentId' in item ? (item.parentId as string | null) : null,
            createdAt: 'createdAt' in item && typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
            updatedAt: 'updatedAt' in item && typeof item.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
          };
        });
        setItems(convertedItems);
      } else {
        setItems([createEmptyChecklistItem(0)]);
      }

      const noteColor = initialNote.color || DEFAULT_NOTE_COLOR;
      setColor(NOTE_COLORS.includes(noteColor as any) ? noteColor : NOTE_COLORS[0]);
      setState(initialNote.type === 'CHECKLIST_NOTE' ? 'EXPANDED_CHECKLIST' : 'EXPANDED_TEXT');
      hasChangesRef.current = false;
    } else {
      // New note
      setTitle('');
      setNoteType('TEXT_NOTE');
      setContent('');
      setItems([createEmptyChecklistItem(0)]);
      setColor(DEFAULT_NOTE_COLOR);
      setState('COLLAPSED');
      hasChangesRef.current = false;
    }
  }, [initialNote, open]);

  // Track changes
  useEffect(() => {
    if (open) {
      hasChangesRef.current = true;
    }
  }, [title, content, items, color, noteType, open]);

  const handleOpen = () => {
    if (initialNote) {
      setState(initialNote.type === 'CHECKLIST_NOTE' ? 'EXPANDED_CHECKLIST' : 'EXPANDED_TEXT');
    } else {
      setState('EXPANDED_TEXT');
    }
    setTimeout(() => {
      if (titleInputRef.current) {
        titleInputRef.current.focus();
      }
    }, 100);
  };

  const handleClose = async () => {
    const isEmpty = isNoteEmpty({ title, content, items });

    if (isEmpty) {
      // Empty note: close without saving
      onClose();
      return;
    }

    // Non-empty: save and close
    if (hasChangesRef.current) {
      await handleSave();
    } else {
      onClose();
    }
  };

  const handleSave = async () => {
    if (!title.trim() && noteType === 'TEXT_NOTE' && !content.trim()) {
      message.warning("Title is required");
      return;
    }

    setIsSaving(true);
    try {
      // Convert ChecklistItem[] to backend format
      let backendItems: ChecklistItem[] | undefined = undefined;
      if (noteType === 'CHECKLIST_NOTE' && items.length > 0) {
        backendItems = items
          .filter(item => item.text.trim() !== '')
          .map(item => ({
            id: item.id,
            text: item.text,
            isChecked: item.isChecked,
            order: item.order,
            indentLevel: item.indentLevel,
            parentId: item.parentId || null,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt,
          }));
      }

      await onSave({
        title: title.trim() || 'Untitled',
        type: noteType,
        content: noteType === 'TEXT_NOTE' ? content : undefined,
        items: backendItems,
        color,
      });
      hasChangesRef.current = false;
      onClose();
    } catch (_error) {
      message.error("Failed to save note");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTypeToggle = () => {
    if (noteType === 'TEXT_NOTE') {
      // Convert to checklist
      const newItems = convertTextToChecklist(content);
      setItems(newItems);
      setContent('');
      setNoteType('CHECKLIST_NOTE');
      setState('EXPANDED_CHECKLIST');
    } else {
      // Convert to text
      const newContent = convertChecklistToText(items);
      setContent(newContent);
      setItems([createEmptyChecklistItem(0)]);
      setNoteType('TEXT_NOTE');
      setState('EXPANDED_TEXT');
    }
    hasChangesRef.current = true;
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Esc: save and close (or close if empty)
    if (e.key === 'Escape' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleClose();
    }

    // Ctrl/Cmd+Enter: save and close
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    }
  };

  const handleFormat = (type: string) => {
    if (noteType === 'TEXT_NOTE') {
      formatText(type);
      setTimeout(() => {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const container = range.commonAncestorContainer;
          const editor = container.nodeType === Node.TEXT_NODE
            ? container.parentElement?.closest('.rich-text-editor')
            : container.nodeType === Node.ELEMENT_NODE
              ? (container as Element).closest('.rich-text-editor')
              : null;

          if (editor) {
            setContent(editor.innerHTML);
          }
        }
      }, 0);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width="min(500px, 95vw)"
      centered
      className="rounded-[16px] overflow-hidden"
      destroyOnHidden
      styles={{
        body: {
          padding: 0,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
        }
      }}
      afterOpenChange={(visible) => {
        if (visible) {
          handleOpen();
        }
      }}
    >
      <div onKeyDown={handleKeyDown} tabIndex={-1} className="flex flex-col flex-1 min-h-0">
        <FormLayout
          title={initialNote ? 'Edit Note' : 'Add Note'}
          subtitle="Create a new sticky note for quick reminders and tasks."
          onCancel={handleClose}
          onSubmit={handleSave}
          submitLabel={initialNote ? 'Update Note' : 'Add Note'}
          isLoading={isSaving}
          isEditing={!!initialNote}
        >
            <div className="flex flex-col space-y-4">
              {/* Title Input */}
              <div>
                <span className="text-sm font-medium text-[#666666] mb-2 block">Title</span>
                <Input
                  ref={titleInputRef}
                  placeholder="Note title"
                  className="rounded-lg font-medium"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    hasChangesRef.current = true;
                  }}
                />
              </div>

              {/* Type Toggle Button */}
              <div className="flex items-center justify-between">
                <Button
                  type="text"
                  onClick={handleTypeToggle}
                  className="text-xs font-medium text-[#666666] hover:text-[#111111] p-0 h-auto"
                >
                  {noteType === 'TEXT_NOTE' ? (
                    <>
                      <CheckSquare className="size-4 inline mr-1" />
                      Show checkboxes
                    </>
                  ) : (
                    <>
                      <List className="size-4 inline mr-1" />
                      Hide checkboxes
                    </>
                  )}
                </Button>

                {/* Formatting Buttons (only for text notes) - Google Keep style: minimal formatting */}
                {noteType === 'TEXT_NOTE' && (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => handleFormat('bold')} className="p-1 hover:bg-[#F7F7F7] rounded transition-colors" title="Bold" aria-label="Bold">
                      <Bold className="size-4 text-[#666666]" />
                    </button>
                    <button type="button" onClick={() => handleFormat('italic')} className="p-1 hover:bg-[#F7F7F7] rounded transition-colors" title="Italic" aria-label="Italic">
                      <Italic className="size-4 text-[#666666]" />
                    </button>
                  </div>
                )}
              </div>

              {/* Content Editor */}
              <div
                className="border border-[#d9d9d9] rounded-lg overflow-hidden flex flex-col"
                style={{
                  minHeight: '200px',
                  maxHeight: '400px'
                }}
              >
                {noteType === 'TEXT_NOTE' ? (
                  <RichTextEditor
                    value={content}
                    onChange={(newContent) => {
                      setContent(newContent);
                      hasChangesRef.current = true;
                    }}
                    placeholder="Note content..."
                    style={{ minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}
                  />
                ) : (
                  <div
                    className="p-3"
                    style={{
                      maxHeight: '400px',
                      overflowY: 'auto',
                      flex: 1,
                      minHeight: 0
                    }}
                  >
                    <ChecklistEditor
                      items={items}
                      onChange={(newItems) => {
                        setItems(newItems);
                        hasChangesRef.current = true;
                      }}
                      placeholder="List"
                    />
                  </div>
                )}
              </div>

              {/* Color Picker */}
              <div>
                <span className="text-sm font-medium text-[#666666] mb-2 block">Color</span>
                <div className="flex gap-2 flex-wrap">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      className={`w-10 h-10 rounded-lg border-2 transition-colors ${color === c ? 'border-[#111111]' : 'border-transparent hover:border-[#ff3b3b]'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Select color ${c}`}
                      aria-pressed={color === c}
                      type="button"
                      onClick={() => {
                        setColor(c);
                        hasChangesRef.current = true;
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
        </FormLayout>
      </div>
    </Modal>
  );
}
