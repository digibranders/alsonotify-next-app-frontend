import { Checkbox, Dropdown, MenuProps, Tag, Tooltip } from "antd";
import { MoreVertical, Trash2, Mail, Globe, User, Building } from "lucide-react";
import { EyeOutlined } from '@ant-design/icons';
import { Partner, PartnerStatus } from "@/types/domain";

interface PartnerRowProps {
    partner: Partner;
    selected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onStatusUpdate: (status: PartnerStatus) => void;
    onAssignManager?: (partnerId: number) => void; // Add callback
}

export function PartnerRow({
    partner,
    selected,
    onSelect,
    onEdit,
    onStatusUpdate,
    onAssignManager
}: PartnerRowProps) {

    const getInitials = (name: string) => {
        if (!name) return '?';
        const parts = name.split(' ').filter(Boolean);
        if (parts.length === 0) return '?';
        return parts
            .map(part => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    const isOrg = partner.type === 'ORGANIZATION';
    const managers = partner.account_managers || [];

    return (
        <div
            onClick={onEdit}
            className={`
        group bg-white border rounded-[16px] px-4 py-3 transition-all duration-300 cursor-pointer relative z-10
        ${selected
                    ? 'border-[#ff3b3b] shadow-[0_0_0_1px_#ff3b3b] bg-[#FFF5F5]'
                    : 'border-[#EEEEEE] hover:border-[#ff3b3b]/20 hover:shadow-lg'
                }
      `}
        >
            <div className="grid grid-cols-[40px_1.8fr_1fr_0.8fr_1.5fr_1fr_0.8fr_0.7fr_0.7fr_40px] gap-4 items-center">
                {/* Checkbox */}
                <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                        checked={selected}
                        onChange={(e) => {
                            e.stopPropagation();
                            onSelect();
                        }}
                        className="red-checkbox"
                    />
                </div>

                {/* Business / Name */}
                <div className="flex items-center gap-3">
                    <div className={`
             w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0
             ${isOrg ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#EFF6FF] text-[#2563EB]'}
           `}>
                        {getInitials(partner.company)}
                    </div>
                    <div className="flex flex-col">
                        <span className="font-['Manrope:Bold',sans-serif] text-[14px] text-[#111111] group-hover:text-[#ff3b3b] transition-colors">
                            {partner.company}
                        </span>
                        {isOrg && (
                            <span className="text-[11px] text-[#999999] font-['Manrope:Regular',sans-serif]">
                                Organization
                            </span>
                        )}
                    </div>
                </div>

                {/* Contact Person */}
                <div>
                    <span className="font-['Manrope:Medium',sans-serif] text-[13px] text-[#111111]">
                        {partner.name}
                    </span>
                </div>

                {/* Type */}
                <div>
                    <span className={`
             inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold capitalize
             ${!isOrg ? 'bg-[#EFF6FF] text-[#2563EB]' : 'bg-[#FEF2F2] text-[#DC2626]'}
           `}>
                        {isOrg ? <Building className="w-3 h-3" /> : <User className="w-3 h-3" />}
                        {partner.type === 'ORGANIZATION' ? 'Organization' : 'Individual'}
                    </span>
                </div>

                {/* Account Manager */}
                <div onClick={(e) => { e.stopPropagation(); onAssignManager?.(partner.id); }} className="cursor-pointer group/manager">
                    {managers.length > 0 ? (
                        <div className="flex -space-x-2 overflow-hidden">
                            {managers.slice(0, 3).map((manager: any) => (
                                <Tooltip key={manager.id} title={manager.name}>
                                    <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                        {manager.user_profile?.profile_pic ? (
                                            <img src={manager.user_profile.profile_pic} alt={manager.name} className="h-full w-full rounded-full object-cover" />
                                        ) : (
                                            getInitials(manager.name)
                                        )}
                                    </div>
                                </Tooltip>
                            ))}
                            {managers.length > 3 && (
                                <div className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-gray-50 flex items-center justify-center text-[10px] font-medium text-gray-500">
                                    +{managers.length - 3}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="text-[12px] text-[#999999] border border-dashed border-[#CCCCCC] px-2 py-0.5 rounded-full group-hover/manager:border-[#111111] group-hover/manager:text-[#111111] transition-colors">
                            Assign
                        </span>
                    )}
                </div>

                {/* Email */}
                <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2 text-[#666666] overflow-hidden">
                    <Mail className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[13px] font-['Manrope:Medium',sans-serif] truncate block text-[#111111]">
                        {partner.email}
                    </span>
                </div>

                {/* Onboarding */}
                <div>
                    <span className="text-[13px] text-[#111111] font-['Inter:Medium',sans-serif]">
                        {partner.onboarding}
                    </span>
                </div>

                {/* Status */}
                <div>
                    <Tag
                        color={
                            partner.status === 'active' ? 'success' :
                                partner.status === 'pending' ? 'warning' : 'default'
                        }
                        className="capitalize"
                    >
                        {partner.status}
                    </Tag>
                </div>

                {/* Country */}
                <div className="flex items-center gap-2 text-[#666666]">
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[13px] font-['Inter:Medium',sans-serif]">
                        {(() => {
                            if (!partner.country) return 'N/A';
                            try {
                                return new Intl.DisplayNames(['en'], { type: 'region' }).of(partner.country);
                            } catch {
                                return partner.country;
                            }
                        })()}
                    </span>
                </div>

                {/* Actions */}
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <Dropdown
                        menu={{
                            items: [
                                {
                                    key: 'edit',
                                    label: 'View Details',
                                    icon: <EyeOutlined className="w-3.5 h-3.5" />,
                                    onClick: onEdit,
                                    className: "text-[13px] font-['Manrope:Medium',sans-serif]"
                                },
                                ...(partner.status !== 'pending' ? [{
                                    key: 'status',
                                    label: partner.status === 'active' ? 'Deactivate' : 'Activate',
                                    icon: partner.status === 'active' ? <Trash2 className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />,
                                    onClick: () => onStatusUpdate(partner.status === 'active' ? 'inactive' : 'active'),
                                    danger: partner.status === 'active',
                                    className: "text-[13px] font-['Manrope:Medium',sans-serif]"
                                }] : [{
                                    key: 'pending',
                                    label: 'Invitation Pending',
                                    icon: <Globe className="w-3.5 h-3.5" />,
                                    disabled: true,
                                    className: "text-[13px] font-['Manrope:Medium',sans-serif]"
                                }])
                            ] as MenuProps['items']
                        }}
                        trigger={['click']}
                        placement="bottomRight"
                    >
                        <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-[#F7F7F7] transition-colors">
                            <MoreVertical className="w-4 h-4 text-[#666666]" />
                        </button>
                    </Dropdown>
                </div>
            </div>
        </div>
    );
}
