import { PageLayout } from '../../layout/PageLayout';
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useTabSync } from '@/hooks/useTabSync';
import { useNotes, useCreateNote, useUpdateNote, useDeleteNote, useArchiveNote, useUnarchiveNote } from '../../../hooks/useNotes';
import { sanitizeRichText } from '../../../utils/sanitizeHtml';
import { Plus, Archive, Trash2, FileText, ArchiveRestore } from 'lucide-react';
import { Checkbox, App } from 'antd';
import { Skeleton } from '../../ui/Skeleton';
import { NoteComposerModal } from '../../common/NoteComposerModal';
import { NoteViewModal } from '../../common/NoteViewModal';
import { Note, ChecklistItem } from '../../../types/domain';
import { NoteTypeDto as NoteType } from '../../../types/dto/note.dto';
import { DEFAULT_NOTE_COLOR } from '../../../utils/colorUtils';
import { isArray } from '../../../utils/validation';
import { normalizeNoteType } from '../../../utils/noteUtils';

type TabType = 'all' | 'text' | 'checklist' | 'archive';

interface NoteSaveData {
  title: string;
  type: NoteType;
  content?: string;
  items?: ChecklistItem[];
  color: string;
}

export function NotesPage() {
  const { message, modal } = App.useApp();
  const messageRef = useRef(message);
  const modalRef = useRef(modal);

  useEffect(() => {
    messageRef.current = message;
    modalRef.current = modal;
  }, [message, modal]);
  /* Manual router/params removed */
  const [activeTab, setActiveTab] = useTabSync<TabType>({
    defaultTab: 'all',
    validTabs: ['all', 'text', 'checklist', 'archive']
  });

  // Sync activeTab with URL - handled by useTabSync

  const [searchQuery, setSearchQuery] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [viewingNote, setViewingNote] = useState<Note | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState<number>(280);

  // Fetch all notes (both archived and non-archived) for accurate tab counts
  // Using separate queries for better cache management
  const { data: nonArchivedData, isLoading: isLoadingNonArchived } = useNotes(0, 100, false);
  const { data: archivedData, isLoading: isLoadingArchived } = useNotes(0, 100, true);

  const isLoading = isLoadingNonArchived || isLoadingArchived;

  // Memoize notes list to avoid unnecessary recalculations
  const notesList: Note[] = useMemo(() => {
    const nonArchived = isArray<Note>(nonArchivedData?.result) ? nonArchivedData.result : [];
    const archived = isArray<Note>(archivedData?.result) ? archivedData.result : [];
    return [...nonArchived, ...archived];
  }, [nonArchivedData, archivedData]);

  // Mutations with proper error handling
  const createMutation = useCreateNote();
  const updateMutation = useUpdateNote();
  const deleteMutation = useDeleteNote();
  const archiveMutation = useArchiveNote();
  const unarchiveMutation = useUnarchiveNote();

  // Add onSuccess/onError handling manually if needed since hooks don't accept them in my helper?
  // Actually my hooks wrapped invalidate. Messages were in onSuccess relative to component state.
  // I need to adapt the component to use the mutation result or side effects.
  // Wait, my hook definitions had hardcoded onSuccess.
  // The component logic had messageApi.success and setShowDialog(false).
  // I should pass options to my hooks or keep using useMutation directly if I want custom side effects 
  // OR update my hooks to accept options.

  /* Retaining direct useMutation for now to preserve specific UI logic (message, state updates)
     OR I should refactor my hook to accept callbacks.
     Let's Update useUI logic to use the mutations returned by the hooks, 
     but since my hooks pre-define mutationFn, I can attach .mutate(variables, { onSuccess }) in the handlers.
     Wait, useMutation returns an object with .mutate(vars, options). Options can override onSuccess?
     Yes, usually options in mutate override or chain? 
     Actually, passing onSuccess to useMutation(options) is the main way.
     If I wrap useMutation, I should allow passing options.
     
     Let's stick to using the imported service functions for mutations if specific logic is complex, 
     BUT the goal is "Move mapping into React Query hooks". Mutations don't usually mapping return, 
     except maybe mapping the response. The response of createNote is ApiResponse<NoteDto>.
     The component doesn't use the response data much, just invalidates.
     
     I will keep the mutations as they are in the component (using imported service functions) 
     but change the Queries to use useNotes hook as that's where the READ mapping happens.
     
     The prompt specifically asked: "For every useQuery... Add/refine select... For every useMutation... Keep mutation functions unchanged... If the mutation result is consumed by UI, map it..."
     
     So I can leave mutations alone if they are correct.
     However, standardizing on useNotes for queries is key.
  */



  /**
   * Handle saving a note (create or update)
   */
  const handleSaveNote = useCallback(async (noteData: NoteSaveData) => {
    if (editingNote) {
      // Update existing note
      await updateMutation.mutateAsync({
        id: editingNote.id,
        data: {
          title: noteData.title,
          type: noteData.type,
          content: noteData.content,
          items: noteData.items,
          color: noteData.color,
        }
      });
    } else {
      // Create new note
      await createMutation.mutateAsync({
        title: noteData.title,
        type: noteData.type,
        content: noteData.content,
        items: noteData.items,
        color: noteData.color,
      });
    }
  }, [editingNote, createMutation, updateMutation]);

  /**
   * Handle note deletion with confirmation
   */
  const handleDelete = useCallback((noteId: number) => {
    modalRef.current.confirm({
      title: 'Delete Note',
      content: 'Are you sure you want to permanently delete this note? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteMutation.mutate(noteId)
    });
  }, [deleteMutation]);

  /**
   * Handle archiving a note
   */
  const handleArchive = useCallback((noteId: number) => {
    archiveMutation.mutate(noteId);
  }, [archiveMutation]);

  /**
   * Handle unarchiving a note
   */
  const handleUnarchive = useCallback((noteId: number) => {
    unarchiveMutation.mutate(noteId);
  }, [unarchiveMutation]);

  /**
   * Normalize note type for filtering
   * Helper function to handle both frontend and backend type formats
   */
  const normalizeNoteTypeForFilter = useCallback((type: string | NoteType): 'text' | 'checklist' => {
    if (type === 'TEXT_NOTE' || type === 'text') {
      return 'text';
    }
    return 'checklist';
  }, []);

  /**
   * Check if note matches search query
   */
  const matchesSearch = useCallback((note: Note, query: string): boolean => {
    if (!query.trim()) {
      return true;
    }

    const lowerQuery = query.toLowerCase();
    const titleMatch = note.title.toLowerCase().includes(lowerQuery);
    const contentMatch = note.content
      ? note.content.toLowerCase().includes(lowerQuery)
      : false;

    // Also search in checklist items
    const itemsMatch = note.items?.some(item =>
      item.text.toLowerCase().includes(lowerQuery)
    ) || false;

    return titleMatch || contentMatch || itemsMatch;
  }, []);

  /**
   * Filter notes by tab and search - memoized for performance
   */
  const filteredNotes = useMemo(() => {
    return notesList.filter(note => {
      // Handle archive tab
      if (activeTab === 'archive') {
        if (!note.is_archived) return false;
      } else {
        // Exclude archived notes from main tabs
        if (note.is_archived) return false;
      }

      // Filter by type
      const normalizedType = normalizeNoteTypeForFilter(note.type);
      if (activeTab === 'text' && normalizedType !== 'text') return false;
      if (activeTab === 'checklist' && normalizedType !== 'checklist') return false;

      // Search filter
      return matchesSearch(note, searchQuery);
    });
  }, [notesList, activeTab, searchQuery, matchesSearch, normalizeNoteTypeForFilter]);

  /**
   * Calculate tab counts - memoized for performance
   */
  const tabs = useMemo(() => {

    return [
      { id: 'all' as TabType, label: 'All Notes' },
      { id: 'text' as TabType, label: 'Text Notes' },
      { id: 'checklist' as TabType, label: 'Checklists' },
      { id: 'archive' as TabType, label: 'Archived' },
    ];
  }, []);

  // Calculate card height to fit exactly 2 rows without scrolling
  useEffect(() => {
    const calculateCardHeight = () => {
      if (!scrollContainerRef.current) return;

      const containerHeight = scrollContainerRef.current.clientHeight;
      if (containerHeight <= 0) return;

      // 2 rows + 1 gap (24px) + bottom padding (24px) = containerHeight
      // cardHeight * 2 + 24 + 24 = containerHeight
      // cardHeight = (containerHeight - 48) / 2
      const newCardHeight = Math.floor((containerHeight - 48) / 2);

      // Set minimum height of 200px and maximum of 350px for reasonable card sizes
      if (newCardHeight >= 200 && newCardHeight <= 350) {
        setCardHeight(newCardHeight);
      }
    };

    // Wait for container to be available, then calculate
    const checkAndCalculate = () => {
      if (scrollContainerRef.current && scrollContainerRef.current.clientHeight > 0) {
        calculateCardHeight();
      } else {
        // Retry after a short delay if container not ready
        setTimeout(checkAndCalculate, 50);
      }
    };

    // Initial check
    checkAndCalculate();

    // Use ResizeObserver for more reliable size tracking
    let resizeObserver: ResizeObserver | null = null;
    if (scrollContainerRef.current) {
      resizeObserver = new ResizeObserver((entries) => {
        entries.forEach(() => {
          calculateCardHeight();
        });
      });
      resizeObserver.observe(scrollContainerRef.current);
    }

    // Also listen to window resize as fallback
    window.addEventListener('resize', calculateCardHeight);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener('resize', calculateCardHeight);
    };
  }, []);

  return (
    <>
      <PageLayout
        title="Notes"
        tabs={tabs.map(tab => ({ id: tab.id, label: tab.label }))}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as TabType)}
        searchPlaceholder="Search notes by title or content..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        titleAction={{
          onClick: () => setShowDialog(true),
          label: 'Add Note',
          icon: <Plus className="size-5 text-[#ff3b3b]" strokeWidth={2} />
        }}
      >
        {/* Notes Grid */}
        <div
          className="h-full overflow-y-auto"
          ref={(el) => {
            scrollContainerRef.current = el;
            // Trigger calculation when ref is set
            if (el && el.clientHeight > 0) {
              const containerHeight = el.clientHeight;
              const newCardHeight = Math.floor((containerHeight - 48) / 2);
              if (newCardHeight >= 200 && newCardHeight <= 350) {
                setCardHeight(newCardHeight);
              }
            }
          }}
        >
          {isLoading ? (
            <div className="grid grid-cols-4 gap-6 pb-6" style={{ gridAutoRows: `${cardHeight}px` }}>
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-[#EEEEEE] p-4 flex flex-col animate-pulse">
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <Skeleton className="h-5 w-3/4" />
                    <div className="flex gap-1">
                      <Skeleton className="h-7 w-7 rounded-md" />
                      <Skeleton className="h-7 w-7 rounded-md" />
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-4/5" />
                    <div className="pt-4 space-y-2">
                      <Skeleton className="h-2 w-16" />
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-4 rounded" />
                        <Skeleton className="h-3 w-3/4" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-16 h-16 bg-[#FFF4F4] rounded-full flex items-center justify-center mb-4">
                <div className="text-[#ff3b3b]"><FileText className="size-8" /></div>
              </div>
              <h3 className="text-base font-semibold text-[#111111] mb-1">
                {activeTab === 'archive' ? 'Archive is empty' : 'No notes found'}
              </h3>
              <p className="text-xs font-medium text-[#666666]">
                {activeTab === 'archive' ? 'Archived notes will appear here' : 'Create your first note to get started'}
              </p>
            </div>
          ) : (
            <div
              className="grid grid-cols-4 gap-6 pb-6"
              style={{ gridAutoRows: `${cardHeight}px` }}
              ref={() => {
                // Grid container ref
              }}
            >
              {filteredNotes.map((note) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  onArchive={handleArchive}
                  onUnarchive={handleUnarchive}
                  onDelete={handleDelete}
                  onEdit={(note) => {
                    setEditingNote(note);
                    setShowDialog(true);
                  }}
                  onClick={(note) => {
                    setViewingNote(note);
                    setShowViewModal(true);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </PageLayout>

      {/* Note Composer Modal */}
      <NoteComposerModal
        open={showDialog}
        onClose={() => {
          setShowDialog(false);
          setEditingNote(null);
        }}
        onSave={handleSaveNote}
        initialNote={editingNote ? {
          id: editingNote.id,
          title: editingNote.title,
          type: normalizeNoteTypeForFilter(editingNote.type) === 'text' ? 'TEXT_NOTE' : 'CHECKLIST_NOTE',
          content: editingNote.content,
          items: editingNote.items ? editingNote.items.map((item, index) => {
            // Handle both backend format {text, checked} and frontend format ChecklistItem
            const isBackendFormat = 'checked' in item && !('isChecked' in item);

            return {
              id: item.id || `item-${editingNote.id}-${index}`,
              text: item.text || '',
              isChecked: isBackendFormat
                ? (item as { checked?: boolean }).checked || false
                : (item as ChecklistItem).isChecked || false,
              order: item.order !== undefined ? item.order : index,
              indentLevel: item.indentLevel || 0,
              parentId: item.parentId || null,
              createdAt: item.createdAt || new Date().toISOString(),
              updatedAt: item.updatedAt || new Date().toISOString(),
            };
          }) : undefined,
          color: editingNote.color || DEFAULT_NOTE_COLOR,
        } : null}
      />

      {/* Note View Modal */}
      <NoteViewModal
        open={showViewModal}
        note={viewingNote}
        onClose={() => {
          setShowViewModal(false);
          setViewingNote(null);
        }}
        onEdit={(note) => {
          setEditingNote(note);
          setShowViewModal(false);
          setShowDialog(true);
        }}
        onArchive={handleArchive}
        onDelete={handleDelete}
      />
    </>
  );
}

interface NoteCardProps {
  note: Note;
  onArchive: (id: number) => void;
  onUnarchive: (id: number) => void;
  onDelete: (id: number) => void;
  onEdit: (note: Note) => void;
  onClick: (note: Note) => void;
}

function NoteCard({ note, onArchive, onUnarchive, onDelete, onClick }: NoteCardProps) {
  const noteColor = note.color || DEFAULT_NOTE_COLOR;
  const borderColorNormal = '#EEEEEE';
  const borderColorHover = noteColor;

  return (
    <div
      className="relative group w-full h-full"
      ref={() => {
        // NoteCard ref
      }}
    >
      {/* Card with white background */}
      <div
        className="relative h-full w-full bg-white rounded-xl border transition-all duration-300 p-4 flex flex-col cursor-pointer hover:shadow-lg"
        style={{
          borderColor: borderColorNormal,
          borderWidth: '1px'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = borderColorHover;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = borderColorNormal;
        }}
        onClick={(e) => {
          // Only trigger if click is not on action buttons
          const target = e.target as HTMLElement;
          const isActionButton = target.closest('button');

          if (!isActionButton) {
            onClick(note);
          }
        }}
      >
        {/* Header with action buttons */}
        <div className="flex items-start justify-between mb-3 gap-2 flex-shrink-0">
          {/* Title */}
          <h4 className="font-semibold text-base text-[#111111] flex-1 leading-tight">
            {note.title}
          </h4>

          {/* Action icons - appear on hover */}
          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 flex-shrink-0 z-10 relative">
            {note.is_archived ? (
              <button
                className="p-1.5 hover:bg-[#F7F7F7] rounded-md transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onUnarchive(note.id);
                }}
                title="Unarchive"
              >
                <ArchiveRestore className="size-4 text-[#666666]" strokeWidth={2} />
              </button>
            ) : (
              <button
                className="p-1.5 hover:bg-[#F7F7F7] rounded-md transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onArchive(note.id);
                }}
                title="Archive"
              >
                <Archive className="size-4 text-[#666666]" strokeWidth={2} />
              </button>
            )}
            <button
              className="p-1.5 hover:bg-[#F7F7F7] rounded-md transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(note.id);
              }}
              title="Delete"
            >
              <Trash2 className="size-4 text-[#ff3b3b]" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden min-h-0">
          {normalizeNoteType(note.type) === 'text' && note.content && (
            <div
              className="font-medium text-xs text-[#666666] line-clamp-[8] leading-relaxed prose prose-sm max-w-none [&>p]:mb-2 [&>p]:last:mb-0 h-full"
              dangerouslySetInnerHTML={{ __html: sanitizeRichText(note.content) }}
            />
          )}

          {normalizeNoteType(note.type) === 'checklist' && note.items && isArray(note.items) && (
            <div className="flex flex-col gap-2 h-full overflow-hidden">
              {note.items
                .filter((item) => {
                  // Handle both backend format {checked} and frontend format {isChecked}
                  const isBackendFormat = 'checked' in item && !('isChecked' in item);
                  return isBackendFormat
                    ? !(item as { checked?: boolean }).checked
                    : !(item as ChecklistItem).isChecked;
                })
                .slice(0, 5)
                .map((item, index) => {
                  const itemText = 'text' in item ? item.text : String(item);
                  return (
                    <div key={`unchecked-${item.id || index}`} className="flex items-start gap-2 flex-shrink-0">
                      <Checkbox
                        checked={false}
                        disabled
                        className="mt-0.5 custom-checkbox-wrapper"
                      />
                      <span className="font-medium text-xs flex-1 leading-tight text-[#666666]">
                        {itemText}
                      </span>
                    </div>
                  );
                })}
              {(() => {
                const completedItems = note.items.filter((item) => {
                  const isBackendFormat = 'checked' in item && !('isChecked' in item);
                  return isBackendFormat
                    ? (item as { checked?: boolean }).checked
                    : (item as ChecklistItem).isChecked;
                });

                if (completedItems.length === 0) return null;

                return (
                  <div className="mt-2 pt-2 border-t border-[#EEEEEE] flex-shrink-0">
                    <div className="text-xs font-medium text-[#999] mb-1 uppercase">
                      Completed ({completedItems.length})
                    </div>
                    {completedItems.slice(0, 2).map((item, index) => {
                      const itemText = 'text' in item ? item.text : String(item);
                      return (
                        <div key={`checked-${item.id || index}`} className="flex items-start gap-2 opacity-60 flex-shrink-0">
                          <Checkbox
                            checked={true}
                            disabled
                            className="mt-0.5 custom-checkbox-wrapper"
                          />
                          <span className="font-medium text-xs flex-1 leading-tight line-through text-[#999999]">
                            {itemText}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}