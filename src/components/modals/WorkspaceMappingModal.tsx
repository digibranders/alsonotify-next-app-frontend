import { Modal, Select, Button, App } from "antd";
import { useState } from "react";
import { Workspace } from "../../types/domain";

interface WorkspaceMappingModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (workspaceId: number) => Promise<void>;
    workspaces: Workspace[];
    loading?: boolean;
}

export const WorkspaceMappingModal = ({
    open,
    onClose,
    onSubmit,
    workspaces,
    loading = false,
}: WorkspaceMappingModalProps) => {
    const { message } = App.useApp();
    const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<number | null>(null);

    const handleSubmit = async () => {
        if (!selectedWorkspaceId) {
            message.error("Please select a workspace to map to.");
            return;
        }

        try {
            await onSubmit(selectedWorkspaceId);
            onClose();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (error: any) {
            // Error handling is usually done in the onSubmit caller, but we can catch here as well
            console.error("Mapping failed:", error);
        }
    };

    return (
        <Modal
            title={
                <div className="flex flex-col gap-1 mb-4">
                    <span className="text-lg font-bold">Map to Workspace</span>
                    <span className="text-xs text-[#666666] font-medium">
                        Select an internal workspace to link this requirement to.
                    </span>
                </div>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            width="min(450px, 95vw)"
            centered
        >
            <div className="flex flex-col gap-6">
                <div>
                    <label className="block text-sm font-medium mb-2 text-[#333]">
                        Select Workspace <span className="text-red-500">*</span>
                    </label>
                    <Select
                        placeholder="Choose a workspace..."
                        className="w-full h-10"
                        onChange={(value) => setSelectedWorkspaceId(value)}
                        value={selectedWorkspaceId}
                        options={workspaces.map((ws) => ({
                            label: ws.name,
                            value: ws.id,
                        }))}
                        showSearch
                        filterOption={(input, option) =>
                            (option?.label ?? "").toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-[#f0f0f0]">
                    <Button onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        type="primary"
                        className="bg-[#ff3b3b] hover:!bg-[#ff6b6b] border-none"
                        onClick={handleSubmit}
                        loading={loading}
                    >
                        Confirm Mapping
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
