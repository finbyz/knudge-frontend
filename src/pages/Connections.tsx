import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Loader2 } from 'lucide-react';
import { ConnectionCard } from '@/components/ConnectionCard';
import { TopBar } from '@/components/TopBar';
import { toast } from 'sonner';
import { bridgesApi } from '@/api/bridges';
import { useAuthStore } from '@/stores/authStore';
import { QRCodeSVG } from 'qrcode.react';
import { TelegramLoginModal } from '@/components/TelegramLoginModal';

const platformNames = {
  whatsapp: 'WhatsApp',
  gmail: 'Gmail',
  outlook: 'Outlook',
  erpnext: 'ERPNext',
  telegram: 'Telegram',
  instagram: 'Instagram',
};

interface ConnectionState {
  platform: 'whatsapp' | 'email' | 'gmail' | 'outlook' | 'erpnext' | 'telegram' | 'instagram';
  status: 'connected' | 'disconnected' | 'syncing';
  lastSync: string | null;
  contactCount: number;
}

export default function Connections() {
  const [connections, setConnections] = useState<ConnectionState[]>([
    { platform: 'whatsapp', status: 'disconnected', lastSync: null, contactCount: 0 },
    { platform: 'gmail', status: 'disconnected', lastSync: null, contactCount: 0 },
    { platform: 'outlook', status: 'disconnected', lastSync: null, contactCount: 0 },
    { platform: 'erpnext', status: 'disconnected', lastSync: null, contactCount: 0 },
    { platform: 'telegram', status: 'disconnected', lastSync: null, contactCount: 0 },
    { platform: 'instagram', status: 'disconnected', lastSync: null, contactCount: 0 }
  ]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [showPhoneInput, setShowPhoneInput] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [loginId, setLoginId] = useState<string | null>(null);
  const [stepId, setStepId] = useState<string | null>(null);
  const [syncingPlatform, setSyncingPlatform] = useState<string | null>(null);

  const [erpnextUrl, setErpnextUrl] = useState('');
  const [erpnextApiKey, setErpnextApiKey] = useState('');
  const [erpnextApiSecret, setErpnextApiSecret] = useState('');

  const [showTelegramModal, setShowTelegramModal] = useState(false);

  const [instagramType, setInstagramType] = useState<'business' | 'personal' | null>(null);
  const [igUsername, setIgUsername] = useState('');
  const [igPassword, setIgPassword] = useState('');
  const [igVerificationCode, setIgVerificationCode] = useState('');
  const [requiresIgMfa, setRequiresIgMfa] = useState(false);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ✅ FIX: Promise.all se sab ek saath fetch karo, ek hi setConnections call
  const fetchStatus = async () => {
    try {
      const [status, gmailStatus, outlookStatus, erpnextStatus, telegramStatus, instagramStatus] =
        await Promise.all([
          bridgesApi.getStatus(),
          bridgesApi.getGmailStatus(),
          bridgesApi.getOutlookStatus(),
          bridgesApi.getERPNextStatus(),
          bridgesApi.getTelegramStatus(),
          bridgesApi.getInstagramStatus(),
        ]);

      setConnections(prev => prev.map(c => {
        if (c.platform === 'whatsapp') {
          return {
            ...c,
            status: status.whatsapp?.connected ? 'connected' : 'disconnected',
            contactCount: status.whatsapp?.contact_count || 0,
          };
        }
        if (c.platform === 'gmail') {
          return {
            ...c,
            status: gmailStatus.is_connected ? 'connected' : 'disconnected',
            lastSync: gmailStatus.is_connected ? 'Active' : null,
            contactCount: (gmailStatus as any).contact_count || 0,
          };
        }
        if (c.platform === 'outlook') {
          return {
            ...c,
            status: outlookStatus.is_connected ? 'connected' : 'disconnected',
            lastSync: outlookStatus.is_connected ? 'Active' : null,
            contactCount: (outlookStatus as any).contact_count || 0,
          };
        }
        if (c.platform === 'erpnext') {
          return {
            ...c,
            status: erpnextStatus.is_connected ? 'connected' : 'disconnected',
            lastSync: erpnextStatus.is_connected ? 'Active' : null,
            contactCount: erpnextStatus.contact_count || 0,
          };
        }
        if (c.platform === 'telegram') {
          return {
            ...c,
            status: telegramStatus.connected ? 'connected' : 'disconnected',
            lastSync: telegramStatus.connected ? 'Active' : null,
            contactCount: telegramStatus.contact_count || 0,
          };
        }
        if (c.platform === 'instagram') {
          return {
            ...c,
            status: instagramStatus.is_connected ? 'connected' : 'disconnected',
            lastSync: instagramStatus.is_connected ? 'Active' : null,
            contactCount: instagramStatus.contact_count || 0,
          };
        }
        return c;
      }));

    } catch (error) {
      console.error("Failed to fetch connection status", error);
    }
  };

  const handleSyncContacts = async (platform: string) => {
    setSyncingPlatform(platform);
    try {
      let syncResp;
      if (platform === 'erpnext') {
        const data = await bridgesApi.syncERPNext();
        syncResp = { synced_count: data.synced_count + data.updated_count };
      } else if (platform === 'telegram') {
        const syncResp = await bridgesApi.syncTelegram();
        toast.success(`Synced ${syncResp.contacts_synced} contacts and ${syncResp.messages_synced} messages.`);
        setConnections(prev => prev.map(c =>
          c.platform === 'telegram'
            ? { ...c, contactCount: syncResp.contacts_synced, lastSync: 'Just now' }
            : c
        ));
        return;
      } else if (platform === 'instagram') {
        const syncResp = await bridgesApi.syncInstagram();
        setConnections(prev => prev.map(c =>
          c.platform === 'instagram'
            ? { ...c, contactCount: syncResp.synced_count, lastSync: 'Just now' }
            : c
        ));
        toast.success(`Synced ${syncResp.synced_count} Instagram contacts.`);
        return;
      } else if (platform === 'outlook') {
        const outlookResp = await bridgesApi.syncOutlookEmails();
        toast.success(`Synced ${outlookResp.inbox_synced} inbox and ${outlookResp.sent_synced} sent emails from Outlook`);
        setConnections(prev => prev.map(c =>
          c.platform === 'outlook'
            ? { ...c, contactCount: outlookResp.inbox_synced + outlookResp.sent_synced, lastSync: 'Just now' }
            : c
        ));
        setSyncingPlatform(null);
        return;
      } else if (platform === 'gmail') {
        const gmailResp = await bridgesApi.sync('gmail');
        setConnections(prev => prev.map(c =>
          c.platform === 'gmail'
            ? { ...c, contactCount: gmailResp.synced_count, lastSync: 'Just now' }
            : c
        ));
        setSyncingPlatform(null);
        return;
      } else {
        syncResp = await bridgesApi.sync(platform);
      }
      setConnections(prev => prev.map(c =>
        c.platform === platform
          ? { ...c, contactCount: syncResp.synced_count, lastSync: 'Just now' }
          : c
      ));
      toast.success(`Synced ${syncResp.synced_count} contacts from ${platformNames[platform as keyof typeof platformNames]}`);
      await fetchStatus();
    } catch (error) {
      console.error(`Sync failed for ${platform}:`, error);
      toast.error(`Failed to sync contacts from ${platformNames[platform as keyof typeof platformNames]}`);
    } finally {
      setSyncingPlatform(null);
    }
  };

  useEffect(() => {
    if (!connectingPlatform || connectingPlatform !== 'whatsapp') return;
    if (!qrCodeData && !pairingCode) return;

    const platform = connectingPlatform;
    let active = true;

    const poll = async () => {
      while (active) {
        try {
          const status = await bridgesApi.getStatus();
          const waStatus = status?.whatsapp;
          if (waStatus?.connected) {
            setConnectingPlatform(null);
            setQrCodeData(null);
            setPairingCode(null);
            setShowPhoneInput(false);
            setPhoneNumber('');
            setLoginId(null);
            setStepId(null);
            toast.success("WhatsApp connected successfully!");
            bridgesApi.sync(platform)
              .then(resp => {
                toast.success(`Synced ${resp.synced_count} contacts.`);
                fetchStatus();
              })
              .catch(() => { fetchStatus(); });
            return;
          }
        } catch (e) {
          console.error("Poll error:", e);
        }
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    };

    poll();
    return () => { active = false; };
  }, [connectingPlatform, qrCodeData, pairingCode]);

  const waitForLoginCompletion = async (platform: string, loginId: string, stepId: string) => {
    try {
      const stepResponse = await bridgesApi.waitForLoginStep(platform, loginId, stepId);
      if (stepResponse.status === 'success') {
        handleCloseModal();
        toast.success("Login successful! Syncing contacts...");
        try {
          const syncResp = await bridgesApi.sync(platform);
          toast.success(`Connected! Synced ${syncResp.synced_count} contacts.`);
          setConnections(prev => prev.map(c =>
            c.platform === platform
              ? { ...c, status: 'connected', contactCount: syncResp.synced_count, lastSync: 'Just now' }
              : c
          ));
        } catch (syncError: any) {
          setConnections(prev => prev.map(c =>
            c.platform === platform ? { ...c, status: 'connected', lastSync: 'Just now' } : c
          ));
        }
        fetchStatus();
      } else if (stepResponse.qr_code) {
        setQrCodeData(stepResponse.qr_code);
        if (stepResponse.login_id) setLoginId(stepResponse.login_id);
        if (stepResponse.step_id) setStepId(stepResponse.step_id);
        if (stepResponse.login_id && stepResponse.step_id) {
          waitForLoginCompletion(platform, stepResponse.login_id, stepResponse.step_id);
        }
      } else {
        toast.error(stepResponse.message || "Login failed. Please try again.");
        setConnectingPlatform(null);
        setQrCodeData(null);
      }
    } catch (error: any) {
      if (connectingPlatform === platform) {
        toast.error(error.message || "Login timed out. Please try again.");
        setConnectingPlatform(null);
        setQrCodeData(null);
      }
    }
  };

  const handleConnect = async (platform: string, phone?: string) => {
    if (platform === 'telegram') { setShowTelegramModal(true); return; }
    if (platform === 'gmail') { handleConnectGmail(); return; }
    if (platform === 'outlook') { handleConnectOutlook(); return; }

    if (connectingPlatform !== platform) {
      setConnectingPlatform(platform);
      setQrCodeData(null);
      setPairingCode(null);
    }

    if (platform === 'whatsapp' || platform === 'signal') {
      setIsLoading(true);
      try {
        const response = await bridgesApi.login(platform, phone);
        if (response.qr_code) {
          setQrCodeData(response.qr_code);
          setPairingCode(null);
          setShowPhoneInput(false);
          const newLoginId = response.login_id;
          const newStepId = response.step_id;
          if (newLoginId) setLoginId(newLoginId);
          if (newStepId) setStepId(newStepId);
          if (newLoginId && newStepId) waitForLoginCompletion(platform, newLoginId, newStepId);
        } else if (response.pairing_code) {
          setPairingCode(response.pairing_code);
          setQrCodeData(null);
          setShowPhoneInput(false);
          const newLoginId = response.login_id;
          const newStepId = response.step_id;
          if (newLoginId) setLoginId(newLoginId);
          if (newStepId) setStepId(newStepId);
          if (newLoginId && newStepId) waitForLoginCompletion(platform, newLoginId, newStepId);
        }
      } catch (error: any) {
        toast.error(error.message || `Failed to initiate ${platform} login`);
        if (!phone) setConnectingPlatform(null);
      } finally {
        setIsLoading(false);
      }
    } else if (platform === 'instagram') {
      setConnectingPlatform(platform);
      setInstagramType(null);
    }
  };

  const handleCloseModal = () => {
    setConnectingPlatform(null);
    setQrCodeData(null);
    setPairingCode(null);
    setShowPhoneInput(false);
    setPhoneNumber('');
    setLoginId(null);
    setStepId(null);
    setErpnextUrl('');
    setErpnextApiKey('');
    setErpnextApiSecret('');
    setInstagramType(null);
    setIgUsername('');
    setIgPassword('');
    setIgVerificationCode('');
    setRequiresIgMfa(false);
  };

  const handleScanComplete = async (platform?: string) => {
    if (!connectingPlatform || !loginId || !stepId) {
      toast.info("Waiting for scan... The connection will complete automatically.");
      return;
    }
    toast.success("Login successful! Syncing contacts...");
    if (platform) {
      try {
        const syncResp = await bridgesApi.sync(platform);
        toast.success(`Connected! Synced ${syncResp.synced_count} contacts.`);
        setConnections(prev => prev.map(c =>
          c.platform === platform
            ? { ...c, status: 'connected', contactCount: syncResp.synced_count, lastSync: 'Just now' }
            : c
        ));
      } catch (syncError: any) {
        setConnections(prev => prev.map(c =>
          c.platform === platform ? { ...c, status: 'connected', lastSync: 'Just now' } : c
        ));
      }
    }
    handleCloseModal();
    fetchStatus();
  };

  const handleDisconnect = async (platform: string) => {
    try {
      if (platform === 'gmail') await bridgesApi.disconnectGmail();
      else if (platform === 'outlook') await bridgesApi.disconnectOutlook();
      else if (platform === 'erpnext') await bridgesApi.disconnectERPNext();
      else if (platform === 'telegram') await bridgesApi.disconnectTelegram();
      else if (platform === 'instagram') await bridgesApi.disconnectInstagram();
      else await bridgesApi.logout(platform);

      setConnections(prev => prev.map(c =>
        c.platform === platform
          ? { ...c, status: 'disconnected', contactCount: 0, lastSync: null }
          : c
      ));
      toast.success(`${platformNames[platform as keyof typeof platformNames]} disconnected.`);
    } catch (error) {
      toast.error("Failed to disconnect.");
    }
  };

  const handleConnectGmail = async () => {
    setIsLoading(true);
    try {
      const { url } = await bridgesApi.getGmailAuthUrl();
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message || "Failed to get Gmail auth URL");
      setIsLoading(false);
    }
  };

  const handleConnectOutlook = async () => {
    setIsLoading(true);
    try {
      const { url } = await bridgesApi.getOutlookAuthUrl();
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message || "Failed to get Outlook auth URL");
      setIsLoading(false);
    }
  };

  const submitERPNextConnect = async () => {
    if (!erpnextUrl || !erpnextApiKey || !erpnextApiSecret) return;
    setIsLoading(true);
    try {
      const response = await bridgesApi.connectERPNext(erpnextApiKey, erpnextApiSecret, erpnextUrl);
      if (response.status === 'success') {
        toast.success(response.message || "ERPNext connected successfully!");
        setConnections(prev => prev.map(c =>
          c.platform === 'erpnext' ? { ...c, status: 'connected', lastSync: 'Just now' } : c
        ));
        handleCloseModal();
        handleSyncContacts('erpnext');
      } else {
        toast.error("Failed to connect to ERPNext");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to connect to ERPNext");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectInstagramBusiness = async () => {
    setIsLoading(true);
    try {
      const { url } = await bridgesApi.getInstagramAuthUrl();
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message || "Failed to get Instagram auth URL");
      setIsLoading(false);
    }
  };

  const submitInstagramPersonal = async () => {
    if (!igUsername || !igPassword) return;
    setIsLoading(true);
    try {
      const response = await bridgesApi.connectInstagramPersonal(igUsername, igPassword, requiresIgMfa ? igVerificationCode : undefined);
      if (response.requires_mfa) {
        setRequiresIgMfa(true);
        toast.info("Verification code required. Please check your Instagram app or email.");
      } else if (response.status === 'success') {
        toast.success("Instagram connected successfully!");
        fetchStatus();
        handleCloseModal();
      } else {
        toast.error(response.message || "Failed to connect to Instagram");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to connect to Instagram");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full bg-background pb-24">
      <TopBar title="Connections" />

      <main className="px-4 py-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <p className="text-muted-foreground mb-4">
            Connect your messaging platforms to let Knudge sync your conversations and draft personalized messages.
          </p>
        </motion.div>

        {connections.map((connection, index) => (
          <motion.div key={connection.platform} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.1 }}>
            <ConnectionCard
              connection={connection}
              onConnect={() => handleConnect(connection.platform)}
              onDisconnect={() => handleDisconnect(connection.platform)}
              onSync={() => handleSyncContacts(connection.platform)}
              isSyncing={syncingPlatform === connection.platform}
            />
          </motion.div>
        ))}
      </main>

      <TelegramLoginModal
        open={showTelegramModal}
        onOpenChange={setShowTelegramModal}
        onSuccess={() => {
          fetchStatus();
          handleSyncContacts('telegram');
        }}
      />

      <AnimatePresence>
        {connectingPlatform && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={handleCloseModal}>
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-card rounded-3xl shadow-elevated p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-foreground">
                  Connect {platformNames[connectingPlatform as keyof typeof platformNames]}
                </h3>
                <button onClick={handleCloseModal} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex flex-col items-center justify-center mb-6">
                {isLoading ? (
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Generating code...</span>
                  </div>
                ) : pairingCode ? (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-muted p-6 rounded-xl text-center">
                      <p className="text-sm text-muted-foreground mb-2">Enter this code on your phone</p>
                      <div className="text-3xl font-mono font-bold tracking-wider text-primary">{pairingCode}</div>
                    </div>
                    <button onClick={() => { setPairingCode(null); setShowPhoneInput(true); }} className="text-xs text-muted-foreground underline hover:text-primary transition-colors">Try different number</button>
                  </div>
                ) : showPhoneInput ? (
                  <div className="flex flex-col items-center space-y-4 w-full">
                    <input type="text" placeholder="e.g. +1234567890" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                    <button onClick={() => handleConnect(connectingPlatform!, phoneNumber)} disabled={!phoneNumber || isLoading} className="w-full py-2 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50">
                      {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Get Pairing Code"}
                    </button>
                    <button onClick={() => setShowPhoneInput(false)} className="text-sm text-primary underline">Use QR Code instead</button>
                  </div>
                ) : qrCodeData ? (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-dashed border-border relative">
                      <QRCodeSVG value={qrCodeData} size={256} level={"L"} includeMargin={false} className="w-64 h-64" />
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => handleConnect(connectingPlatform!)} className="text-xs text-muted-foreground underline hover:text-primary transition-colors">Refresh Code</button>
                      <button onClick={() => { setShowPhoneInput(true); setQrCodeData(null); }} className="text-xs text-primary underline hover:text-primary/80 transition-colors">Link with Phone Number</button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center space-y-2">
                    <p className="text-destructive">Failed to load login option</p>
                    <button onClick={() => handleConnect(connectingPlatform!)} className="text-sm text-primary underline">Retry</button>
                  </div>
                )}
              </div>

              {connectingPlatform === 'gmail' && (
                <div className="flex flex-col space-y-4">
                  <p className="text-sm text-muted-foreground">Connect your Gmail account to send personalized emails directly from Knudge. You will be redirected to Google to authorize access.</p>
                  <button onClick={handleConnectGmail} disabled={isLoading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Connect Gmail</span>}
                  </button>
                </div>
              )}

              {connectingPlatform === 'outlook' && (
                <div className="flex flex-col space-y-4">
                  <p className="text-sm text-muted-foreground">Connect your Outlook account to send personalized emails directly from Knudge. You will be redirected to Microsoft to authorize access.</p>
                  <button onClick={handleConnectOutlook} disabled={isLoading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Connect Outlook</span>}
                  </button>
                </div>
              )}

              {connectingPlatform === 'erpnext' && (
                <div className="flex flex-col space-y-4">
                  <p className="text-sm text-muted-foreground">Connect your ERPNext instance to sync contacts. You'll need your ERPNext site URL and API credentials.</p>
                  <input type="url" placeholder="ERPNext URL (e.g., https://your-site.erpnext.com)" value={erpnextUrl} onChange={(e) => setErpnextUrl(e.target.value)} className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input type="text" placeholder="API Key" value={erpnextApiKey} onChange={(e) => setErpnextApiKey(e.target.value)} className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <input type="password" placeholder="API Secret" value={erpnextApiSecret} onChange={(e) => setErpnextApiSecret(e.target.value)} className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    <span className="font-semibold">How to get API credentials:</span>
                    <ol className="list-decimal list-inside ml-1 space-y-1 mt-1">
                      <li>Go to ERPNext → Settings → My Settings</li>
                      <li>Scroll to "API Access" section</li>
                      <li>Generate new API key and secret</li>
                    </ol>
                  </div>
                  <button onClick={submitERPNextConnect} disabled={!erpnextUrl || !erpnextApiKey || !erpnextApiSecret || isLoading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Connect ERPNext"}
                  </button>
                </div>
              )}

              {connectingPlatform === 'instagram' && !instagramType && (
                <div className="flex flex-col space-y-4">
                  <p className="text-sm text-muted-foreground">Choose your Instagram account type for the best experience.</p>
                  <button onClick={() => setInstagramType('business')} className="w-full p-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex flex-col gap-1">
                    <span className="font-semibold text-foreground">Official Business/Creator</span>
                    <span className="text-xs text-muted-foreground">Highly stable, uses OAuth. Requires a Facebook Page.</span>
                  </button>
                  <button onClick={() => setInstagramType('personal')} className="w-full p-4 rounded-2xl border border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left flex flex-col gap-1">
                    <span className="font-semibold text-foreground">Personal Account</span>
                    <span className="text-xs text-muted-foreground">Full DM support. Uses username/password.</span>
                  </button>
                </div>
              )}

              {connectingPlatform === 'instagram' && instagramType === 'business' && (
                <div className="flex flex-col space-y-4">
                  <p className="text-sm text-muted-foreground">Connect your Instagram Business or Creator account via Meta. Requires that your account is linked to a Facebook Page.</p>
                  <button onClick={handleConnectInstagramBusiness} disabled={isLoading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect via Meta"}
                  </button>
                  <button onClick={() => setInstagramType(null)} className="text-sm text-primary underline">Back to choices</button>
                </div>
              )}

              {connectingPlatform === 'instagram' && instagramType === 'personal' && (
                <div className="flex flex-col space-y-4">
                  {!requiresIgMfa ? (
                    <>
                      <p className="text-sm text-muted-foreground">Login to your personal Instagram account. Knudge stores your session securely.</p>
                      <input type="text" placeholder="Instagram Username" value={igUsername} onChange={(e) => setIgUsername(e.target.value)} className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground" />
                      <input type="password" placeholder="Password" value={igPassword} onChange={(e) => setIgPassword(e.target.value)} className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground" />
                      <button onClick={submitInstagramPersonal} disabled={isLoading || !igUsername || !igPassword} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Connect Personal"}
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-muted-foreground">Enter the 6-digit verification code sent to your account.</p>
                      <input type="text" placeholder="Verification Code" value={igVerificationCode} onChange={(e) => setIgVerificationCode(e.target.value)} className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground text-center text-xl tracking-widest font-mono" maxLength={6} />
                      <button onClick={submitInstagramPersonal} disabled={isLoading || !igVerificationCode} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Verify Code"}
                      </button>
                    </>
                  )}
                  <button onClick={() => { setRequiresIgMfa(false); setInstagramType(null); }} className="text-sm text-primary underline">Back to choices</button>
                </div>
              )}

              {!showPhoneInput && !pairingCode && connectingPlatform !== 'gmail' && connectingPlatform !== 'outlook' && connectingPlatform !== 'erpnext' && connectingPlatform !== 'instagram' && (
                <p className="text-sm text-muted-foreground text-center mb-6">Scan this QR code with {platformNames[connectingPlatform as keyof typeof platformNames]} on your phone. The connection will complete automatically.</p>
              )}

              <button onClick={handleCloseModal} className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-medium flex items-center justify-center gap-2 mt-4">Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}