'use client';

import { useState, useEffect } from 'react';
import { Modal, App } from 'antd';
import { getReceivedInvites, acceptInviteById, declineInviteById } from '@/services/user';
import { Check, X, Building2, User } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function InvitationPopup() {
    const { message } = App.useApp();
    interface Invite {
        id: number;
        inviterName: string;
        inviterCompany?: string;
        inviterImage?: string;
        type?: string;
        created_at?: string;
        status: string;
    }

    const [isVisible, setIsVisible] = useState(false);
    const [invites, setInvites] = useState<Invite[]>([]);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const checkInvites = async () => {
            try {
                // Check if we've already shown the popup this session to avoid annoyance
                const hasShown = sessionStorage.getItem('invitationPopupShown');
                if (hasShown) return;

                const res = await getReceivedInvites();
                if (res.success && Array.isArray(res.result)) {
                    // Filter only PENDING invites
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const pending = res.result.filter((i: any) => i.status !== 'REJECTED' && i.status !== 'ACCEPTED');

                    if (pending.length > 0) {
                        setInvites(pending as unknown as Invite[]);
                        setIsVisible(true);
                        sessionStorage.setItem('invitationPopupShown', 'true');
                    }
                }
            } catch (error) {
                console.error('Failed to check invites', error);
            }
        };

        // Small delay to allow main data to load first
        const timer = setTimeout(checkInvites, 2000);
        return () => clearTimeout(timer);
    }, []);

    const handleAccept = async (id: number) => {
        setLoading(true);
        try {
            const res = await acceptInviteById(id);
            if (res.success) {
                message.success('Invitation accepted!');
                setInvites(prev => {
                    const remaining = prev.filter(i => i.id !== id);
                    if (remaining.length === 0) {
                        setIsVisible(false);
                    }
                    return remaining;
                });
                // Refresh page or redirection might be needed if it affects current view
                router.refresh();
            } else {
                message.error(res.message || 'Failed to accept invitation');
            }
        } catch {
            message.error('Failed to accept invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleDecline = async (id: number) => {
        setLoading(true);
        try {
            const res = await declineInviteById(id);
            if (res.success) {
                message.success('Invitation declined');
                setInvites(prev => {
                    const remaining = prev.filter(i => i.id !== id);
                    if (remaining.length === 0) {
                        setIsVisible(false);
                    }
                    return remaining;
                });
            } else {
                message.error(res.message || 'Failed to decline invitation');
            }
        } catch {
            message.error('Failed to decline invitation');
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setIsVisible(false);
    };

    if (!isVisible || invites.length === 0) return null;

    return (
        <Modal
            open={isVisible}
            onCancel={handleClose}
            footer={null}
            title={
                <div className="flex items-center gap-2 text-xl font-bold">
                    <span className="w-2 h-2 rounded-full bg-[#ff3b3b]"></span>
                    Pending Invitations
                </div>
            }
            width="min(500px, 95vw)"
            centered
            className="invitation-popup"
        >
            <div className="py-4 space-y-4">
                <p className="text-[#666666] text-sm">
                    You have {invites.length} pending invitation{invites.length > 1 ? 's' : ''} to join as a partner.
                </p>

                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                    {invites.map((invite) => (
                        <div key={invite.id} className="p-4 bg-[#FAFAFA] border border-[#EEEEEE] rounded-2xl flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${invite.type === 'ORGANIZATION' ? 'bg-[#FFF5F5] text-[#ff3b3b]' : 'bg-[#EFF6FF] text-[#2563EB]'}`}>
                                    {invite.inviterImage ? (
                                        <img src={invite.inviterImage} alt="" className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        invite.inviterCompany ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />
                                    )}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="font-bold text-[#111111] truncate">{invite.inviterName}</span>
                                    {invite.inviterCompany && (
                                        <span className="text-xs text-[#666666] truncate">{invite.inviterCompany}</span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => handleDecline(invite.id)}
                                    disabled={loading}
                                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#FEE2E2] text-[#999999] hover:text-[#DC2626] transition-all"
                                    title="Decline"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleAccept(invite.id)}
                                    disabled={loading}
                                    className="w-9 h-9 flex items-center justify-center rounded-full bg-[#111111] hover:bg-[#000000] text-white shadow-lg shadow-black/10 transition-all hover:scale-105 active:scale-95"
                                    title="Accept"
                                >
                                    <Check className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pt-2 text-center">
                    <button onClick={handleClose} className="text-[#999999] text-xs hover:text-[#111111] transition-colors">
                        Remind me later
                    </button>
                </div>
            </div>
        </Modal>
    );
}
