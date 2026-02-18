'use client';

import { useState, useMemo, useCallback } from 'react';
import { Modal, Input, Select, DatePicker, App, Radio, Segmented } from 'antd';
import { Calendar as CalendarIcon, Clock, X } from 'lucide-react';
import dayjs from 'dayjs';
import { useApplyForLeave } from '@/hooks/useLeave';
import { createCalendarEvent, CreateEventPayload } from '@/services/calendar';
import { getErrorMessage } from '@/types/api-utils';
import { Employee } from '@/types/domain';
import { FormLayout } from '@/components/common/FormLayout';
import { useDebounce } from '@/hooks/useDebounce';

const { TextArea } = Input;
const { Option } = Select;

interface Attendee {
  email: string;
  name?: string;
}

interface CalendarEventFormProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  initialType?: 'event' | 'leave';
  initialDate?: dayjs.Dayjs | null;
  employeesData?: { result?: Employee[] };
  availableLeaveTypes?: string[];
  companyTimeZone?: string;
}

export function CalendarEventForm({
  open,
  onCancel,
  onSuccess,
  initialType = 'event',
  initialDate = null,
  employeesData,
  availableLeaveTypes = ['Sick Leave', 'Casual Leave', 'Vacation'],
  companyTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
}: Readonly<CalendarEventFormProps>) {
  const { message } = App.useApp();
  const [eventType, setEventType] = useState<'event' | 'leave'>(initialType);
  const [submitting, setSubmitting] = useState(false);
  const applyLeaveMutation = useApplyForLeave();

  const [formData, setFormData] = useState({
    title: '',
    startDateTime: initialDate,
    endDateTime: initialDate,
    duration: '1 hour',
    customTime: '',
    attendees: [] as Attendee[],
    description: '',
    leaveType: undefined as string | undefined,
    dayType: 'Full Day'
  });

  // Reset form when type changes or on open
  useMemo(() => {
    if (open) {
      setEventType(initialType);
      setFormData({
        title: '',
        startDateTime: initialDate,
        endDateTime: initialDate,
        duration: '1 hour',
        customTime: '',
        attendees: [],
        description: '',
        leaveType: undefined,
        dayType: 'Full Day'
      });
    }
  }, [open, initialType, initialDate]);

  const handleCreate = useCallback(async () => {
    if (eventType === 'event') {
      if (!formData.title.trim()) { message.error("Title is required"); return; }
      if (!formData.startDateTime) { message.error("Start Date & Time is required"); return; }
      if (!formData.duration && !formData.customTime) { message.error("Please select a duration or enter custom time"); return; }

      try {
        setSubmitting(true);
        let endTime: dayjs.Dayjs;
        if (formData.customTime) {
          const [hours, minutes] = formData.customTime.split(':').map(Number);
          endTime = formData.startDateTime.hour(hours).minute(minutes || 0);
        } else {
          const durationMap: Record<string, number> = {
            '30 mins': 30, '45 mins': 45, '1 hour': 60, '1.5 hours': 90, '2 hours': 120,
          };
          const minutes = durationMap[formData.duration] || 60;
          endTime = formData.startDateTime.add(minutes, 'minute');
        }

        const payload: CreateEventPayload = {
          subject: formData.title.trim(),
          start: { dateTime: formData.startDateTime.toISOString(), timeZone: companyTimeZone },
          end: { dateTime: endTime.toISOString(), timeZone: companyTimeZone },
          body: { contentType: "HTML", content: formData.description?.trim() ? formData.description : "<p>Microsoft Teams meeting</p>" },
          attendees: formData.attendees.filter((a) => !!a.email).map((a) => ({ emailAddress: { address: a.email, name: a.name }, type: "required" as const })),
          isOnlineMeeting: true,
          onlineMeetingProvider: "teamsForBusiness",
        };

        await createCalendarEvent(payload);
        message.success("Event created successfully!");
        onSuccess?.();
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error, "Failed to create event");
        message.error(errorMessage);
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!formData.leaveType) { message.error("Leave Type is required"); return; }
      if (!formData.startDateTime) { message.error("Start Date is required"); return; }
      if (!formData.endDateTime) { message.error("End Date is required"); return; }
      if (!formData.description) { message.error("Reason is required"); return; }

      try {
        setSubmitting(true);
        await applyLeaveMutation.mutateAsync({
          start_date: formData.startDateTime.format('YYYY-MM-DD'),
          end_date: formData.endDateTime.format('YYYY-MM-DD'),
          day_type: formData.dayType,
          leave_type: formData.leaveType,
          reason: formData.description
        });
        message.success("Leave applied successfully!");
        onSuccess?.();
      } catch (error: unknown) {
        // Error already handled generally
      } finally {
        setSubmitting(false);
      }
    }
  }, [formData, eventType, companyTimeZone, message, onSuccess, applyLeaveMutation]);

  return (
    <Modal
      title={null}
      open={open}
      onCancel={onCancel}
      footer={null}
      width="min(600px, 95vw)"
      centered
      className="rounded-[16px] overflow-hidden"
      closeIcon={<X className="w-5 h-5 text-[#666666]" />}
      styles={{
        body: {
          padding: 0,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }
      }}
    >
      <FormLayout
        title={eventType === 'event' ? 'Create Event' : 'Apply Leave'}
        subtitle={eventType === 'event'
          ? 'Schedule a new meeting or event with your team.'
          : 'Apply for leave request to your manager.'}
        icon={CalendarIcon}
        onCancel={onCancel}
        onSubmit={handleCreate}
        isLoading={submitting}
        submitLabel={eventType === 'event' ? 'Create Event' : 'Apply Leave'}
        headerExtra={
          <Segmented
            options={[
              { label: 'Event', value: 'event' },
              { label: 'Leave', value: 'leave' }
            ]}
            value={eventType}
            onChange={(val) => setEventType(val as 'event' | 'leave')}
            className="bg-[#F7F7F7] p-1 rounded-lg"
          />
        }
      >
        <div className="space-y-5">
          {eventType === 'event' ? (
            <>
              <div className="space-y-2">
                <span className="text-[0.8125rem] font-bold text-[#111111]"><span className="text-[#ff3b3b]">*</span> Title</span>
                <Input placeholder="Event title" className={`h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] font-medium ${formData.title ? 'bg-white' : 'bg-[#F9FAFB]'}`} value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
              </div>
              <div className="space-y-2">
                <span className="text-[0.8125rem] font-bold text-[#111111]"><span className="text-[#ff3b3b]">*</span> Start Date & Time</span>
                <DatePicker showTime format="YYYY-MM-DD HH:mm" placeholder="Select start date & time" className={`w-full h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] ${formData.startDateTime ? 'bg-white' : 'bg-[#F9FAFB]'}`} value={formData.startDateTime} onChange={(date) => setFormData({ ...formData, startDateTime: date })} suffixIcon={<CalendarIcon className="w-4 h-4 text-[#666666]" />} disabledDate={(current) => current && current < dayjs().startOf('day')} />
              </div>
              <div className="space-y-2">
                <span className="text-[0.8125rem] font-bold text-[#111111]"><span className="text-[#ff3b3b]">*</span> End Time</span>
                <div className="flex items-center gap-3">
                  <Select placeholder="Select duration" className={`flex-1 h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] ${formData.duration ? 'bg-white' : 'bg-[#F9FAFB]'}`} value={formData.duration} onChange={(value) => setFormData({ ...formData, duration: value })}>
                    <Option value="30 mins">30 mins</Option>
                    <Option value="45 mins">45 mins</Option>
                    <Option value="1 hour">1 hour</Option>
                    <Option value="1.5 hours">1.5 hours</Option>
                    <Option value="2 hours">2 hours</Option>
                  </Select>
                  <Input placeholder="Custom time" className={`flex-1 h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] font-medium ${formData.customTime ? 'bg-white' : 'bg-[#F9FAFB]'}`} value={formData.customTime} onChange={(e) => setFormData({ ...formData, customTime: e.target.value })} suffix={<Clock className="w-4 h-4 text-[#666666]" />} />
                </div>
              </div>
              <AttendeesField attendees={formData.attendees} onAddAttendee={(attendee) => { if (!formData.attendees.some(a => a.email.toLowerCase() === attendee.email.toLowerCase())) { setFormData({ ...formData, attendees: [...formData.attendees, attendee] }); } }} onRemoveAttendee={(index) => { setFormData({ ...formData, attendees: formData.attendees.filter((_, i) => i !== index) }); }} employeesData={employeesData} />
              <div className="space-y-2">
                <span className="text-[0.8125rem] font-bold text-[#111111]">Description</span>
                <div className="space-y-2">
                  <TextArea placeholder="Agenda, notes, etc." className={`min-h-[120px] rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] font-medium resize-none ${formData.description ? 'bg-white' : 'bg-[#F9FAFB]'}`} rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Leave Type */}
              <div className="space-y-2">
                <span className="text-[0.8125rem] font-bold text-[#111111]"><span className="text-[#ff3b3b]">*</span> Leave Type</span>
                <Select
                  placeholder="Select leave type"
                  className={`w-full h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] ${formData.leaveType ? 'bg-white' : 'bg-[#F9FAFB]'}`}
                  value={formData.leaveType}
                  onChange={(value) => setFormData({ ...formData, leaveType: value })}
                >
                  {availableLeaveTypes.map(t => <Option key={t} value={t}>{t}</Option>)}
                </Select>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <span className="text-[0.8125rem] font-bold text-[#111111]"><span className="text-[#ff3b3b]">*</span> Start Date</span>
                  <DatePicker format="YYYY-MM-DD" placeholder="Start Date" className={`w-full h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] ${formData.startDateTime ? 'bg-white' : 'bg-[#F9FAFB]'}`} value={formData.startDateTime} onChange={(date) => setFormData({ ...formData, startDateTime: date })} suffixIcon={<CalendarIcon className="w-4 h-4 text-[#666666]" />} />
                </div>
                <div className="space-y-2">
                  <span className="text-[0.8125rem] font-bold text-[#111111]"><span className="text-[#ff3b3b]">*</span> End Date</span>
                  <DatePicker format="YYYY-MM-DD" placeholder="End Date" className={`w-full h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] ${formData.endDateTime ? 'bg-white' : 'bg-[#F9FAFB]'}`} value={formData.endDateTime} onChange={(date) => setFormData({ ...formData, endDateTime: date })} suffixIcon={<CalendarIcon className="w-4 h-4 text-[#666666]" />} />
                </div>
              </div>

              {/* Day Type */}
              <div className="space-y-2">
                <span className="text-[0.8125rem] font-bold text-[#111111]"><span className="text-[#ff3b3b]">*</span> Day Type</span>
                <Radio.Group
                  value={formData.dayType}
                  onChange={(e) => setFormData({ ...formData, dayType: e.target.value })}
                  className="flex gap-4"
                >
                  <Radio value="Full Day">Full Day</Radio>
                  <Radio value="First Half">First Half</Radio>
                  <Radio value="Second Half">Second Half</Radio>
                </Radio.Group>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <span className="text-[0.8125rem] font-bold text-[#111111]"><span className="text-[#ff3b3b]">*</span> Reason</span>
                <TextArea placeholder="Reason for leave" className={`min-h-[120px] rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] font-medium resize-none ${formData.description ? 'bg-white' : 'bg-[#F9FAFB]'}`} rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
              </div>
            </>
          )}
        </div>
      </FormLayout>
    </Modal>
  );
}

