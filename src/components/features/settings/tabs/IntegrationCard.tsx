import { Check, LogOut, RefreshCw, AlertCircle, ExternalLink } from 'lucide-react';
import { Button, Popconfirm, Tag } from "antd";

interface IntegrationCardProps {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    connected: boolean;
    loading?: boolean;
    status?: 'ACTIVE' | 'EXPIRED' | 'ERROR';
    onConnect: () => void;
    onDisconnect: () => void;
    onRefresh?: () => void;
    metadata?: {
        connected_by?: string;
        updated_at?: string;
    };
}

export function IntegrationCard({
    name,
    description,
    icon,
    connected,
    loading,
    status,
    onConnect,
    onDisconnect,
    onRefresh,
    metadata
}: IntegrationCardProps) {
    const isExpired = status === 'EXPIRED';

    return (
        <div className={`group relative rounded-3xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 overflow-hidden ${connected ? (isExpired ? 'border-red-100 bg-red-50/5' : 'border-[#F0F0F0] bg-white') : 'border-[#F0F0F0] bg-white'
            }`}>
            <div className="p-6">
                <div className="flex items-start justify-between mb-6">
                    <div className="w-14 h-14 bg-[#F9F9FB] rounded-2xl flex items-center justify-center border border-[#F0F0F3] transition-transform group-hover:scale-110 duration-300">
                        {icon}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        {connected ? (
                            <Tag color={isExpired ? "error" : "success"} className="rounded-full px-3 border-none flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider py-0.5">
                                {isExpired ? <AlertCircle className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                {isExpired ? "Action Required" : "Connected"}
                            </Tag>
                        ) : (
                            <Tag className="rounded-full px-3 bg-[#F0F0F0] text-[#999999] border-none font-bold text-[10px] uppercase tracking-wider py-0.5">
                                Available
                            </Tag>
                        )}
                    </div>
                </div>

                <h3 className="text-[16px] font-bold text-[#111111] mb-2">{name}</h3>
                <p className="text-[13px] text-[#666666] leading-relaxed line-clamp-2 mb-6 h-10">
                    {description}
                </p>

                <div className="flex items-center gap-3">
                    {!connected ? (
                        <Button
                            onClick={onConnect}
                            loading={loading}
                            className="bg-[#111111] hover:bg-[#333333] text-white font-bold px-6 h-10 rounded-xl text-[12px] border-none flex-1"
                        >
                            Connect
                        </Button>
                    ) : (
                        <>
                            {isExpired ? (
                                <Button
                                    onClick={onConnect}
                                    type="primary"
                                    className="bg-red-600 hover:bg-red-700 h-10 rounded-xl font-bold text-[12px] flex-1"
                                >
                                    Reconnect
                                </Button>
                            ) : (
                                <Button
                                    onClick={onRefresh}
                                    icon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
                                    className="h-10 rounded-xl border-[#F0F0F0] text-[#666666] flex-1 text-[12px] font-semibold"
                                >
                                    Sync
                                </Button>
                            )}

                            <Popconfirm
                                title="Disconnect"
                                description={`Disconnect ${name}?`}
                                onConfirm={onDisconnect}
                                okText="Yes"
                                cancelText="No"
                            >
                                <Button
                                    danger
                                    type="text"
                                    icon={<LogOut className="w-3.5 h-3.5" />}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 transition-colors"
                                />
                            </Popconfirm>
                        </>
                    )}
                </div>
            </div>

            {connected && metadata && (
                <div className="px-6 py-4 bg-[#FAFAFA] border-t border-[#F0F0F0] flex items-center justify-between">
                    <div className="flex flex-col">
                        <span className="text-[9px] text-[#999999] uppercase tracking-tighter font-bold">Updated</span>
                        <span className="text-[11px] text-[#333333] font-medium">
                            {metadata.updated_at ? new Date(metadata.updated_at).toLocaleDateString() : 'Never'}
                        </span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] text-[#999999] uppercase tracking-tighter font-bold">Admin</span>
                        <span className="text-[11px] text-[#333333] font-medium truncate max-w-[80px]">{metadata.connected_by || 'Admin'}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
