import { useState, useMemo, useRef, useEffect } from 'react';
import { Modal, Input, Select, DatePicker, App } from 'antd';
import { Calendar as CalendarIcon, Clock, X } from "lucide-react";
import dayjs from 'dayjs';
import { useEmployees } from '@/hooks/useUser';
import { createCalendarEvent, CreateEventPayload } from '../../services/calendar';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { FormLayout } from '../common/FormLayout';

const { TextArea } = Input;
const { Option } = Select;

interface Attendee {
  email: string;
  name?: string;
}

interface MeetingCreateModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess?: () => void;
  companyTimeZone: string;
  initialDate?: dayjs.Dayjs | null;
}

export function MeetingCreateModal({
  open,
  onCancel,
  onSuccess,
  companyTimeZone,
  initialDate = null
}: MeetingCreateModalProps) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);

  // Fetch employees for autocomplete (only when modal is open)
  const { data: employeesData } = useEmployees(open ? 'limit=100' : '');

  const [formData, setFormData] = useState({
    title: '',
    startDateTime: initialDate as dayjs.Dayjs | null,
    duration: '',
    customTime: '',
    attendees: [] as Attendee[],
    description: ''
  });

  // Update formData when initialDate changes
  useEffect(() => {
    if (open && initialDate) {
      setFormData(prev => ({ ...prev, startDateTime: initialDate }));
    }
  }, [open, initialDate]);

  const handleCancel = () => {
    setFormData({
      title: '',
      startDateTime: null,
      duration: '',
      customTime: '',
      attendees: [],
      description: ''
    });
    onCancel();
  };

  const handleCreateEvent = async () => {
    if (!formData.title.trim()) {
      message.error("Title is required");
      return;
    }
    if (!formData.startDateTime) {
      message.error("Start Date & Time is required");
      return;
    }
    if (!formData.duration && !formData.customTime) {
      message.error("Please select a duration or enter custom time");
      return;
    }

    try {
      setSubmitting(true);

      let endTime: dayjs.Dayjs;
      if (formData.customTime) {
        const [hours, minutes] = formData.customTime.split(':').map(Number);
        endTime = formData.startDateTime.hour(hours).minute(minutes || 0);
      } else {
        const durationMap: Record<string, number> = {
          '30 mins': 30,
          '45 mins': 45,
          '1 hour': 60,
          '1.5 hours': 90,
          '2 hours': 120,
        };
        const minutes = durationMap[formData.duration] || 60;
        endTime = formData.startDateTime.add(minutes, 'minute');
      }

      const payload: CreateEventPayload = {
        subject: formData.title.trim(),
        start: {
          dateTime: formData.startDateTime.toISOString(),
          timeZone: companyTimeZone,
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: companyTimeZone,
        },
        body: {
          contentType: "HTML",
          content: formData.description?.trim()
            ? formData.description
            : "<p>Microsoft Teams meeting</p>",
        },
        attendees: formData.attendees
          .filter((attendee) => !!attendee.email)
          .map((attendee) => ({
            emailAddress: {
              address: attendee.email,
              name: attendee.name,
            },
            type: "required" as const,
          })),
        isOnlineMeeting: true,
        onlineMeetingProvider: "teamsForBusiness",
      };

      await createCalendarEvent(payload);
      message.success("Event created successfully!");
      handleCancel();
      
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.eventsRoot() });
      if (onSuccess) onSuccess();
    } catch (error: unknown) {
      const errorMessage = (error as { response?: { data?: { message?: string } } })?.response?.data?.message || "Failed to create event";
      message.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={null}
      open={open}
      onCancel={handleCancel}
      footer={null}
      width="min(600px, 95vw)"
      centered
      className="rounded-[16px] overflow-hidden"
      closeIcon={<X className="w-5 h-5 text-[#666666]" />}
      styles={{
        body: { 
          padding: 0,
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        },
      }}
    >
      <FormLayout
        title="Create Event"
        subtitle="Schedule a new meeting or event with your team."
        icon={CalendarIcon}
        onCancel={handleCancel}
        onSubmit={handleCreateEvent}
        isLoading={submitting}
        submitLabel="Create"
      >
        <div className="space-y-5">
          <div className="space-y-2">
            <span className="text-[0.8125rem] font-bold text-[#111111]">
              <span className="text-[#ff3b3b]">*</span> Title
            </span>
            <Input
              placeholder="Event title"
              className={`h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] font-medium ${formData.title ? 'bg-white' : 'bg-[#F9FAFB]'}`}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <span className="text-[0.8125rem] font-bold text-[#111111]">
              <span className="text-[#ff3b3b]">*</span> Start Date & Time
            </span>
            <DatePicker
              showTime
              format="YYYY-MM-DD HH:mm"
              placeholder="Select start date & time"
              className={`w-full h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] ${formData.startDateTime ? 'bg-white' : 'bg-[#F9FAFB]'}`}
              value={formData.startDateTime}
              onChange={(date) => setFormData({ ...formData, startDateTime: date })}
              suffixIcon={<CalendarIcon className="w-4 h-4 text-[#666666]" />}
              disabledDate={(current) => current && current < dayjs().startOf('day')}
            />
          </div>

          <div className="space-y-2">
            <span className="text-[0.8125rem] font-bold text-[#111111]">
              <span className="text-[#ff3b3b]">*</span> End Time
            </span>
            <div className="flex items-center gap-3">
              <Select
                placeholder="Select duration"
                className={`flex-1 h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] ${formData.duration ? 'bg-white' : 'bg-[#F9FAFB]'}`}
                value={formData.duration}
                onChange={(value) => setFormData({ ...formData, duration: value })}
              >
                <Option value="30 mins">30 mins</Option>
                <Option value="45 mins">45 mins</Option>
                <Option value="1 hour">1 hour</Option>
                <Option value="1.5 hours">1.5 hours</Option>
                <Option value="2 hours">2 hours</Option>
              </Select>
              <Input
                placeholder="Custom time"
                className={`flex-1 h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] font-medium ${formData.customTime ? 'bg-white' : 'bg-[#F9FAFB]'}`}
                value={formData.customTime}
                onChange={(e) => setFormData({ ...formData, customTime: e.target.value })}
                suffix={<Clock className="w-4 h-4 text-[#666666]" />}
              />
            </div>
          </div>

          <AttendeesField
            attendees={formData.attendees}
            onAddAttendee={(attendee) => {
              if (!formData.attendees.some(a => a.email.toLowerCase() === attendee.email.toLowerCase())) {
                setFormData({
                  ...formData,
                  attendees: [...formData.attendees, attendee],
                });
              }
            }}
            onRemoveAttendee={(index) => {
              setFormData({
                ...formData,
                attendees: formData.attendees.filter((_, i) => i !== index),
              });
            }}
            employeesData={employeesData}
          />

          <div className="space-y-2">
            <span className="text-[0.8125rem] font-bold text-[#111111]">
              Description
            </span>
            <TextArea
              placeholder="Agenda, notes, etc."
              className={`min-h-[120px] rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] font-medium resize-none ${formData.description ? 'bg-white' : 'bg-[#F9FAFB]'}`}
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>
        </div>
      </FormLayout>
    </Modal>
  );
}

