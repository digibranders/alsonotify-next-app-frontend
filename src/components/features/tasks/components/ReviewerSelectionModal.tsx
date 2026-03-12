import { useState } from "react";
import { Modal, Select, Avatar, Spin, Typography } from "antd";
import { useQuery } from "@tanstack/react-query";
import { getEmployees } from "@/services/user";
import { UserDto } from "@/types/dto/user.dto";

const { Text } = Typography;

interface ReviewerSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (reviewerId: number) => void;
  defaultReviewerId?: number;
  currentUserId?: number;
  loading?: boolean;
}

export function ReviewerSelectionModal({ open, onClose, onConfirm, defaultReviewerId, currentUserId, loading }: ReviewerSelectionModalProps) {
  const [selectedReviewer, setSelectedReviewer] = useState<number | undefined>();

  // Use a key on this component from the parent to reset state, or just set it here whenever `open` becomes true.
  // To avoid the useEffect lint error, we can just reset it in a click handler in the parent, or do it on render:
  if (open && selectedReviewer === undefined && defaultReviewerId !== undefined) {
    setSelectedReviewer(defaultReviewerId);
  }

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => getEmployees(),
    enabled: open,
  });

  const allUsers = data?.result || [];
  // Filter out the current user — you can't review your own work
  const users = currentUserId ? allUsers.filter((u: UserDto) => u.id !== currentUserId) : allUsers;

  const handleConfirm = () => {
    if (selectedReviewer) {
      onConfirm(selectedReviewer);
    }
  };

  return (
    <Modal
      title="Submit for Review"
      open={open}
      onCancel={onClose}
      onOk={handleConfirm}
      okText="Submit"
      cancelText="Cancel"
      confirmLoading={loading}
      okButtonProps={{ disabled: !selectedReviewer, style: { backgroundColor: '#16a34a', borderColor: '#16a34a' } }}
    >
      <div className="py-4">
        <p className="text-xs text-gray-500 mb-4">
          The selected reviewer will receive a review task. They can approve or request changes on the work.
        </p>
        <label className="block text-sm font-medium text-[#111111] mb-2">
          Select Reviewer
        </label>
        {isLoading ? (
          <div className="flex justify-center p-4"><Spin /></div>
        ) : (
          <Select
            showSearch
            className="w-full h-10"
            placeholder="Search team members..."
            value={selectedReviewer}
            onChange={setSelectedReviewer}
            optionFilterProp="label"
            options={users.map((user: UserDto) => ({
              label: user.name,
              value: user.id,
              user: user,
            }))}
            optionRender={(option) => {
              const u = option.data.user;
              const designation = u.user_profile?.designation || u.designation || 'Team Member';
              const roleName = typeof u.role === 'object' ? u.role?.name : u.role || 'User';

              return (
                <div className="flex items-center gap-3 py-1">
                  <Avatar src={u.profile_pic || u.user_profile?.profile_pic || undefined} style={{ backgroundColor: '#EEEEEE', color: '#666666' }}>
                    {u.name ? u.name.charAt(0).toUpperCase() : '?'}
                  </Avatar>
                  <div className="flex flex-col flex-1 min-w-0">
                    <Text className="font-semibold text-sm truncate">{u.name}</Text>
                    <div className="flex items-center gap-2 text-xs text-gray-500 truncate">
                      <span>{designation}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                      <span>{roleName}</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
        )}
      </div>
    </Modal>
  );
}
