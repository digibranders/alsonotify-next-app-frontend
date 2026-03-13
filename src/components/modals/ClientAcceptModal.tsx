'use client';

import { useState } from 'react';
import { Modal, Select, Card, App } from 'antd';
import { ChevronDown } from 'lucide-react';
import { WorkspaceForm } from './WorkspaceForm';

const { Option } = Select;

interface ClientAcceptModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (workspaceId: number) => Promise<void>;
  workspaces: { id: number | string; name: string }[];
  quotedPrice?: number;
  currency?: string;
  requirementName?: string;
  creatorName?: string;
  loading?: boolean;
}

/**
 * Modal for accepting client work and mapping workspace (combined action for B).
 * B (client) reviews the quote and maps their workspace in one step.
 */
export function ClientAcceptModal({
  open,
  onClose,
  onConfirm,
  workspaces,
  quotedPrice,
  currency = 'USD',
  requirementName,
  creatorName,
  loading = false
}: ClientAcceptModalProps) {
  const { message: messageApi } = App.useApp();
  const [selectedWorkspace, setSelectedWorkspace] = useState<number | undefined>(undefined);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    if (!selectedWorkspace) {
      messageApi.error('Please select a workspace');
      return;
    }

    try {
      setIsConfirming(true);
      await onConfirm(selectedWorkspace);
      setSelectedWorkspace(undefined);
      onClose();
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : 'Failed to accept client work');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancel = () => {
    setSelectedWorkspace(undefined);
    onClose();
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={handleCancel}
        onOk={handleConfirm}
        title="Accept Client Work"
        okText="Accept & Map Workspace"
        cancelText="Decline"
        okButtonProps={{
          className: 'bg-[#111111] hover:bg-[#000000]/90 text-white border-none',
          disabled: !selectedWorkspace,
          loading: isConfirming || loading,
        }}
        cancelButtonProps={{
          className: 'border-[#EEEEEE] hover:border-[#111111]',
        }}
        width="min(480px, 95vw)"
        centered
      >
        <div className="space-y-6 py-4">
          {/* Quote Summary Card */}
          <Card
            className="bg-[#F9F9F9] border-[#EEEEEE]"
            size="small"
            variant="outlined"
          >
            <div className="space-y-3">
              <div>
                <p className="text-2xs text-[#999999] uppercase font-semibold tracking-wide mb-1">
                  Project
                </p>
                <p className="text-sm font-semibold text-[#111111]">
                  {requirementName || 'Unnamed Project'}
                </p>
              </div>

              <div>
                <p className="text-2xs text-[#999999] uppercase font-semibold tracking-wide mb-1">
                  From
                </p>
                <p className="text-sm text-[#666666]">
                  {creatorName || 'Team Member'}
                </p>
              </div>

              {quotedPrice !== undefined && (
                <div className="pt-2 border-t border-[#EEEEEE]">
                  <p className="text-2xs text-[#999999] uppercase font-semibold tracking-wide mb-2">
                    Quoted Amount
                  </p>
                  <p className="text-lg font-bold text-[#111111]">
                    {currency} {quotedPrice.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              )}
            </div>
          </Card>

          {/* Workspace Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-[#111111]">
              Map to your workspace <span className="text-[#ff3b3b]">*</span>
            </label>
            <Select
              className="w-full h-11"
              placeholder="Select your workspace"
              value={selectedWorkspace}
              onChange={(v: string | number) => {
                if (v === 'create_new') {
                  setIsCreateOpen(true);
                  setSelectedWorkspace(undefined);
                } else {
                  setSelectedWorkspace(v as number);
                }
              }}
              disabled={loading || isConfirming}
              suffixIcon={<ChevronDown className="w-4 h-4 text-gray-400" />}
            >
              <Option
                key="create_new"
                value="create_new"
                className="text-[#ff3b3b] font-medium border-b border-gray-100 pb-2 mb-2"
              >
                + Create New Workspace
              </Option>
              {workspaces.map((w: { id: number | string; name: string }) => (
                <Option key={String(w.id)} value={w.id}>
                  {w.name}
                </Option>
              ))}
            </Select>
            <p className="text-xs text-[#999999]">
              Select the workspace where you'll deliver this work.
            </p>
          </div>
        </div>
      </Modal>

      {/* Workspace Creation Form */}
      <WorkspaceForm
        open={isCreateOpen}
        onCancel={() => setIsCreateOpen(false)}
        onSuccess={(data: unknown) => {
          const typedData = data as { result?: { id: number }; id?: number };
          const newId = typedData?.result?.id || typedData?.id;
          if (newId) {
            setSelectedWorkspace(newId);
          }
          setIsCreateOpen(false);
        }}
      />
    </>
  );
}
