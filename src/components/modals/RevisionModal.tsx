import { Modal, Input, Button, Upload, App } from "antd";
import { useState } from "react";
import { Upload as UploadIcon } from "lucide-react";
import type { UploadFile } from "antd/es/upload/interface";
import { fileService } from "../../services/file.service";
import { requestRevision } from "../../services/task";
import { Task } from "../../types/domain";

const { TextArea } = Input;

interface RevisionModalProps {
    open: boolean;
    onClose: () => void;
    task: Task;
    onSuccess: () => void;
}

export const RevisionModal = ({ open, onClose, task, onSuccess }: RevisionModalProps) => {
    const { message } = App.useApp();
    const [reason, setReason] = useState("");
    const [estimatedTime, setEstimatedTime] = useState<string>("");
    const [fileList, setFileList] = useState<UploadFile[]>([]);
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async () => {
        if (!reason.trim()) {
            message.error("Please provide a reason for the revision.");
            return;
        }

        setLoading(true);
        try {
            // 1. Create Revision Task
            const response = await requestRevision(Number(task.id), reason, estimatedTime ? Number(estimatedTime) : undefined);

            if (response.success && response.result) {
                const revisionTaskId = response.result.id;

                // 2. Upload Files if any
                if (fileList.length > 0) {
                    setUploading(true);
                    message.loading({ content: "Uploading attachments...", key: "upload" });

                    const uploadPromises = fileList.map((file) => {
                        if (file.originFileObj) {
                            // Context is 'TASK' to link to the revision task
                            return fileService.uploadFile(file.originFileObj, "TASK", revisionTaskId);
                        }
                        return Promise.resolve();
                    });

                    await Promise.all(uploadPromises);
                    message.success({ content: "Revision requested and files uploaded!", key: "upload" });
                } else {
                    message.success("Revision requested successfully.");
                }

                onSuccess();
                handleClose();
            }
        } catch (error: any) {
            console.error(error);
            message.error(error.message || "Failed to request revision.");
        } finally {
            setLoading(false);
            setUploading(false);
        }
    };

    const handleClose = () => {
        setReason("");
        setEstimatedTime("");
        setFileList([]);
        onClose();
    };

    return (
        <Modal
            title={
                <div className="flex flex-col gap-1 mb-4">
                    <span className="text-lg font-bold">Request Revision</span>
                    <span className="text-xs text-[#666666] font-normal">
                        For: <span className="font-semibold text-[#111111]">{task.name}</span>
                    </span>
                </div>
            }
            open={open}
            onCancel={handleClose}
            footer={null}
            width="min(500px, 95vw)"
            centered
        >
            <div className="flex flex-col gap-4">
                <div>
                    <label className="block text-sm font-medium mb-1 text-[#333]">
                        Reason / Feedback <span className="text-red-500">*</span>
                    </label>
                    <TextArea
                        rows={4}
                        placeholder="Explain what needs to be fixed..."
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        className="rounded-lg border-[#E5E5E5] focus:border-[#ff3b3b] hover:border-[#ff3b3b]"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-[#333]">Estimated Time (Hours)</label>
                    <Input
                        type="number"
                        placeholder="e.g. 2.5"
                        value={estimatedTime}
                        onChange={(e) => setEstimatedTime(e.target.value)}
                        className="rounded-lg border-[#E5E5E5] focus:border-[#ff3b3b] hover:border-[#ff3b3b]"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-1 text-[#333]">Attachments (Optional)</label>
                    <Upload
                        fileList={fileList}
                        onRemove={(file) => {
                            setFileList((prev) => prev.filter((item) => item.uid !== file.uid));
                        }}
                        beforeUpload={(file) => {
                            const maxSize = 25 * 1024 * 1024; // 25MB
                            if (file.size > maxSize) {
                                message.error(`${file.name} exceeds the 25MB size limit`);
                                return Upload.LIST_IGNORE;
                            }
                            setFileList((prev) => [...prev, file]);
                            return false; // Prevent auto-upload
                        }}
                        multiple
                    >
                        <Button icon={<UploadIcon className="w-4 h-4" />}>Select Files</Button>
                    </Upload>
                </div>

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-[#f0f0f0]">
                    <Button onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        type="primary"
                        className="bg-[#ff3b3b] hover:!bg-[#ff6b6b]"
                        danger
                        onClick={handleSubmit}
                        loading={loading || uploading}
                    >
                        Send Revision Request
                    </Button>
                </div>
            </div>
        </Modal>
    );
};
