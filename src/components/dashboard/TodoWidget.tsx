
import svgPaths from "../../constants/iconPaths";
import { Plus, Bold, Italic, List, CheckSquare, MoreVertical, Archive, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Modal, Input, Button, Checkbox, Dropdown, MenuProps } from 'antd';

const { TextArea } = Input;

interface Note {
  id: number;
  title: string;
  content: string | null;
  color: string;
  type: 'text' | 'checklist';
  hasFormatting?: boolean;
  items?: Array<{ text: string; checked: boolean }>;
}

export function TodoWidget({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [showDialog, setShowDialog] = useState(false);
  const [notes, setNotes] = useState<Note[]>([
    {
      id: 1,
      title: "Design Sprint Goals",
      content: "Finalize wireframes for mobile app\nComplete user flow diagrams\nPrepare presentation deck",
      color: "#ff3b3b",
      type: "text",
      hasFormatting: true
    },
    {
      id: 2,
      title: "Client Deliverables",
      content: null,
      color: "#3b8eff",
      type: "checklist",
      items: [
        { text: "Updated brand guidelines", checked: true },
        { text: "Q4 marketing strategy", checked: false },
        { text: "Social media content calendar", checked: false }
      ]
    },
    {
      id: 3,
      title: "Team Meeting Notes",
      content: "Discussed new project timeline with stakeholders. Key decision: Launch moved to Dec 15th. Action items assigned to team leads.",
      color: "#9b59b6",
      type: "text",
      hasFormatting: false
    },
    {
      id: 4,
      title: "Weekly Tasks",
      content: null,
      color: "#FFA500",
      type: "checklist",
      items: [
        { text: "Review design mockups", checked: true },
        { text: "Client feedback call", checked: true },
        { text: "Update project roadmap", checked: false },
        { text: "Team retrospective", checked: false }
      ]
    },
  ]);

  const toggleNoteItem = (noteId: number, itemIndex: number) => {
    setNotes(notes.map(note => {
      if (note.id === noteId && note.type === 'checklist' && note.items) {
        const updatedItems = [...note.items];
        updatedItems[itemIndex] = { ...updatedItems[itemIndex], checked: !updatedItems[itemIndex].checked };
        return { ...note, items: updatedItems };
      }
      return note;
    }));
  };

  return (
    <>
      <div className="bg-white rounded-[24px] p-5 w-full h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-xl text-[#111111]">Notes</h3>
            <button onClick={() => setShowDialog(true)} className="hover:scale-110 active:scale-95 transition-transform">
              <Plus className="size-5 text-[#ff3b3b]" strokeWidth={2} />
            </button>
          </div>
          <button className="flex items-center gap-1 text-[#666666] text-sm font-semibold hover:text-[#111111] transition-colors" onClick={() => onNavigate && onNavigate('notes')}>
            <span>View All</span>
            <svg className="size-[17px]" fill="none" viewBox="0 0 17 17">
              <path d={svgPaths.p3ac7a560} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        {/* Notes Grid - 4 columns */}
        <div className="grid grid-cols-4 gap-3 flex-1 mt-2">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} onToggleItem={toggleNoteItem} />
          ))}
        </div>
      </div>

      {/* Add Note Modal */}
      <Modal
        title={<div className="font-bold text-2xl">Add Note</div>}
        open={showDialog}
        onCancel={() => setShowDialog(false)}
        footer={null}
        width="min(500px, 95vw)"
        centered
        className="rounded-[16px] overflow-hidden"
      >
        <div className="font-normal text-sm text-[#666666] mb-4">Create a new sticky note for quick reminders and tasks.</div>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-[#666666] mb-2 block">Title</label>
            <Input placeholder="Note title" className="rounded-lg h-9" />
          </div>
          <div>
            <label className="text-sm font-medium text-[#666666] mb-2 flex items-center justify-between">
              <span>Content</span>
              <div className="flex gap-1">
                <button className="p-1 hover:bg-[#F7F7F7] rounded transition-colors" title="Bold" aria-label="Bold">
                  <Bold className="size-4 text-[#666666]" />
                </button>
                <button className="p-1 hover:bg-[#F7F7F7] rounded transition-colors" title="Italic" aria-label="Italic">
                  <Italic className="size-4 text-[#666666]" />
                </button>
                <button className="p-1 hover:bg-[#F7F7F7] rounded transition-colors" title="List" aria-label="List">
                  <List className="size-4 text-[#666666]" />
                </button>
                <button className="p-1 hover:bg-[#F7F7F7] rounded transition-colors" title="Checklist" aria-label="Checklist">
                  <CheckSquare className="size-4 text-[#666666]" />
                </button>
              </div>
            </label>
            <TextArea placeholder="Note content..." className="rounded-lg min-h-[120px]" />
          </div>
          <div>
            <label className="text-sm font-medium text-[#666666] mb-2 block">Color</label>
            <div className="flex gap-2">
              {['#ff3b3b', '#3b8eff', '#9b59b6', '#FFA500', '#2ecc71', '#e74c3c'].map((color) => (
                <button
                  key={color}
                  aria-label={`Select note color ${color}`}
                  className="w-10 h-10 rounded-lg border-2 border-transparent hover:border-[#ff3b3b] transition-colors"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Button onClick={() => setShowDialog(false)} className="flex-1 rounded-full h-10 font-semibold">
              Cancel
            </Button>
            <Button type="primary" onClick={() => setShowDialog(false)} className="flex-1 rounded-full bg-[#ff3b3b] hover:bg-[#cc2f2f] h-10 font-semibold border-none text-white">
              Add Note
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}

function NoteCard({ note, onToggleItem }: {
  note: {
    id: number;
    title: string;
    content: string | null;
    color: string;
    type: 'text' | 'checklist';
    hasFormatting?: boolean;
    items?: Array<{ text: string; checked: boolean }>;
  };
  onToggleItem: (noteId: number, itemIndex: number) => void;
}) {
  const items: MenuProps['items'] = [
    {
      key: 'archive',
      label: <span className="text-xs font-medium">Archive</span>,
      icon: <Archive className="size-3.5" />,
    },
    {
      key: 'delete',
      label: <span className="text-xs font-medium text-[#ff3b3b]">Delete</span>,
      icon: <Trash2 className="size-3.5 text-[#ff3b3b]" />,
      danger: true,
    },
  ];

  return (
    <div className="relative group h-full">
      {/* Card with white background */}
      <div className="relative h-full bg-white rounded-xl border border-[#EEEEEE] hover:border-[#ff3b3b]/20 hover:shadow-lg transition-all duration-300 cursor-pointer p-4 flex flex-col">
        {/* Header with action buttons */}
        <div className="flex items-start justify-between mb-2 gap-2">
          {/* Title */}
          <h4 className="font-semibold text-sm text-[#111111] flex-1 group-hover:text-[#ff3b3b] transition-colors">
            {note.title}
          </h4>

          {/* Three-dot menu - appears on hover */}
          <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
            <button
              className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity p-1 hover:bg-[#F7F7F7] rounded-md flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111]"
              onClick={(e) => e.stopPropagation()}
              aria-label="Note actions"
            >
              <MoreVertical className="size-3.5 text-[#666666]" strokeWidth={2} />
            </button>
          </Dropdown>
        </div>

        {/* Content */}
        {note.type === 'text' && note.content && (
          <p className="font-normal text-xs text-[#666666] line-clamp-4 whitespace-pre-line">
            {note.content}
          </p>
        )}

        {note.type === 'checklist' && note.items && (
          <div className="flex flex-col gap-2">
            {note.items.slice(0, 3).map((item, index) => (
              <div key={index} className="flex items-center gap-2">
                <Checkbox
                  checked={item.checked}
                  onChange={() => onToggleItem(note.id, index)}
                  className="custom-checkbox-wrapper"
                />
                <span className={`font-normal text-[0.6875rem] flex-1 leading-tight ${item.checked ? 'line-through text-[#999999]' : 'text-[#666666]'}`}>
                  {item.text}
                </span>
              </div>
            ))}
            {note.items.length > 3 && (
              <span className="font-normal text-[0.625rem] text-[#999999]">
                +{note.items.length - 3} more
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}