function AttendeesField({
  attendees,
  onAddAttendee,
  onRemoveAttendee,
  employeesData
}: {
  attendees: Attendee[];
  onAddAttendee: (attendee: Attendee) => void;
  onRemoveAttendee: (index: number) => void;
  employeesData: { result?: Array<{ email?: string; name?: string }> } | undefined;
}) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const employees = useMemo(() => {
    return employeesData?.result || [];
  }, [employeesData]);

  const suggestions = useMemo(() => {
    if (!inputValue.trim()) return [];

    const query = inputValue.toLowerCase();
    const filtered = employees.filter((emp: { email?: string; name?: string }) => {
      const email = (emp.email || '').toLowerCase();
      const name = (emp.name || '').toLowerCase();
      const isSelected = attendees.some(a => a.email.toLowerCase() === email);
      return !isSelected && (email.includes(query) || name.includes(query));
    });

    const isEmailFormat = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputValue);
    const isAlreadyAdded = attendees.some(a => a.email.toLowerCase() === inputValue.toLowerCase());

    if (isEmailFormat && !isAlreadyAdded && !filtered.some((emp: { email?: string }) => emp.email?.toLowerCase() === inputValue.toLowerCase())) {
      return [{ email: inputValue, name: inputValue }, ...filtered];
    }

    return filtered.slice(0, 5);
  }, [inputValue, employees, attendees]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    setShowSuggestions(value.trim().length > 0);
    setSelectedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
        const selected = suggestions[selectedIndex];
        onAddAttendee({
          email: selected.email || inputValue,
          name: selected.name
        });
      } else if (inputValue.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputValue.trim())) {
        onAddAttendee({
          email: inputValue.trim(),
          name: inputValue.trim()
        });
      }
      setInputValue('');
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }
  };

  const handleSelectSuggestion = (suggestion: { email?: string; name?: string }) => {
    onAddAttendee({
      email: suggestion.email || inputValue,
      name: suggestion.name
    });
    setInputValue('');
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative space-y-2">
      <span className="text-[0.8125rem] font-bold text-[#111111]">
        Attendees
      </span>

      {attendees.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2 min-h-[32px] p-2 border border-[#EEEEEE] rounded-lg bg-[#F9FAFB]">
          {attendees.map((attendee, idx) => (
            <span
              key={idx}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#EEEEEE] rounded-full text-[0.8125rem] text-[#111111] font-medium hover:border-[#ff3b3b]/30 transition-colors"
            >
              <span>{attendee.name || attendee.email}</span>
              <button
                onClick={() => onRemoveAttendee(idx)}
                className="ml-0.5 hover:bg-[#FEE2E2] rounded-full p-0.5 transition-colors"
                type="button"
              >
                <X className="w-3.5 h-3.5 text-[#666666] hover:text-[#ff3b3b]" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          placeholder="Type email address and press Enter"
          className={`h-11 rounded-lg border border-[#EEEEEE] focus:border-[#EEEEEE] font-medium ${inputValue ? 'bg-white' : 'bg-[#F9FAFB]'}`}
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim()) setShowSuggestions(true);
          }}
          suffix={
            <svg className="w-4 h-4 text-[#666666]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          }
        />

        {showSuggestions && suggestions.length > 0 && (
          <div
            ref={suggestionsRef}
            className="absolute z-50 w-full mt-1 bg-white border border-[#EEEEEE] rounded-lg shadow-lg max-h-[200px] overflow-y-auto"
          >
            {suggestions.map((suggestion: { email?: string; name?: string }, idx: number) => (
              <div
                key={idx}
                onClick={() => handleSelectSuggestion(suggestion)}
                className={`px-4 py-2.5 cursor-pointer transition-colors ${idx === selectedIndex
                  ? 'bg-[#F7F7F7]'
                  : 'hover:bg-[#FAFAFA]'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-[0.8125rem] font-medium text-[#111111]">
                      {suggestion.name || suggestion.email}
                    </div>
                    {suggestion.name && suggestion.email && (
                      <div className="text-[0.6875rem] font-normal text-[#666666]">
                        {suggestion.email}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
