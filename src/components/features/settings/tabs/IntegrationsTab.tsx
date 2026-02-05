import { useEffect, useState } from 'react';
import { Layout, Search, Sparkles, Check } from 'lucide-react';
import { Skeleton, App, Input } from "antd";
import { useSearchParams } from 'next/navigation';
import * as IntegrationService from '../../../../services/integration';
import { IntegrationCard } from './IntegrationCard';

interface IntegrationStatus {
  connected: boolean;
  status: 'ACTIVE' | 'EXPIRED' | 'ERROR';
  tenant_id?: string;
  connected_by?: {
    name: string;
    email: string;
  };
  updated_at?: string;
}

export function IntegrationsTab() {
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<IntegrationStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const data = await IntegrationService.getIntegrationStatus();
      if (data.result) {
        setStatus(data.result);
      }
    } catch (err) {
      console.error("Failed to fetch integration status", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();

    // Handle success/error from redirect
    const statusParam = searchParams.get('status');
    if (statusParam === 'success') {
      message.success('Integration connected successfully!');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations');
    } else if (statusParam === 'error') {
      message.error('Failed to connect integration.');
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations');
    }
  }, [searchParams]);

  const handleConnect = async () => {
    try {
      message.loading({ content: "Redirecting to Microsoft...", key: "connect" });
      await IntegrationService.connectAdmin();
    } catch (err) {
      message.error({ content: "Failed to initiate integration", key: "connect" });
    }
  };

  const handleDisconnect = async () => {
    try {
      message.loading({ content: "Disconnecting...", key: "disconnect" });
      const res = await IntegrationService.disconnectIntegration();
      if (res.success) {
        message.success({ content: "Successfully disconnected", key: "disconnect" });
        setStatus({ connected: false, status: 'ACTIVE' });
      } else {
        message.error({ content: res.message || "Failed to disconnect", key: "disconnect" });
      }
    } catch (err) {
      message.error({ content: "Operation failed", key: "disconnect" });
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton.Node active className="w-full !h-48" />
          <Skeleton.Node active className="w-full !h-48" />
          <Skeleton.Node active className="w-full !h-48" />
        </div>
      </div>
    );
  }

  const MicrosoftIcon = (
    <svg width="28" height="28" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10.8333 0H0V10.8333H10.8333V0Z" fill="#F25022" />
      <path d="M22.1667 0H11.3333V10.8333H22.1667V0Z" fill="#7FBA00" />
      <path d="M10.8333 11.3333H0V22.1667H10.8333V11.3333Z" fill="#00A4EF" />
      <path d="M22.1667 11.3333H11.3333V22.1667H22.1667V11.3333Z" fill="#FFB900" />
    </svg>
  );

  const SlackIcon = (
    <div className="w-7 h-7 flex items-center justify-center bg-white rounded-lg p-0.5">
      <svg viewBox="0 0 122.8 122.8" xmlns="http://www.w3.org/2000/svg"><path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.4 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#E01E5A" /><path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.4c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36C5F0" /><path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.4 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C67.7 5.8 73.5 0 80.6 0s12.9 5.8 12.9 12.9v32.3z" fill="#2EB67D" /><path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.4c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ECB22E" /></svg>
    </div>
  );

  const ZoomIcon = <div className="text-blue-500 font-bold text-xl scale-125">zoom</div>;

  return (
    <div className="max-w-6xl mx-auto py-10 px-6 animate-in fade-in duration-500">
      {/* Header with Search */}
      {/* <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-[28px] font-bold text-[#111111] tracking-tight">Integrations</h1>
          <p className="text-[14px] text-[#666666] mt-1">Enhance your workflow by connecting your favorite enterprise tools.</p>
        </div>
        <div className="relative group min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#999999] group-focus-within:text-[#111111] transition-colors" />
          <Input
            placeholder="Search integrations..."
            className="pl-11 h-12 rounded-2xl border-[#F0F0F0] hover:border-[#D0D0D0] focus:border-[#111111] focus:shadow-none bg-[#F9F9FB] transition-all"
            onChange={(e) => setSearchQuery(e.target.value.toLowerCase())}
          />
        </div>
      </div>

      {/* Installed Integrations */}
      {status?.connected && (
        <section className="mb-12 animate-in slide-in-from-top-4 duration-500">
          <div className="flex items-center gap-2 mb-6 ml-1">
            <Check className="w-4 h-4 text-green-500" />
            <h2 className="text-[14px] font-extrabold text-[#111111] uppercase tracking-wider">Installed Connections</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <IntegrationCard
              id="microsoft"
              name="Microsoft 365"
              description="Sync organization members, directories and global calendar events."
              icon={MicrosoftIcon}
              connected={true}
              status={status.status}
              loading={loading}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onRefresh={fetchStatus}
              metadata={{
                connected_by: status.connected_by?.name,
                updated_at: status.updated_at
              }}
            />
          </div>
        </section>
      )}

      {/* Featured / Recommended */}
      <section>
        {/* <div className="flex items-center gap-2 mb-6 ml-1">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <h2 className="text-[14px] font-extrabold text-[#111111] uppercase tracking-wider">Recommended Categories</h2>
        </div> */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {!status?.connected && (
            <IntegrationCard
              id="microsoft"
              name="Microsoft 365"
              description="Connect your organization's M365 account to sync employees and calendars."
              icon={MicrosoftIcon}
              connected={false}
              onConnect={handleConnect}
              onDisconnect={() => { }}
            />
          )}

          {/* <div className="opacity-60 grayscale pointer-events-none relative">
            <IntegrationCard
              id="slack"
              name="Slack"
              description="Coming Soon: Get notifications and manage tasks directly within Slack channels."
              icon={SlackIcon}
              connected={false}
              onConnect={() => { }}
              onDisconnect={() => { }}
            />
            <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-[#111111] z-10 border border-[#eee]">Soon</div>
          </div>

          <div className="opacity-60 grayscale pointer-events-none relative">
            <IntegrationCard
              id="zoom"
              name="Zoom"
              description="Coming Soon: Automatically create meeting links for your scheduled tasks and requirements."
              icon={ZoomIcon}
              connected={false}
              onConnect={() => { }}
              onDisconnect={() => { }}
            />
            <div className="absolute top-4 right-4 bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest text-[#111111] z-10 border border-[#eee]">Soon</div>
          </div> */}
        </div>
      </section>

      {/* Footer Helper */}
      <div className="mt-16 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-[40px] p-10 border border-blue-100 flex flex-col md:flex-row items-center gap-8 justify-between">
        <div className="flex items-start gap-6">
          <div className="bg-white p-4 rounded-3xl shadow-sm border border-blue-50 shrink-0">
            <Layout className="w-7 h-7 text-blue-500" />
          </div>
          <div>
            <h4 className="text-[16px] font-bold text-[#111111] mb-2">Manage Personal Calendars</h4>
            <p className="text-[14px] text-[#666666] leading-relaxed max-w-lg">
              These connections are for the **entire organization**. Individual employees can still connect their private calendars separately on the Calendar page.
            </p>
          </div>
        </div>
        <a href="/dashboard/calendar" className="bg-[#111111] text-white px-8 h-12 rounded-full flex items-center justify-center font-bold text-[13px] hover:bg-[#333333] transition-all whitespace-nowrap">
          Go to My Calendar
        </a>
      </div>
    </div>
  );
}
