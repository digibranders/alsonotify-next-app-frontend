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
            {/*
              Keyed so switching conversations gets a fresh view rather than
              the previous one's state. TeamsChatView holds `replyingTo`
              locally, so without this, selecting chat A, clicking Reply and
              switching to chat B left the composer saying "Replying to
              <someone in A>". Its scroll position came along too: the
              follow-the-bottom effect keys on messages.length, and switching
              between two conversations of the same length never fires it.
            */}
            <TeamsChatView key={selectedChatId ?? 'none'} chatId={selectedChatId} />
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
              key={`${selectedTeamId ?? 'none'}/${selectedChannelId ?? 'none'}`}
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
