import { Plus, Edit, Lock, Check, Shield, ChevronRight } from 'lucide-react';
import { Button, Checkbox, Collapse } from "antd";
import { Role } from '@/types/domain';
import { RoleDto } from '@/types/dto/user.dto';
import { useState, useEffect } from 'react';

interface AccessManagementTabProps {
  canEditAccessManagement: boolean;
  rolesData: any;
  isLoadingRoles: boolean;
  selectedRoleId: number | null;
  setSelectedRoleId: (id: number | null) => void;
  setEditingRole: (role: Role | null) => void;
  setRoleFormName: (name: string) => void;
  setRoleFormColor: (color: string) => void;
  setIsRoleModalOpen: (val: boolean) => void;
  updatePermissionsMutation: any;
  isLoadingPermissions: boolean;
  rolePermissions: any;
  initialSelectedPermissionIds: Set<number>;
}

export function AccessManagementTab({
  canEditAccessManagement,
  rolesData,
  isLoadingRoles,
  selectedRoleId,
  setSelectedRoleId,
  setEditingRole,
  setRoleFormName,
  setRoleFormColor,
  setIsRoleModalOpen,
  updatePermissionsMutation,
  isLoadingPermissions,
  rolePermissions,
  initialSelectedPermissionIds,
}: AccessManagementTabProps) {
  const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<number>>(initialSelectedPermissionIds);

  // Sync local state when parent passes new permissions (e.g. after role change or rolePermissions load).
  useEffect(() => {
    setSelectedPermissionIds(new Set(initialSelectedPermissionIds));
  }, [initialSelectedPermissionIds]);

  return (
    <div className="bg-white rounded-[24px] p-8 border border-[#EEEEEE] mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-10">
        <div>
          <h2 className="text-[18px] font-['Manrope:Bold',sans-serif] text-[#111111]">Access Management</h2>
          <p className="text-[13px] text-[#666666] mt-1 font-['Manrope:Regular',sans-serif]">
            Manage roles and define specific permissions for your team.
          </p>
        </div>
        {canEditAccessManagement && (
          <Button
            onClick={() => {
              setEditingRole(null);
              setRoleFormName('');
              setIsRoleModalOpen(true);
            }}
            className="bg-[#111111] hover:bg-[#000000]/90 text-white font-['Manrope:SemiBold',sans-serif] px-6 h-11 rounded-full text-[13px] flex items-center gap-2 border-none transition-all shadow-md active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Add Role
          </Button>
        )}
      </div>

      <div className="flex gap-8 h-[calc(100vh-500px)] min-h-[500px]">
        {/* Roles List - Sticky */}
        <div className="w-1/3 flex flex-col">
          <div className="flex items-center h-10 mb-2 px-1">
            <span className="text-[12px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wider">
              Roles
            </span>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-1">
              {rolesData?.result
                ?.filter((role: Role) => role.name !== 'Super Admin')
                ?.sort((a: Role, b: Role) => {
                  const order = ['Admin', 'Head', 'Finance', 'HR', 'Manager', 'Employee'];
                  const aIdx = order.indexOf(a.name);
                  const bIdx = order.indexOf(b.name);
                  if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
                  if (aIdx !== -1) return -1;
                  if (bIdx !== -1) return 1;
                  return a.name.localeCompare(b.name);
                })
                ?.map((role: Role) => (
                  <div
                    key={role.id}
                    onClick={() => setSelectedRoleId(role.id)}
                    className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${selectedRoleId === role.id
                      ? 'bg-[#111111] text-white shadow-lg'
                      : 'hover:bg-[#F7F7F7] text-[#111111]'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <Lock className={`w-4 h-4 ${selectedRoleId === role.id ? 'text-white/70' : 'text-[#666666]'}`} />
                      <span className="text-[14px] font-['Manrope:Medium',sans-serif]">{role.name}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {canEditAccessManagement && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRole(role);
                            setRoleFormName(role.name);
                            setRoleFormColor(role.color || '#BBBBBB');
                            setIsRoleModalOpen(true);
                          }}
                          className={`p-1.5 rounded-md hover:bg-white/20 ${selectedRoleId === role.id ? 'text-white' : 'text-[#666666]'}`}
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              {isLoadingRoles && (
                <div className="py-8 text-center text-[#999999] text-[13px]">Loading roles...</div>
              )}
            </div>
          </div>
        </div>

        {/* Permissions Editor - Scrollable */}
        <div className="w-2/3 flex flex-col">
          {selectedRoleId ? (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between h-10 mb-2 px-1">
                <span className="text-[12px] font-['Manrope:Bold',sans-serif] text-[#999999] uppercase tracking-wider">
                  Permissions for {rolesData?.result?.find((r: Role) => r.id === selectedRoleId)?.name}
                </span>
                {canEditAccessManagement && (
                  <Button
                    onClick={() => {
                      updatePermissionsMutation.mutate({
                        roleId: selectedRoleId,
                        actions: Array.from(selectedPermissionIds),
                      });
                    }}
                    loading={updatePermissionsMutation.isPending}
                    className="bg-[#ff3b3b] hover:bg-[#ff3b3b]/90 text-white font-['Manrope:SemiBold',sans-serif] px-6 h-9 rounded-full text-[12px] border-none shadow-sm active:scale-95 transition-all"
                  >
                    Save Permissions
                  </Button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-6">
                {isLoadingPermissions ? (
                  <div className="py-20 text-center text-[#999999] text-[13px]">
                    Loading permissions...
                  </div>
                ) : (
                  <Collapse
                    ghost
                    accordion
                    expandIcon={({ isActive }) => (
                      <div className={`transition-transform duration-200 ${isActive ? 'rotate-90' : ''}`}>
                        <ChevronRight className="w-4 h-4 text-[#666666]" />
                      </div>
                    )}
                    className="custom-permissions-collapse"
                    items={rolePermissions?.result?.map((mod: any) => {
                      const actionIds = mod.actions.map((a: any) => a.id);
                      const allChecked = actionIds.every((id: any) => selectedPermissionIds.has(id));
                      const indeterminate = actionIds.some((id: any) => selectedPermissionIds.has(id)) && !allChecked;

                      return {
                        key: mod.module,
                        header: (
                          <div className="flex items-center justify-between w-full pr-4">
                            <span className="text-[14px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">
                              {mod.module}
                            </span>
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                indeterminate={indeterminate}
                                checked={allChecked}
                                onChange={(e) => {
                                  const next = new Set(selectedPermissionIds);
                                  actionIds.forEach((id: any) => {
                                    if (e.target.checked) next.add(id);
                                    else next.delete(id);
                                  });
                                  setSelectedPermissionIds(next);
                                }}
                              />
                            </div>
                          </div>
                        ),
                        label: (
                          <div className="flex items-center justify-between w-full pr-4">
                            <span className="text-[14px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">
                              {mod.module}
                            </span>
                            <div onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                indeterminate={indeterminate}
                                checked={allChecked}
                                onChange={(e) => {
                                  const next = new Set(selectedPermissionIds);
                                  actionIds.forEach((id: any) => {
                                    if (e.target.checked) next.add(id);
                                    else next.delete(id);
                                  });
                                  setSelectedPermissionIds(next);
                                }}
                              />
                            </div>
                          </div>
                        ),
                        children: (
                          <div className="grid grid-cols-2 gap-4 p-2">
                            {mod.actions.map((act: any) => (
                              <div
                                key={act.id}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer"
                                onClick={() => {
                                  const next = new Set(selectedPermissionIds);
                                  if (next.has(act.id)) next.delete(act.id);
                                  else next.add(act.id);
                                  setSelectedPermissionIds(next);
                                }}
                              >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedPermissionIds.has(act.id)
                                  ? 'bg-[#ff3b3b] border-[#ff3b3b]'
                                  : 'bg-white border-[#DDDDDD]'
                                  }`}>
                                  {selectedPermissionIds.has(act.id) && <Check className="w-2.5 h-2.5 text-white stroke-[4]" />}
                                </div>
                                <span className="text-[13px] text-[#666666] font-['Manrope:Medium',sans-serif]">
                                  {act.name}
                                </span>
                              </div>
                            ))}
                          </div>
                        ),
                        className: "mb-2 bg-[#F9FAFB] rounded-xl border-none overflow-hidden"
                      };
                    })}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-center p-8 bg-[#F9FAFB] rounded-2xl border border-dashed border-[#EEEEEE]">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
                <Shield className="w-6 h-6 text-[#999999]" />
              </div>
              <h3 className="text-[15px] font-['Manrope:SemiBold',sans-serif] text-[#111111]">Select a role</h3>
              <p className="text-[13px] text-[#666666] mt-1 max-w-[240px]">
                Select a role from the left to view and manage its permissions.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
