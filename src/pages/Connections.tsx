import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Loader2 } from 'lucide-react';
import { ConnectionCard } from '@/components/ConnectionCard';
import { TopBar } from '@/components/TopBar';
import { toast } from 'sonner'; // Use sonner as per api integrate, or hooks/use-toast if preferred? api integrate used sonner.
import { bridgesApi } from '@/api/bridges';
import { useAuthStore } from '@/stores/authStore';
import { QRCodeSVG } from 'qrcode.react';

const platformNames = {
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  signal: 'Signal',
  gmail: 'Gmail',
  outlook: 'Outlook',
  erpnext: 'ERPNext',
};

interface ConnectionState {
  platform: 'whatsapp' | 'linkedin' | 'signal' | 'gmail' | 'outlook' | 'erpnext';
  status: 'connected' | 'disconnected' | 'syncing';
  lastSync: string | null;
  contactCount: number;
}

export default function Connections() {
  const [connections, setConnections] = useState<ConnectionState[]>([
    { platform: 'whatsapp', status: 'disconnected', lastSync: null, contactCount: 0 },
    { platform: 'signal', status: 'disconnected', lastSync: null, contactCount: 0 },
    { platform: 'linkedin', status: 'disconnected', lastSync: null, contactCount: 0 },
    { platform: 'gmail', status: 'disconnected', lastSync: null, contactCount: 0 },
    { platform: 'outlook', status: 'disconnected', lastSync: null, contactCount: 0 },
    { platform: 'erpnext', status: 'disconnected', lastSync: null, contactCount: 0 }
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

  const [linkedinCurl, setLinkedinCurl] = useState('');
  const [linkedinMethod, setLinkedinMethod] = useState<'auto' | 'manual'>('auto');
  const [linkedinEmail, setLinkedinEmail] = useState('');
  const [linkedinPassword, setLinkedinPassword] = useState('');

  // ERPNext state
  const [erpnextUrl, setErpnextUrl] = useState('');
  const [erpnextApiKey, setErpnextApiKey] = useState('');
  const [erpnextApiSecret, setErpnextApiSecret] = useState('');

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const status = await bridgesApi.getStatus();
      setConnections(prev => prev.map(c => {
        if (c.platform === 'gmail' || c.platform === 'outlook') return c; // Handled separately
        const platformStatus = status[c.platform as keyof typeof status];
        return {
          ...c,
          status: platformStatus?.connected ? 'connected' : 'disconnected',
          contactCount: platformStatus?.contact_count || 0,
        };
      }));

      const gmailStatus = await bridgesApi.getGmailStatus();
      setConnections(prev => prev.map(c =>
        c.platform === 'gmail'
          ? { ...c, status: gmailStatus.is_connected ? 'connected' : 'disconnected', lastSync: gmailStatus.is_connected ? 'Active' : null, email: gmailStatus.email }
          : c
      ));

      const outlookStatus = await bridgesApi.getOutlookStatus();
      setConnections(prev => prev.map(c =>
        c.platform === 'outlook'
          ? { ...c, status: outlookStatus.is_connected ? 'connected' : 'disconnected', lastSync: outlookStatus.is_connected ? 'Active' : null, email: outlookStatus.email }
          : c
      ));

      // Fetch ERPNext status
      const erpnextStatus = await bridgesApi.getERPNextStatus();
      setConnections(prev => prev.map(c =>
        c.platform === 'erpnext'
          ? { ...c, status: erpnextStatus.is_connected ? 'connected' : 'disconnected', lastSync: erpnextStatus.is_connected ? 'Active' : null, contactCount: erpnextStatus.contact_count || 0 }
          : c
      ));

    } catch (error) {
      console.error("Failed to fetch connection status", error);
    }
  };

  const handleSyncContacts = async (platform: string) => {
    setSyncingPlatform(platform);
    try {
      let syncResp;
      if (platform === 'erpnext') {
        // ERPNext has its own sync endpoint that returns different format
        const data = await bridgesApi.syncERPNext();
        syncResp = { synced_count: data.synced_count + data.updated_count };
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
    if (!connectingPlatform || !qrCodeData) return;
    if (connectingPlatform === 'linkedin') return;

    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const wsUrl = `${import.meta.env.VITE_API_URL.replace('http', 'ws')}/ws/bridges/${connectingPlatform}/login?token=${token}`;
    console.log("Connecting to WS:", wsUrl);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => { console.log("WS Connected"); };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'refresh_needed') {
        handleConnect(connectingPlatform);
      } else if (data.type === 'success') {
        handleScanComplete();
      }
    };
    ws.onerror = (e) => { console.error("WS Error", e); };
    return () => { ws.close(); };
  }, [connectingPlatform, qrCodeData]);

  const waitForLoginCompletion = async (platform: string, loginId: string, stepId: string) => {
    try {
      const stepResponse = await bridgesApi.waitForLoginStep(platform, loginId, stepId);
      if (stepResponse.status === 'success') {
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
        handleCloseModal();
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
    if (connectingPlatform !== platform) {
      setConnectingPlatform(platform);
      setQrCodeData(null);
      setPairingCode(null);
      setLinkedinCurl('');
      setLinkedinPassword('');
      setLinkedinEmail('');
      setLinkedinMethod('auto');
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
          if (newLoginId && newStepId) {
            waitForLoginCompletion(platform, newLoginId, newStepId);
          }
        } else if (response.pairing_code) {
          setPairingCode(response.pairing_code);
          setQrCodeData(null);
          setShowPhoneInput(false);
          const newLoginId = response.login_id;
          const newStepId = response.step_id;
          if (newLoginId) setLoginId(newLoginId);
          if (newStepId) setStepId(newStepId);
          if (newLoginId && newStepId) {
            waitForLoginCompletion(platform, newLoginId, newStepId);
          }
        } else {
          if (!qrCodeData && !pairingCode) {
            toast.error(`Failed to get login code for ${platformNames[platform as keyof typeof platformNames]}`);
            setConnectingPlatform(null);
          }
        }
      } catch (error: any) {
        toast.error(error.message || `Failed to initiate ${platform} login`);
        if (!phone) setConnectingPlatform(null);
      } finally {
        setIsLoading(false);
      }
    } else if (platform === 'linkedin') {
      // UI Wait
      setIsLoading(false);
      toast.info(`${platformNames[platform as keyof typeof platformNames]} integration coming soon.`);
      setConnectingPlatform(null);
    }
  };

  const submitLinkedinAuto = async () => {
    if (!linkedinEmail || !linkedinPassword) return;
    setIsLoading(true);
    try {
      const response = await bridgesApi.login('linkedin', undefined, {
        username: linkedinEmail,
        password: linkedinPassword
      });

      if (response.status === 'success') {
        toast.success("LinkedIn connected successfully!");
        try {
          const syncResp = await bridgesApi.sync('linkedin');
          toast.success(`Synced ${syncResp.synced_count} connections.`);
          setConnections(prev => prev.map(c =>
            c.platform === 'linkedin'
              ? { ...c, status: 'connected', contactCount: syncResp.synced_count, lastSync: 'Just now' }
              : c
          ));
        } catch (e) {
          setConnections(prev => prev.map(c =>
            c.platform === 'linkedin'
              ? { ...c, status: 'connected', lastSync: 'Just now' }
              : c
          ));
        }
        handleCloseModal();
      } else if (response.status === 'error') {
        toast.error(response.message || "Failed to connect. Try Manual method.");
      } else {
        toast.error("Automatic login failed (likely Captcha). Switching to Manual.");
        setLinkedinMethod('manual');
      }
    } catch (e: any) {
      const msg = e.response?.data?.detail || e.message || "Login failed.";
      toast.error(msg);
      if (msg.includes("Captcha") || msg.includes("Manual")) {
        setLinkedinMethod('manual');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const submitLinkedinCurl = async () => {
    if (!linkedinCurl) return;
    setIsLoading(true);
    try {
      const response = await bridgesApi.login('linkedin', undefined, { cookie_cmd: linkedinCurl });
      if (response.status === 'success') {
        toast.success("LinkedIn connected successfully!");
        try {
          const syncResp = await bridgesApi.sync('linkedin');
          toast.success(`Synced ${syncResp.synced_count} connections.`);
          setConnections(prev => prev.map(c =>
            c.platform === 'linkedin'
              ? { ...c, status: 'connected', contactCount: syncResp.synced_count, lastSync: 'Just now' }
              : c
          ));
        } catch (e) {
          setConnections(prev => prev.map(c =>
            c.platform === 'linkedin'
              ? { ...c, status: 'connected', lastSync: 'Just now' }
              : c
          ));
        }
        handleCloseModal();
      } else if (response.status === 'error') {
        toast.error(response.message || "Failed to connect to LinkedIn");
      } else {
        toast.error("Unexpected response from LinkedIn bridge");
      }
    } catch (e: any) {
      toast.error(e.message || "Failed to connect LinkedIn");
    } finally {
      setIsLoading(false);
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
    setLinkedinCurl('');
    setLinkedinPassword('');
    setLinkedinEmail('');
    setLinkedinMethod('auto');
    // Reset ERPNext fields
    setErpnextUrl('');
    setErpnextApiKey('');
    setErpnextApiSecret('');
  };

  const handleScanComplete = async () => {
    if (!connectingPlatform || !loginId || !stepId) {
      toast.info("Waiting for scan... The connection will complete automatically.");
      return;
    }
    toast.info("Waiting for confirmation from WhatsApp... This may take a moment.");
  };

  const handleDisconnect = async (platform: string) => {
    try {
      if (platform === 'gmail') {
        await bridgesApi.disconnectGmail();
      } else if (platform === 'outlook') {
        await bridgesApi.disconnectOutlook();
      } else if (platform === 'erpnext') {
        await bridgesApi.disconnectERPNext();
      } else {
        await bridgesApi.logout(platform);
      }
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
          c.platform === 'erpnext'
            ? { ...c, status: 'connected', lastSync: 'Just now' }
            : c
        ));
        handleCloseModal();
        // Auto-sync contacts after connecting
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

              {connectingPlatform === 'linkedin' ? (
                <div className="flex flex-col space-y-4">
                  <div className="flex rounded-lg bg-muted p-1">
                    <button onClick={() => setLinkedinMethod('auto')} className={`flex-1 px-3 py-1 text-sm font-medium rounded-md transition-all ${linkedinMethod === 'auto' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}>
                      Automatic
                    </button>
                    <button onClick={() => setLinkedinMethod('manual')} className={`flex-1 px-3 py-1 text-sm font-medium rounded-md transition-all ${linkedinMethod === 'manual' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}>
                      Manual (Reliable)
                    </button>
                  </div>

                  {linkedinMethod === 'auto' ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Enter your LinkedIn credentials. We will attempt to connect automatically.
                        <br /><span className="text-xs text-yellow-600 dark:text-yellow-400">Note: Connection may fail if LinkedIn requests a Captcha.</span>
                      </p>
                      <input type="email" placeholder="Email" value={linkedinEmail} onChange={(e) => setLinkedinEmail(e.target.value)} className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <input type="password" placeholder="Password" value={linkedinPassword} onChange={(e) => setLinkedinPassword(e.target.value)} className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20" />
                      <button onClick={submitLinkedinAuto} disabled={!linkedinEmail || !linkedinPassword || isLoading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect"}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-muted-foreground">To connect LinkedIn reliably, copy the cURL command from your browser.</p>
                      <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                        <span className="font-semibold">Instructions:</span>
                        <ol className="list-decimal list-inside ml-1 space-y-1">
                          <li>Open LinkedIn (Developer Tools &rarr; Network).</li>
                          <li>Right click any request &rarr; <strong>Copy as cURL</strong>.</li>
                          <li>Paste it below.</li>
                        </ol>
                      </div>
                      <textarea value={linkedinCurl} onChange={(e) => setLinkedinCurl(e.target.value)} placeholder="curl 'https://www.linkedin.com/...' ..." className="w-full h-24 px-3 py-2 rounded-xl bg-muted/50 border border-border text-foreground text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none" />
                      <button onClick={submitLinkedinCurl} disabled={!linkedinCurl || isLoading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center">
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect with cURL"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
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
              )}

              {connectingPlatform === 'gmail' && (
                <div className="flex flex-col space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Connect your Gmail account to send personalized emails directly from Knudge.
                    You will be redirected to Google to authorize access.
                  </p>
                  <button onClick={handleConnectGmail} disabled={isLoading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <>
                        <span>Connect Gmail</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {connectingPlatform === 'outlook' && (
                <div className="flex flex-col space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Connect your Outlook account to send personalized emails directly from Knudge.
                    You will be redirected to Microsoft to authorize access.
                  </p>
                  <button onClick={handleConnectOutlook} disabled={isLoading} className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2">
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                      <>
                        <span>Connect Outlook</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {connectingPlatform === 'erpnext' && (
                <div className="flex flex-col space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Connect your ERPNext instance to sync contacts. You'll need your ERPNext site URL and API credentials.
                  </p>
                  <input
                    type="url"
                    placeholder="ERPNext URL (e.g., https://your-site.erpnext.com)"
                    value={erpnextUrl}
                    onChange={(e) => setErpnextUrl(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="text"
                    placeholder="API Key"
                    value={erpnextApiKey}
                    onChange={(e) => setErpnextApiKey(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <input
                    type="password"
                    placeholder="API Secret"
                    value={erpnextApiSecret}
                    onChange={(e) => setErpnextApiSecret(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-muted/50 border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    <span className="font-semibold">How to get API credentials:</span>
                    <ol className="list-decimal list-inside ml-1 space-y-1 mt-1">
                      <li>Go to ERPNext → Settings → My Settings</li>
                      <li>Scroll to "API Access" section</li>
                      <li>Generate new API key and secret</li>
                    </ol>
                  </div>
                  <button
                    onClick={submitERPNextConnect}
                    disabled={!erpnextUrl || !erpnextApiKey || !erpnextApiSecret || isLoading}
                    className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect ERPNext"}
                  </button>
                </div>
              )}

              {!showPhoneInput && !pairingCode && connectingPlatform !== 'linkedin' && connectingPlatform !== 'gmail' && connectingPlatform !== 'outlook' && connectingPlatform !== 'erpnext' && (
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
