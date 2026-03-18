'use client';

import { Skeleton } from 'antd';
import { Hash, ChevronRight, ChevronDown, Users as UsersIcon } from 'lucide-react';
import { useJoinedTeams, useTeamChannels } from '@/hooks/useTeams';
import { useState } from 'react';

interface TeamsChannelBrowserProps {
  selectedTeamId: string | null;
  selectedChannelId: string | null;
  onSelectTeam: (teamId: string) => void;
  onSelectChannel: (channelId: string) => void;
}

export function TeamsChannelBrowser({
  selectedTeamId,
  selectedChannelId,
  onSelectTeam,
  onSelectChannel,
}: TeamsChannelBrowserProps) {
  const [expandedTeamId, setExpandedTeamId] = useState<string | null>(null);
  const { data: teamsData, isLoading: teamsLoading } = useJoinedTeams();
  const { data: channelsData, isLoading: channelsLoading } = useTeamChannels(expandedTeamId);

  const teams = teamsData?.result || [];
  const channels = channelsData?.result || [];

  const handleTeamClick = (teamId: string) => {
    if (expandedTeamId === teamId) {
      setExpandedTeamId(null);
    } else {
      setExpandedTeamId(teamId);
      onSelectTeam(teamId);
    }
  };

  const handleChannelClick = (channelId: string) => {
    if (expandedTeamId) {
      onSelectTeam(expandedTeamId);
    }
    onSelectChannel(channelId);
  };

  return (
    <div className="w-[300px] shrink-0 flex flex-col border border-[#EEEEEE] rounded-2xl bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-[#EEEEEE]">
        <h3 className="text-xs font-semibold text-[#999999] uppercase tracking-wider">
          Your Teams
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {teamsLoading ? (
          <div className="p-4 flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton.Input key={i} active block style={{ height: 40 }} />
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-[#999999] gap-2 p-6">
            <UsersIcon size={32} strokeWidth={1.5} />
            <p className="text-sm text-center">
              No Teams found. Connect Microsoft 365 to see your Teams.
            </p>
          </div>
        ) : (
          teams.map((team) => (
            <div key={team.id}>
              {/* Team row */}
              <button
                onClick={() => handleTeamClick(team.id)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-2 transition-colors border-b border-[#F7F7F7] cursor-pointer ${
                  expandedTeamId === team.id ? 'bg-[#F7F7F7]' : 'hover:bg-[#F7F7F7]'
                }`}
              >
                {expandedTeamId === team.id ? (
                  <ChevronDown size={14} className="text-[#999999] shrink-0" />
                ) : (
                  <ChevronRight size={14} className="text-[#999999] shrink-0" />
                )}
                <div className="w-7 h-7 rounded-lg bg-[#E3F2FD] text-[#2F80ED] flex items-center justify-center shrink-0">
                  <UsersIcon size={14} />
                </div>
                <span className="text-sm font-medium text-[#111111] truncate">
                  {team.displayName}
                </span>
              </button>

              {/* Channels (expanded) */}
              {expandedTeamId === team.id && (
                <div className="bg-[#FAFAFA]">
                  {channelsLoading ? (
                    <div className="px-6 py-2">
                      <Skeleton.Input active block style={{ height: 28 }} />
                    </div>
                  ) : (
                    channels.map((channel) => (
                      <button
                        key={channel.id}
                        onClick={() => handleChannelClick(channel.id)}
                        className={`w-full text-left pl-12 pr-4 py-2 flex items-center gap-2 transition-colors cursor-pointer ${
                          selectedChannelId === channel.id && selectedTeamId === team.id
                            ? 'bg-[#FEF3F2] text-[#ff3b3b]'
                            : 'hover:bg-[#F0F0F0] text-[#666666]'
                        }`}
                      >
                        <Hash size={14} className="shrink-0" />
                        <span className="text-sm truncate">{channel.displayName}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