function AttendeesField({ attendees, onAddAttendee, onRemoveAttendee, employeesData }: { attendees: Attendee[]; onAddAttendee: (attendee: Attendee) => void; onRemoveAttendee: (index: number) => void; employeesData: { result?: Employee[] } | undefined; }) {
  const [searchValue, setSearchValue] = useState('');
  // Use debounced value for filtering logic
  const debouncedSearchValue = useDebounce(searchValue, 300);

  const filteredEmployees = useMemo(() => {
    if (!debouncedSearchValue || !employeesData?.result) return [];
    return employeesData.result.filter((emp: Employee) =>
      emp.name.toLowerCase().includes(debouncedSearchValue.toLowerCase()) ||
      emp.email.toLowerCase().includes(debouncedSearchValue.toLowerCase())
    ).slice(0, 5);
  }, [debouncedSearchValue, employeesData]);

  return (
    <div className="space-y-2">
      <span className="text-[0.8125rem] font-bold text-[#111111]">Attendees</span>
      <div className="flex flex-wrap gap-2 mb-2">
        {attendees.map((attendee, index) => (
          <div key={index} className="flex items-center gap-1 bg-[#F7F7F7] px-2 py-1 rounded-md border border-[#EEEEEE]">
            <span className="text-[0.8125rem] font-medium text-[#111111]">{attendee.name || attendee.email}</span>
            <button onClick={() => onRemoveAttendee(index)} className="text-[#666666] hover:text-[#FF3B3B]">
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <div className="relative">
        <Input
          placeholder="Add attendees by email"
          className="h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] font-medium bg-[#F9FAFB]"
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && searchValue) {
              e.preventDefault();
              if (searchValue.includes('@')) {
                onAddAttendee({ email: searchValue, name: searchValue.split('@')[0] });
                setSearchValue('');
              }
            }
          }}
        />
        {searchValue && filteredEmployees.length > 0 && (
          <div className="absolute top-full left-0 w-full bg-white border border-[#EEEEEE] rounded-lg shadow-lg mt-1 z-50">
            {filteredEmployees.map((emp: Employee) => (
              <div
                key={emp.id}
                className="px-4 py-2 hover:bg-[#F7F7F7] cursor-pointer flex items-center gap-2"
                onClick={() => {
                  onAddAttendee({ email: emp.email, name: emp.name });
                  setSearchValue('');
                }}
              >
                <div className="w-6 h-6 rounded-full bg-[#111111] text-white flex items-center justify-center text-[0.625rem]">
                  {emp.name.charAt(0)}
                </div>
                <div>
                  <div className="text-[0.8125rem] font-medium text-[#111111]">{emp.name}</div>
                  <div className="text-[0.6875rem] text-[#666666]">{emp.email}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
