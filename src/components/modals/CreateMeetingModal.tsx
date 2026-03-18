'use client';

import { useState } from 'react';
import { Modal, Button, Input, DatePicker, App } from 'antd';
import { Video, Copy, ExternalLink } from 'lucide-react';
import { useCreateOnlineMeeting } from '@/hooks/useTeams';
import dayjs from 'dayjs';

interface CreateMeetingModalProps {
  open: boolean;
  onClose: () => void;
  defaultSubject?: string;
  defaultAttendees?: Array<{ email: string; name?: string }>;
}

export function CreateMeetingModal({
  open,
  onClose,
  defaultSubject = '',
  defaultAttendees = [],
}: CreateMeetingModalProps) {
  const { message } = App.useApp();
  const [subject, setSubject] = useState(defaultSubject);
  const [startTime, setStartTime] = useState<dayjs.Dayjs | null>(
    dayjs().add(15, 'minute').startOf('minute')
  );
  const [endTime, setEndTime] = useState<dayjs.Dayjs | null>(
    dayjs().add(75, 'minute').startOf('minute')
  );
  const [joinUrl, setJoinUrl] = useState<string | null>(null);

  const createMeeting = useCreateOnlineMeeting();

  const handleCreate = async () => {
    if (!subject.trim()) {
      message.warning('Please enter a meeting subject');
      return;
    }
    if (!startTime || !endTime) {
      message.warning('Please select start and end times');
      return;
    }

    try {
      const result = await createMeeting.mutateAsync({
        subject: subject.trim(),
        startDateTime: startTime.toISOString(),
        endDateTime: endTime.toISOString(),
        participants: defaultAttendees.length > 0
          ? {
              attendees: defaultAttendees.map((a) => ({
                upn: a.email,
                role: 'attendee' as const,
              })),
            }
          : undefined,
      });

      const url = result.result?.joinWebUrl || result.result?.joinUrl;
      if (url) {
        setJoinUrl(url);
        message.success('Meeting created successfully');
      }
    } catch {
      message.error('Failed to create meeting');
    }
  };

  const handleCopyLink = () => {
    if (joinUrl) {
      navigator.clipboard.writeText(joinUrl);
      message.success('Meeting link copied');
    }
  };

  const handleClose = () => {
    setSubject(defaultSubject);
    setStartTime(dayjs().add(15, 'minute').startOf('minute'));
    setEndTime(dayjs().add(75, 'minute').startOf('minute'));
    setJoinUrl(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      title={
        <div className="flex items-center gap-2 text-[#111111]">
          <Video size={18} />
          <span className="text-base font-semibold">
            {joinUrl ? 'Meeting Created' : 'Start a Teams Meeting'}
          </span>
        </div>
      }
      footer={null}
      destroyOnHidden
      width={480}
    >
      {joinUrl ? (
        <div className="flex flex-col gap-4 py-2">
          <p className="text-sm text-[#666666]">
            Your Teams meeting is ready. Share the link with participants.
          </p>
          <div className="flex items-center gap-2 p-3 bg-[#F7F7F7] rounded-xl">
            <span className="flex-1 text-sm text-[#111111] truncate">{joinUrl}</span>
            <Button
              size="small"
              icon={<Copy size={14} />}
              onClick={handleCopyLink}
            />
          </div>
          <div className="flex gap-3">
            <Button
              type="primary"
              icon={<ExternalLink size={14} />}
              onClick={() => window.open(joinUrl, '_blank')}
              className="flex-1"
              style={{ backgroundColor: '#ff3b3b', borderColor: '#ff3b3b' }}
            >
              Join Now
            </Button>
            <Button onClick={handleClose} className="flex-1">
              Close
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 py-2">
          <div>
            <label className="text-xs font-medium text-[#999999] uppercase tracking-wider block mb-1.5">
              Subject
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Meeting subject"
              size="large"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium text-[#999999] uppercase tracking-wider block mb-1.5">
                Start Time
              </label>
              <DatePicker
                showTime
                value={startTime}
                onChange={setStartTime}
                format="MMM D, YYYY h:mm A"
                className="w-full"
                size="large"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-[#999999] uppercase tracking-wider block mb-1.5">
                End Time
              </label>
              <DatePicker
                showTime
                value={endTime}
                onChange={setEndTime}
                format="MMM D, YYYY h:mm A"
                className="w-full"
                size="large"
              />
            </div>
          </div>
          {defaultAttendees.length > 0 && (
            <div>
              <label className="text-xs font-medium text-[#999999] uppercase tracking-wider block mb-1.5">
                Participants
              </label>
              <div className="flex flex-wrap gap-1.5">
                {defaultAttendees.map((a) => (
                  <span
                    key={a.email}
                    className="px-2.5 py-1 bg-[#F7F7F7] rounded-full text-xs text-[#666666]"
                  >
                    {a.name || a.email}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <Button
              type="primary"
              onClick={handleCreate}
              loading={createMeeting.isPending}
              className="flex-1"
              style={{ backgroundColor: '#ff3b3b', borderColor: '#ff3b3b' }}
            >
              Create Meeting
            </Button>
            <Button onClick={handleClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
