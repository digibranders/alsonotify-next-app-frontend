import { AlertTriangle } from 'lucide-react';
import { Button, Input, Switch, Divider } from "antd";
import { People24Filled } from "@fluentui/react-icons";

interface SecurityTabProps {
  isAdmin: boolean;
  canEditSecurity: boolean;
  isEditing: boolean;
  security: {
    twoFactor: boolean;
    currentPassword?: string;
    newPassword?: string;
    confirmPassword?: string;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setSecurity: (val: any) => void;
  defaultEmployeePassword: string;
  setDefaultEmployeePassword: (val: string) => void;
}

export function SecurityTab({
  canEditSecurity,
  isEditing,
  security,
  setSecurity,
  defaultEmployeePassword,
  setDefaultEmployeePassword,
}: Readonly<SecurityTabProps>) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 max-w-2xl">
      <h2 className="text-base font-semibold text-[#111111] mb-6">Security Settings</h2>

      <Divider />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#111111]">Two-Factor Authentication</h3>
          <p className="text-xs text-[#666666]">Add an extra layer of security to your account.</p>
        </div>
        <Switch checked={security.twoFactor} onChange={(v) => setSecurity({ ...security, twoFactor: v })} />
      </div>

      {canEditSecurity && (
        <>
          <Divider />
          <div className="mt-8">
            <h3 className="text-sm font-bold text-[#111111] mb-4 flex items-center gap-2">
              <People24Filled className="w-4 h-4 text-[#ff3b3b]" color="#ff3b3b" /> Default Employee Password
            </h3>
            <div className="max-w-md">
              <p className="text-xs text-[#666666] mb-3">This password will be pre-filled when creating new employees.</p>
              <Input
                placeholder="Default Password"
                value={defaultEmployeePassword}
                onChange={(e) => setDefaultEmployeePassword(e.target.value)}
                disabled={!isEditing}
                className="h-11 rounded-lg"
              />
            </div>
          </div>
        </>
      )}

      <Divider className="my-8" />
      
      <div className="p-4 border border-[#ff3b3b]/20 bg-[#FFF5F5] rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#ff3b3b]/10 rounded-full"><AlertTriangle className="w-5 h-5 text-[#ff3b3b]" /></div>
          <div>
            <h3 className="text-sm font-bold text-[#ff3b3b]">Delete Account</h3>
            <p className="text-xs text-[#ff3b3b]/80">Permanently delete your account and all data.</p>
          </div>
        </div>
        <Button danger type="primary">Delete Account</Button>
      </div>
    </div>
  );
}
