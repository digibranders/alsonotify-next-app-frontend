import { Modal, Input, Button, App } from "antd";
import { useState } from "react";

const { TextArea } = Input;

interface RequirementRevisionModalProps {
    open: boolean;
    onClose: () => void;
    onSubmit: (feedback: string) => Promise<void>;
    requirementName: string;
}

export const RequirementRevisionModal = ({
    open,
    onClose,
    onSubmit,
    requirementName,
}: RequirementRevisionModalProps) => {
    const { message } = App.useApp();
    const [feedback, setFeedback] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!feedback.trim()) {
            message.error("Please provide feedback for the revision.");
            return;
        }

        setLoading(true);
        try {
            await onSubmit(feedback);
            setFeedback("");
            onClose();
        } catch (error: any) {
            message.error(error.message || "Failed to submit revision request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={
                <div className="flex flex-col gap-1">
                    <span className="text-lg font-bold">Request Revision</span>
                    <span className="text-xs text-gray-500 font-normal">
                        Requirement: <span className="font-semibold text-gray-800">{requirementName}</span>
                    </span>
                </div>
            }
            open={open}
            onCancel={onClose}
            footer={null}
            width={500}
            centered
        >
            <div className="flex flex-col gap-4 py-4">
                <div>
                    <label className="block text-sm font-medium mb-1.5 text-gray-700">
                        Feedback / Requested Changes <span className="text-red-500">*</span>
                    </label>
                    <TextArea
                        rows={5}
                        placeholder="Describe exactly what needs to be changed or improved..."
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        className="rounded-lg border-gray-300 focus:border-[#111111] hover:border-[#111111]"
                    />
                </div>

                <div className="flex justify-end gap-3 mt-2 pt-4 border-t border-gray-100">
                    <Button onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        type="primary"
                        className="bg-[#111111]"
                        onClick={handleSubmit}
                        loading={loading}
                    >
                        Submit Revision
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
