'use client';

import { useState } from 'react';
import { Modal, Select, App } from 'antd';
import { ChevronDown } from 'lucide-react';
import { WorkspaceForm } from '../../../../modals/WorkspaceForm';

const { Option } = Select;

interface InternalMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (workspaceId: number) => void;
  workspaces: { id: number | string; name: string }[];
}

/**
 * Dialog for mapping external requirements to internal workspaces.
 * Allows creation of new workspaces inline.
 */
export function InternalMappingModal({
  open,
  onOpenChange,
  onConfirm,
  workspaces
}: InternalMappingModalProps) {
  const { message: messageApi } = App.useApp();
  const [selectedWorkspace, setSelectedWorkspace] = useState<number | undefined>(undefined);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const handleConfirm = () => {
    if (!selectedWorkspace) {
      messageApi.error("Please select an internal workspace");
      return;
    }
    onConfirm(selectedWorkspace);
    setSelectedWorkspace(undefined);
    onOpenChange(false);
  };

  return (
    <>
      <Modal
        open={open}
        onCancel={() => onOpenChange(false)}
        onOk={handleConfirm}
        title="Map to Internal Workspace"
        okText="Activate Requirement"
        cancelText="Cancel"
        okButtonProps={{ className: 'bg-[#111111] hover:bg-[#000000]/90 text-white border-none' }}
        width="min(400px, 95vw)"
        centered
      >
        <div className="space-y-4 py-4">
          <p className="text-xs text-[#666666] font-normal">
            Select one of your internal workspaces to map this requirement to.
          </p>
          <div className="space-y-2">
            <label className="text-xs font-bold text-[#111111]">Internal Workspace</label>
            <Select
              className="w-full h-11"
              placeholder="Select workspace"
              value={selectedWorkspace}
              onChange={(v: string | number) => {
                if (v === 'create_new') {
                  setIsCreateOpen(true);
                  setSelectedWorkspace(undefined);
                } else {
                  setSelectedWorkspace(v as number);
                }
              }}
              suffixIcon={<ChevronDown className="w-4 h-4 text-gray-400" />}
            >
              <Option key="create_new" value="create_new" className="text-[#ff3b3b] font-medium border-b border-gray-100 pb-2 mb-2">
                + Create New Workspace
              </Option>
              {workspaces.map((w: { id: number | string; name: string }) => (
                <Option key={String(w.id)} value={w.id}>
                  {w.name}
                </Option>
              ))}
            </Select>
          </div>
        </div>
      </Modal>

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
