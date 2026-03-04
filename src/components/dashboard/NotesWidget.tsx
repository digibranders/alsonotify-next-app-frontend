
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNotes } from "@/hooks/useNotes";
import { Skeleton } from "../ui/Skeleton";
import { sanitizeRichText } from "@/utils/sanitizeHtml";
import { Archive, Plus, Trash2 } from "lucide-react";
import { queryKeys } from "../../lib/queryKeys";
import { Checkbox, App } from 'antd';
import { createNote, deleteNote, archiveNote } from "@/services/notes";
import { Note } from "@/types/domain";
import { NoteTypeDto as NoteType } from "@/types/dto/note.dto";
import { ChecklistItem } from "@/types/domain";
import Link from "next/link";
import svgPaths from "../../constants/iconPaths";
import { NoteComposerModal } from "../common/NoteComposerModal";
import { NoteViewModal } from "../common/NoteViewModal";

export function NotesWidget() {
    const queryClient = useQueryClient();
    const { message: messageApi, modal } = App.useApp();
    const [showDialog, setShowDialog] = useState(false);
    const [viewingNote, setViewingNote] = useState<Note | null>(null);
    const [showViewModal, setShowViewModal] = useState(false);

    const { data, isLoading } = useNotes(0, 4, false); // Fetch 4 for the grid, exclude archived

    const notesList: Note[] = data?.result && Array.isArray(data.result) ? data.result : [];

    const createMutation = useMutation({
        mutationFn: createNote,
        onSuccess: () => {
            messageApi.success("Note created");
            setShowDialog(false);
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all() });
        },
        onError: () => messageApi.error("Failed to create note")
    });

    const handleSaveNote = async (noteData: {
        title: string;
        type: NoteType;
        content?: string;
        items?: ChecklistItem[];
        color: string;
    }) => {
        await createMutation.mutateAsync({
            title: noteData.title,
            type: noteData.type, // NoteType is already 'TEXT_NOTE' | 'CHECKLIST_NOTE'
            content: noteData.content,
            items: noteData.items,
            color: noteData.color,
        }); // Backend format matches domain type
    };

    const deleteMutation = useMutation({
        mutationFn: deleteNote,
        onSuccess: () => {
            messageApi.success("Note permanently deleted");
            setShowViewModal(false);
            setViewingNote(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all() });
        },
        onError: () => messageApi.error("Failed to delete note")
    });

    const archiveMutation = useMutation({
        mutationFn: archiveNote,
        onSuccess: () => {
            messageApi.success("Note archived");
            setShowViewModal(false);
            setViewingNote(null);
            queryClient.invalidateQueries({ queryKey: queryKeys.notes.all() });
        },
        onError: () => messageApi.error("Failed to archive note")
    });

    const handleArchive = (id: number) => {
        archiveMutation.mutate(id);
    };

    const handleDelete = (id: number) => {
        modal.confirm({
            title: 'Delete Note',
            content: 'Are you sure you want to permanently delete this note? This action cannot be undone.',
            okText: 'Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => deleteMutation.mutate(id)
        });
    };


    let notesContent;
    if (isLoading) {
        notesContent = (
            <>
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="min-h-[140px]">
                        <div className="h-full w-full bg-white rounded-xl border border-[#EEEEEE] p-4 flex flex-col">
                            <div className="flex items-start justify-between mb-2 gap-2 flex-shrink-0 w-full">
                                <Skeleton className="h-4 w-3/4 rounded-md" />
                            </div>
                            <div className="flex-1 flex flex-col gap-2">
                                <Skeleton className="h-3 w-full rounded-md" />
                                <Skeleton className="h-3 w-5/6 rounded-md" />
                                <Skeleton className="h-3 w-4/6 rounded-md" />
                            </div>
                        </div>
                    </div>
                ))}
            </>
        );
    } else if (notesList.length === 0) {
        notesContent = (
            <div className="col-span-full flex flex-col items-center justify-center h-full text-center text-[#999999] text-[0.8125rem]">
                <p>No notes yet</p>
                <button
                    onClick={() => setShowDialog(true)}
                    className="text-[#ff3b3b] hover:underline mt-1"
                >
                    Create one
                </button>
            </div>
        );
    } else {
        notesContent = notesList.map((note: Note) => (
            <NoteCard
                key={note.id}
                note={note}
                onArchive={(id) => archiveMutation.mutate(id)}
                onDelete={(id) => {
                    modal.confirm({
                        title: 'Delete Note',
                        content: 'Are you sure you want to permanently delete this note? This action cannot be undone.',
                        okText: 'Delete',
                        okType: 'danger',
                        cancelText: 'Cancel',
                        onOk: () => deleteMutation.mutate(id)
                    });
                }}
                onClick={(note) => {
                    setViewingNote(note);
                    setShowViewModal(true);
                }}
            />
        ));
    }

    return (
        <>
            <div className="bg-white rounded-[24px] p-5 w-full h-full flex flex-col border border-[#EEEEEE]">
                {/* Header */}
                <div className="flex items-center justify-between mb-1.5 h-[32px]">
                    <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-xl text-[#111111]">Notes</h3>
                        <button
                            onClick={() => setShowDialog(true)}
                            aria-label="Create note"
                            className="hover:scale-110 active:scale-95 transition-transform flex items-center justify-center p-0.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3b3b] focus-visible:ring-offset-2"
                        >
                            <Plus className="size-5 text-[#ff3b3b]" strokeWidth={2} />
                        </button>
                    </div>
                    <Link
                        href="/dashboard/notes"
                        aria-label="View all notes"
                        className="flex items-center gap-1 text-[#666666] hover:text-[#ff3b3b] text-sm font-semibold transition-colors no-underline rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff3b3b] focus-visible:ring-offset-2 [&>span]:text-current [&>svg]:text-current"
                        style={{ color: '#666666' }}
                    >
                        <span>View All</span>
                        <svg className="size-[17px]" fill="none" viewBox="0 0 17 17">
                            <path d={svgPaths.p3ac7a560} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                        </svg>
                    </Link>
                </div>

                {/* Notes Grid - responsive: 2 cols on small, 4 cols on large */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 flex-1 mt-2 overflow-y-auto scrollbar-hide">
                    {notesContent}
                </div>
            </div>

            {/* Note Composer Modal */}
            <NoteComposerModal
                open={showDialog}
                onClose={() => setShowDialog(false)}
                onSave={handleSaveNote}
                initialNote={null}
            />

            {/* Note View Modal - Google Keep style editable */}
            <NoteViewModal
                open={showViewModal}
                note={viewingNote}
                onClose={() => {
                    setShowViewModal(false);
                    setViewingNote(null);
                }}
                onArchive={handleArchive}
                onDelete={handleDelete}
            />
        </>
    );
}

function NoteCard({ note, onArchive, onDelete, onClick }: {
    note: Note;
    onArchive: (id: number) => void;
    onDelete: (id: number) => void;
    onClick?: (note: Note) => void;
}) {

    const titleId = `note-title-${note.id}`;

    const noteColor = note.color || '#ff3b3b';
    const borderColorNormal = '#EEEEEE';
    const borderColorHover = noteColor;

    return (
        <div className="relative group min-h-[140px]">
            {/* Main Note Button */}
            <button
                aria-labelledby={titleId}
                onClick={() => {
                    onClick?.(note);
                }}
                className="relative h-full w-full bg-white rounded-xl border overflow-hidden transition-all duration-300 cursor-pointer flex flex-col hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#ff3b3b] focus:ring-opacity-50 text-left"
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
            >
                {/* Color accent bar at top */}
                <div
                    className="w-full h-[3px] flex-shrink-0"
                    style={{ backgroundColor: noteColor }}
                />

                <div className="flex flex-col flex-1 p-3.5 overflow-hidden">
                <div className="flex items-start justify-between mb-2 gap-2 flex-shrink-0 w-full pointer-events-none">
                    <h4
                        id={titleId}
                        className="font-semibold text-sm text-[#111111] flex-1 line-clamp-2"
                    >
                        {note.title}
                    </h4>
                </div>

                <div className="flex-1 overflow-hidden min-h-0 w-full pointer-events-none">
                    {(note.type === 'TEXT_NOTE' || (note.type as any) === 'text') && note.content && (
                        <div
                            className="font-normal text-xs text-[#666666] line-clamp-4 leading-normal prose prose-sm max-w-none [&>p]:m-0 h-full"
                            dangerouslySetInnerHTML={{ __html: sanitizeRichText(note.content) }}
                        />
                    )}
                    {(note.type === 'CHECKLIST_NOTE' || (note.type as any) === 'checklist') && note.items && Array.isArray(note.items) && note.items.length > 0 && (
                        <div className="flex flex-col gap-1.5 h-full overflow-hidden">
                            {note.items
                                .filter((item: ChecklistItem) => {
                                    // Backend may send `checked` instead of `isChecked`
                                    const raw = item as any;
                                    return raw.checked !== undefined ? !raw.checked : !item.isChecked;
                                })
                                .slice(0, 3)
                                .map((item: ChecklistItem, index: number) => (
                                    <div key={item.id || index} className="flex items-start gap-2 flex-shrink-0">
                                        <Checkbox
                                            checked={false}
                                            disabled
                                            className="mt-0.5 custom-checkbox-wrapper"
                                        />
                                        <span className="font-normal text-xs text-[#666666] line-clamp-1">
                                            {item.text}
                                        </span>
                                    </div>
                                ))}
                        </div>
                    )}
                </div>
                </div>{/* end inner flex-col wrapper */}
            </button>

            {/* Action icons - Floating absolutely over the button, below the color bar */}
            <div className="absolute top-[17px] right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 z-10">
                <button
                    className="p-1.5 hover:bg-[#F7F7F7] rounded-md transition-colors bg-white/80 backdrop-blur-sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onArchive(note.id);
                    }}
                    title="Archive"
                >
                    <Archive className="size-3.5 text-[#666666]" strokeWidth={2} />
                </button>
                <button
                    className="p-1.5 hover:bg-[#F7F7F7] rounded-md transition-colors bg-white/80 backdrop-blur-sm"
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete(note.id);
                    }}
                    title="Delete"
                >
                    <Trash2 className="size-3.5 text-[#ff3b3b]" strokeWidth={2} />
                </button>
            </div>
        </div>
    );
}
