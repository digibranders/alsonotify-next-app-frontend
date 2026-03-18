'use client';

import { useState } from 'react';
import { Modal, Input, Button, App, Skeleton } from 'antd';
import { MessageSquarePlus, Search } from 'lucide-react';
import { useCreateTeamsChat, useTeamsPeopleSearch } from '@/hooks/useTeams';

interface NewChatModalProps {
  open: boolean;
  onClose: () => void;
  onChatCreated: (chatId: string) => void;
}

interface SelectedUser {
  id: string;
  displayName: string;
  mail?: string;
}

export function NewChatModal({ open, onClose, onChatCreated }: NewChatModalProps) {
  const { message } = App.useApp();
  const [search, setSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const createChat = useCreateTeamsChat();

  const { data: peopleData, isLoading: searching, isError: searchError } = useTeamsPeopleSearch(search);
  const people = peopleData?.result || [];

  const toggleUser = (user: SelectedUser) => {
    setSelectedUsers((prev) => {
      const exists = prev.find((u) => u.id === user.id);
      if (exists) return prev.filter((u) => u.id !== user.id);
      return [...prev, user];
    });
  };

  const isSelected = (id: string) => selectedUsers.some((u) => u.id === id);

  const handleCreate = async () => {
    if (selectedUsers.length === 0) {
      message.warning('Select at least one person to chat with');
      return;
    }

    try {
      const result = await createChat.mutateAsync(selectedUsers.map((u) => u.id));
      const chatId = result?.result?.id;
      if (chatId) {
        message.success('Chat created');
        onChatCreated(chatId);
        handleClose();
      }
    } catch {
      message.error('Failed to create chat');
    }
  };

  const handleClose = () => {
    setSearch('');
    setSelectedUsers([]);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <div className="flex items-center gap-2 text-[#111111]">
          <MessageSquarePlus size={18} />
          <span className="text-base font-semibold">New Chat</span>
        </div>
      }
      footer={null}
      destroyOnHidden
      width={440}
    >
      <div className="flex flex-col gap-3 py-2">
        {/* Search */}
        <Input
          prefix={<Search size={14} className="text-[#999999]" />}
          placeholder="Search people by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="rounded-full"
          allowClear
        />

        {/* Selected chips */}
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedUsers.map((user) => (
              <span
                key={user.id}
                className="px-2.5 py-1 bg-[#FEF3F2] text-[#ff3b3b] rounded-full text-xs font-medium cursor-pointer hover:bg-[#FDD8D8] transition-colors"
                onClick={() => toggleUser(user)}
              >
                {user.displayName} &times;
              </span>
            ))}
          </div>
        )}

        {/* People list */}
        <div className="max-h-[300px] overflow-y-auto border border-[#EEEEEE] rounded-xl">
          {searching ? (
            <div className="p-3 flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-2">
                  <Skeleton.Avatar active size={32} />
                  <Skeleton.Input active block style={{ height: 14 }} />
                </div>
              ))}
            </div>
          ) : search.length < 2 ? (
            <p className="text-sm text-[#999999] text-center py-6">
              Type at least 2 characters to search
            </p>
          ) : searchError ? (
            <p className="text-sm text-[#ff3b3b] text-center py-6">
              Search failed. Please reconnect Microsoft 365 in Settings.
            </p>
          ) : people.length === 0 ? (
            <p className="text-sm text-[#999999] text-center py-6">
              No people found for &quot;{search}&quot;
            </p>
          ) : (
            people.map((person) => (
              <button
                key={person.id}
                onClick={() =>
                  toggleUser({
                    id: person.id,
                    displayName: person.displayName,
                    mail: person.mail,
                  })
                }
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors border-b border-[#F7F7F7] cursor-pointer ${
                  isSelected(person.id) ? 'bg-[#FEF3F2]' : 'hover:bg-[#F7F7F7]'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-[#E3F2FD] text-[#2F80ED] flex items-center justify-center text-sm font-semibold shrink-0">
                  {person.displayName?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111111] truncate">
                    {person.displayName}
                  </p>
                  {person.mail && (
                    <p className="text-xs text-[#999999] truncate">{person.mail}</p>
                  )}
                </div>
                {isSelected(person.id) && (
                  <span className="text-[#ff3b3b] text-xs font-semibold">Selected</span>
                )}
              </button>
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <Button
            type="primary"
            onClick={handleCreate}
            loading={createChat.isPending}
            disabled={selectedUsers.length === 0}
            className="flex-1"
            style={{ backgroundColor: '#ff3b3b', borderColor: '#ff3b3b' }}
          >
            Start Chat
          </Button>
          <Button onClick={handleClose} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </Modal>
  );
}
