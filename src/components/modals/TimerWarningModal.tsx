import { Button } from 'antd';
import { Clock, AlertTriangle } from 'lucide-react';
import { FormLayout } from "../common/FormLayout";

interface TimerWarningModalProps {
    open: boolean;
    taskName: string;
    onPauseAndEdit: () => void;
    onEditAnyway: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

export function TimerWarningModal({
    taskName,
    onPauseAndEdit,
    onEditAnyway,
    onCancel,
    isLoading = false,
}: TimerWarningModalProps) {
    return (
        <FormLayout
            title="Timer Running"
            subtitle="This task has an active timer. We recommend pausing it before editing."
            icon={Clock}
            onCancel={onCancel}
            onSubmit={onPauseAndEdit}
            footer={
                <div className="flex items-center justify-end gap-3">
                    <Button
                        onClick={onCancel}
                        disabled={isLoading}
                        className="h-11 px-6 rounded-lg border border-[#EEEEEE] text-[#666666] font-semibold text-sm hover:bg-[#F7F7F7] hover:border-[#DDDDDD] transition-all"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={onEditAnyway}
                        disabled={isLoading}
                        className="h-11 px-6 rounded-lg border border-[#FF9800] text-[#FF9800] font-semibold text-sm hover:bg-[#FFF3E0] transition-all"
                    >
                        Edit Anyway
                    </Button>
                    <Button
                        onClick={onPauseAndEdit}
                        loading={isLoading}
                        disabled={isLoading}
                        className="h-11 px-6 rounded-lg bg-[#111111] text-white font-semibold text-sm hover:bg-[#000000] transition-all shadow-sm border-none"
                    >
                        Pause & Edit
                    </Button>
                </div>
            }
        >
            <div className="space-y-4">
                {/* Warning Message */}
                <div className="flex items-start gap-3 p-4 bg-[#FFF3E0] border border-[#FFE0B2] rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-[#FF9800] flex-shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-1">
                        <p className="text-sm font-semibold text-[#111111]">
                            Active Timer Detected
                        </p>
                        <p className="text-xs font-medium text-[#666666]">
                            The timer for <span className="font-semibold text-[#111111]">{taskName}</span> is currently running.
                            Editing task details while the timer is active may cause inconsistencies in time tracking.
                        </p>
                    </div>
                </div>

                {/* Recommendation */}
                <div className="space-y-2">
                    <p className="text-xs font-bold text-[#111111]">
                        Recommended Actions:
                    </p>
                    <ul className="space-y-1.5 ml-4">
                        <li className="text-xs font-medium text-[#666666] list-disc">
                            <span className="font-semibold text-[#111111]">Pause & Edit:</span> Stops the timer and opens the edit modal
                        </li>
                        <li className="text-xs font-medium text-[#666666] list-disc">
                            <span className="font-semibold text-[#111111]">Edit Anyway:</span> Keeps the timer running while you edit (not recommended)
                        </li>
                    </ul>
                </div>
            </div>
        </FormLayout>
    );
}
