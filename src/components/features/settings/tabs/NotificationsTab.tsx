import { Bell } from 'lucide-react';
import { Switch } from "antd";

interface NotificationsTabProps {
  notifications: {
    email: boolean;
    push: boolean;
    reports: boolean;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setNotifications: (val: any) => void;
}

export function NotificationsTab({ notifications, setNotifications }: NotificationsTabProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
      <h2 className="text-base font-semibold text-[#111111] mb-6">Notification Preferences</h2>
      <div className="space-y-6">
        <div className="flex items-center justify-between p-4 border border-[#EEEEEE] rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F7F7F7] rounded-full"><Bell className="w-5 h-5 text-[#666666]" /></div>
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Email Notifications</h3>
              <p className="text-xs text-[#666666]">Receive updates about leaves, payload, and announcements.</p>
            </div>
          </div>
          <Switch checked={notifications.email} onChange={(v) => setNotifications({ ...notifications, email: v })} />
        </div>
        <div className="flex items-center justify-between p-4 border border-[#EEEEEE] rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#F7F7F7] rounded-full"><Bell className="w-5 h-5 text-[#666666]" /></div>
            <div>
              <h3 className="text-sm font-bold text-[#111111]">Push Notifications</h3>
              <p className="text-xs text-[#666666]">Receive real-time alerts on your device.</p>
            </div>
          </div>
          <Switch checked={notifications.push} onChange={(v) => setNotifications({ ...notifications, push: v })} />
        </div>
      </div>
    </div>
  );
}
