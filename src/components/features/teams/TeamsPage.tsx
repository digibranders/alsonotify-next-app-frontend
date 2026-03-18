'use client';

import { useState } from 'react';
import { PageLayout } from '../../layout/PageLayout';
import { TeamsChatList } from './components/TeamsChatList';
import { TeamsChatView } from './components/TeamsChatView';
import { TeamsChannelBrowser } from './components/TeamsChannelBrowser';
import { TeamsChannelView } from './components/TeamsChannelView';
import { NewChatModal } from './components/NewChatModal';

type TeamsTab = 'chat' | 'channels';

export function TeamsPage() {
  const [activeTab, setActiveTab] = useState<TeamsTab>('chat');
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<string | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);

  const handleChatCreated = (chatId: string) => {
    setSelectedChatId(chatId);
    setNewChatOpen(false);
  };

  return (
    <PageLayout
      title="Teams"
      tabs={[
        { id: 'chat', label: 'Chat' },
        { id: 'channels', label: 'Channels' },
      ]}
      activeTab={activeTab}
      onTabChange={(tabId) => setActiveTab(tabId as TeamsTab)}
      titleAction={
        activeTab === 'chat'
          ? { label: 'New Chat', onClick: () => setNewChatOpen(true) }
          : undefined
      }
    >
      <div className="flex h-[calc(100vh-220px)] gap-4">
        {activeTab === 'chat' && (
          <>
            <TeamsChatList
              selectedChatId={selectedChatId}
              onSelectChat={setSelectedChatId}
            />
            <TeamsChatView chatId={selectedChatId} />
          </>
        )}
        {activeTab === 'channels' && (
          <>
            <TeamsChannelBrowser
              selectedTeamId={selectedTeamId}
              selectedChannelId={selectedChannelId}
              onSelectTeam={setSelectedTeamId}
              onSelectChannel={setSelectedChannelId}
            />
            <TeamsChannelView
              teamId={selectedTeamId}
              channelId={selectedChannelId}
            />
          </>
        )}
      </div>
      <NewChatModal
        open={newChatOpen}
        onClose={() => setNewChatOpen(false)}
        onChatCreated={handleChatCreated}
      />
    </PageLayout>
  );
}
