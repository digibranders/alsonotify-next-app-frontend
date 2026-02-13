import { Modal, Input, Button, App } from "antd";
import { useState } from "react";

const { TextArea } = Input;

interface RequirementRejectionModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => Promise<void>;
    title?: string;
}

export const RequirementRejectionModal = ({
    open,
    onClose,
    onSubmit,
    title = "Reject Requirement",
}: RequirementRejectionModalProps) => {
    const { message } = App.useApp();
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!reason.trim()) {
            message.error("Please provide a reason.");
            return;
        }

        setLoading(true);
        try {
            await onSubmit(reason);
            setReason("");
            onClose();
        } catch (error: any) {
            message.error(error.message || "Failed to submit rejection.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={<span className="text-lg font-bold">{title}</span>}
            open={open}
            onCancel={onClose}
            footer={null}
            width={450}
            centered
        >
            <div className="flex flex-col gap-4 py-2">
                <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">
                        Reason for rejection <span className="text-red-500">*</span>
                    </label>
                    <TextArea
                        rows={4}
                        placeholder="Explain why this requirement/quote is being rejected..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="rounded-lg border-gray-300 focus:border-[#111111] hover:border-[#111111]"
                    />
                </div>

                <div className="flex justify-end gap-3 mt-2">
                    <Button onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        type="primary"
                        className="bg-[#111111]"
                        onClick={handleSubmit}
                        loading={loading}
                    >
                        Confirm Rejection
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
