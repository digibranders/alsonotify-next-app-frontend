import { useState, useEffect, useRef, KeyboardEvent } from 'react';

import { Modal, Button, Input, App } from 'antd';
import { Note, ChecklistItem } from '../../types/domain';
import { updateNote } from '../../services/notes';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RichTextEditor, formatText } from './RichTextEditor';
import { ChecklistEditor } from './ChecklistEditor';
import { queryKeys } from "../../lib/queryKeys";
import { Bold, Italic, List, CheckSquare } from 'lucide-react';
import type { InputRef } from 'antd';
import { NoteType, convertTextToChecklist, convertChecklistToText, createEmptyChecklistItem } from '../../types/notes';

interface NoteViewModalProps {
  open: boolean;
  note: Note | null;
  onClose: () => void;
  onEdit?: (note: Note) => void; // Optional - modal is now directly editable
  onArchive?: (id: number) => void;
  onDelete?: (id: number) => void;
}

export function NoteViewModal({ open, note, onClose }: NoteViewModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();

  // Editable state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [noteType, setNoteType] = useState<NoteType>('TEXT_NOTE');
  const [color, setColor] = useState('#ff3b3b');
  const [hasChanges, setHasChanges] = useState(false);

  const titleInputRef = useRef<InputRef>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize from note
  useEffect(() => {
    if (note) {
      // Omit title/content from deps to avoid overwrite loop when syncing from note.
      if (note.title !== title) setTitle(note.title || '');
      if (note.content !== content) setContent(note.content || '');
      // Normalize type: backend might return 'text'/'checklist', but we use 'TEXT_NOTE'/'CHECKLIST_NOTE'
      const normalizedType = (note.type === 'TEXT_NOTE' || (note.type as any) === 'text') ? 'TEXT_NOTE' : 'CHECKLIST_NOTE';
      if (normalizedType !== noteType) setNoteType(normalizedType);
      setColor(note.color || '#ff3b3b');

      // Convert items to ChecklistItem format
      if (note.items && Array.isArray(note.items) && note.items.length > 0) {
        const convertedItems: ChecklistItem[] = note.items.map((item: Partial<ChecklistItem> & { checked?: boolean }, index: number): ChecklistItem => {
          if (item.id && typeof item.isChecked === 'boolean') {
            return item as ChecklistItem;
          } else {
            return {
              id: item.id || `item-${Date.now()}-${index}`,
              text: item.text || '',
              isChecked: item.checked !== undefined ? item.checked : (item.isChecked || false),
              order: item.order !== undefined ? item.order : index,
              indentLevel: item.indentLevel || 0,
              parentId: item.parentId || null,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            };
          }
        });
        setItems(prevItems => {
          // Check for differences
          const isDifferent = convertedItems.length !== prevItems.length ||
            convertedItems.some((c, i) => {
              const p = prevItems[i];
              return c.id !== p.id || c.text !== p.text || c.isChecked !== p.isChecked;
            });
          return isDifferent ? convertedItems : prevItems;
        });
      } else {
        setItems([createEmptyChecklistItem(0)]);
      }
      setHasChanges(false);

      // Focus title input when modal opens
      setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
        }
      }, 100);
    }
    // Run only when note/open change; omit title/content/color/noteType/items to prevent overwrite loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note, open]);

  const updateMutation = useMutation({
    mutationFn: (params: { id: number; data: any }) => updateNote(params.id, params.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes.all() });
      setHasChanges(false);
    },
    onError: () => message.error("Failed to update note")
  });

  // Auto-save with debounce
  const handleSave = async () => {
    if (!note || !hasChanges) return;

    // Convert ChecklistItem[] to backend format
    let backendItems = undefined;
    if (noteType === 'CHECKLIST_NOTE' && items.length > 0) {
      backendItems = items
        .filter(item => item.text.trim() !== '')
        .map(item => ({
          text: item.text,
          checked: item.isChecked,
          id: item.id,
          order: item.order,
          indentLevel: item.indentLevel,
        }));
    }

    await updateMutation.mutateAsync({
      id: note.id,
      data: {
        title: title.trim() || 'Untitled',
        type: noteType === 'TEXT_NOTE' ? 'text' : 'checklist',
        content: noteType === 'TEXT_NOTE' ? content : undefined,
        items: backendItems,
        color,
      }
    });
  };

  // Debounced auto-save
  useEffect(() => {
    if (hasChanges && note) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        handleSave();
      }, 1000); // Auto-save after 1 second of no changes
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [title, content, items, color, noteType, hasChanges]);

  const handleTypeToggle = () => {
    if (noteType === 'TEXT_NOTE') {
      // Convert to checklist
      const newItems = convertTextToChecklist(content);
      setItems(newItems);
      setContent('');
      setNoteType('CHECKLIST_NOTE');
    } else {
      // Convert to text
      const newContent = convertChecklistToText(items);
      setContent(newContent);
      setItems([createEmptyChecklistItem(0)]);
      setNoteType('TEXT_NOTE');
    }
    setHasChanges(true);
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
            setHasChanges(true);
          }
        }
      }, 0);
    }
  };

  const handleClose = async () => {
    // Save any pending changes before closing
    if (hasChanges && note) {
      await handleSave();
    }
    onClose();
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Esc: close (after saving)
    if (e.key === 'Escape' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handleClose();
    }
  };

  if (!note) return null;

  const isTextNote = noteType === 'TEXT_NOTE';

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={null}
      width={500}
      centered
      className="rounded-[16px] overflow-hidden"
      destroyOnHidden
      styles={{
        body: {
          height: 'auto',
          maxHeight: '85vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px'
        }
      }}
    >
      <div onKeyDown={handleKeyDown} tabIndex={-1}>
        {/* Editable Title */}
        <div className="mb-4 flex-shrink-0">
          <Input
            ref={titleInputRef}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setHasChanges(true);
            }}
            placeholder="Title"
            className="text-[20px] font-['Manrope:SemiBold',sans-serif] border-none p-0 shadow-none focus:shadow-none hover:border-none"
            style={{ fontSize: '20px', fontWeight: 600 }}
          />
        </div>

        {/* Type Toggle and Formatting Buttons */}
        <div className="flex items-center justify-between mb-3 flex-shrink-0">
          <Button
            type="text"
            onClick={handleTypeToggle}
            className="text-[13px] font-['Manrope:Medium',sans-serif] text-[#666666] hover:text-[#111111] p-0 h-auto"
          >
            {isTextNote ? (
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

          {/* Formatting Buttons (only for text notes) */}
          {isTextNote && (
            <div className="flex gap-1">
              <button onClick={() => handleFormat('bold')} className="p-1 hover:bg-[#F7F7F7] rounded transition-colors" title="Bold">
                <Bold className="size-4 text-[#666666]" />
              </button>
              <button onClick={() => handleFormat('italic')} className="p-1 hover:bg-[#F7F7F7] rounded transition-colors" title="Italic">
                <Italic className="size-4 text-[#666666]" />
              </button>
            </div>
          )}
        </div>

        {/* Editable Content Area - Scrollable */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <div
            className="flex-1 overflow-y-auto overflow-x-hidden"
            style={{ minHeight: 0 }}
          >
            {isTextNote ? (
              <div
                className="border border-[#d9d9d9] rounded-lg overflow-hidden flex flex-col"
                style={{
                  minHeight: '200px',
                  maxHeight: '550px'
                }}
              >
                <RichTextEditor
                  value={content}
                  onChange={(newContent) => {
                    setContent(newContent);
                    setHasChanges(true);
                  }}
                  placeholder="Note content..."
                  style={{ height: '100%', maxHeight: '550px' }}
                />
              </div>
            ) : (
              <div
                className="border border-[#d9d9d9] rounded-lg overflow-hidden flex flex-col"
                style={{
                  minHeight: '200px',
                  maxHeight: '550px',
                  overflowY: 'auto'
                }}
              >
                <div className="p-3">
                  <ChecklistEditor
                    items={items}
                    onChange={(newItems) => {
                      setItems(newItems);
                      setHasChanges(true);
                    }}
                    placeholder="List"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Color Picker */}
          <div className="mt-4 flex-shrink-0">
            <div className="flex gap-2">
              {['#ff3b3b', '#3b8eff', '#9b59b6', '#FFA500', '#2ecc71', '#e74c3c'].map((c) => (
                <button
                  key={c}
                  className={`w-10 h-10 rounded-lg border-2 transition-colors ${color === c ? 'border-[#111111]' : 'border-transparent hover:border-[#ff3b3b]'}`}
                  style={{ backgroundColor: c }}
                  onClick={() => {
                    setColor(c);
                    setHasChanges(true);
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons - Always Visible */}
        <div className="flex items-center justify-end gap-4 pt-4 mt-6 border-t border-[#EEEEEE] flex-shrink-0">
          <Button
            type="text"
            onClick={handleClose}
            className="h-[44px] px-4 text-[14px] font-['Manrope:SemiBold',sans-serif] text-[#666666] hover:text-[#111111] hover:bg-[#F7F7F7] transition-colors rounded-lg"
          >
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
}
