import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, QrCode, Loader2 } from 'lucide-react';
import { ConnectionCard } from '@/components/ConnectionCard';
import { PageShell } from '@/components/layout/PageShell';
import { toast } from 'sonner';
import { bridgesApi } from '@/api/bridges';
import { useAuthStore } from '@/stores/authStore';
import { QRCodeSVG } from 'qrcode.react';
import { TelegramLoginModal } from '@/components/TelegramLoginModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const platformNames = {
  whatsapp: 'WhatsApp',
  gmail: 'Gmail',
  outlook: 'Outlook',
  erpnext: 'ERPNext',
  telegram: 'Telegram',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
};

interface ConnectionState {
  platform: 'whatsapp' | 'email' | 'gmail' | 'outlook' | 'erpnext' | 'telegram' | 'instagram' | 'linkedin';
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
    { platform: 'instagram', status: 'disconnected', lastSync: null, contactCount: 0 },
    { platform: 'linkedin', status: 'disconnected', lastSync: null, contactCount: 0 },
  ]);
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [whatsappLifecycleState, setWhatsappLifecycleState] = useState<string | null>(null);
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

  const linkedinFileRef = useRef<HTMLInputElement>(null);
  const [liUsername, setLiUsername] = useState('');
  const [liPassword, setLiPassword] = useState('');
  const [liVerificationCode, setLiVerificationCode] = useState('');
  const [requiresLiMfa, setRequiresLiMfa] = useState(false);
  const [liChallengeUrl, setLiChallengeUrl] = useState<string | null>(null);

  // Disconnect confirmation state
  const [disconnectPlatform, setDisconnectPlatform] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(() => {
      fetchStatus();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const results = await Promise.allSettled([
        bridgesApi.getStatus(),
        bridgesApi.getGmailStatus(),
        bridgesApi.getOutlookStatus(),
        bridgesApi.getERPNextStatus(),
        bridgesApi.getTelegramStatus(),
        bridgesApi.getInstagramStatus(),
        bridgesApi.getLinkedInStatus(),
      ]);

      const [
        resStatus,
        resGmail,
        resOutlook,
        resErpnext,
        resTelegram,
        resInstagram,
        resLinkedin
      ] = results;

      setConnections(prev => prev.map(c => {
        if (c.platform === 'whatsapp') {
          const data = resStatus.status === 'fulfilled' ? resStatus.value : null;
          return {
            ...c,
            status: data?.whatsapp?.connected ? 'connected' : 'disconnected',
            contactCount: data?.whatsapp?.contact_count || 0,
          };
        }
        if (c.platform === 'gmail') {
          const data = resGmail.status === 'fulfilled' ? resGmail.value : null;
          return {
            ...c,
            status: data?.is_connected ? 'connected' : 'disconnected',
            lastSync: data?.is_connected ? 'Active' : null,
            contactCount: (data as any)?.contact_count || 0,
          };
        }
        if (c.platform === 'outlook') {
          const data = resOutlook.status === 'fulfilled' ? resOutlook.value : null;
          return {
            ...c,
            status: data?.is_connected ? 'connected' : 'disconnected',
            lastSync: data?.is_connected ? 'Active' : null,
            contactCount: (data as any)?.contact_count || 0,
          };
        }
        if (c.platform === 'erpnext') {
          const data = resErpnext.status === 'fulfilled' ? resErpnext.value : null;
          return {
            ...c,
            status: data?.is_connected ? 'connected' : 'disconnected',
            lastSync: data?.is_connected ? 'Active' : null,
            contactCount: data?.contact_count || 0,
          };
        }
        if (c.platform === 'telegram') {
          const data = resTelegram.status === 'fulfilled' ? resTelegram.value : null;
          return {
            ...c,
            status: data?.connected ? 'connected' : 'disconnected',
            lastSync: data?.connected ? 'Active' : null,
            contactCount: data?.contact_count || 0,
          };
        }
        if (c.platform === 'instagram') {
          const data = resInstagram.status === 'fulfilled' ? resInstagram.value : null;
          return {
            ...c,
            status: data?.is_connected ? 'connected' : 'disconnected',
            lastSync: data?.is_connected ? 'Active' : null,
            contactCount: data?.contact_count || 0,
          };
        }
        if (c.platform === 'linkedin') {
          const data = resLinkedin.status === 'fulfilled' ? resLinkedin.value : null;
          const csv = data?.connected || false;
          const msg = data?.messaging_connected || false;
          const needsMfa = data?.status === 'requires_mfa';
          
          if (needsMfa && !requiresLiMfa) {
            toast.error("LinkedIn requires re-authentication (MFA required)", {
              description: "Please visit the Connections page to provide your verification code."
            });
            setRequiresLiMfa(true);
          }

          return {
            ...c,
            status: needsMfa ? 'disconnected' : (csv || msg ? 'connected' : 'disconnected'),
            lastSync: needsMfa ? 'Action Required' : (csv || msg ? 'Active' : null),
            contactCount: Math.max(
              data?.contact_count || 0,
              data?.linkedin_chat_count || 0
            ),
          };
        }
        return c;
      }));
    } catch (e: unknown) {
      console.error('Fetch status failed:', e);
    }
  };

  const handleLinkedInFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setIsLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await bridgesApi.importLinkedInConnections(fd);
      toast.success(
        `LinkedIn: ${r.created} new, ${r.updated} updated${r.skipped ? `, ${r.skipped} skipped` : ''} (${r.total_rows} rows).`
      );
      handleCloseModal();
      await fetchStatus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Import failed';
      toast.error(msg);
    } finally {
      setIsLoading(false);
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
        try {
          const inboxR = await bridgesApi.syncGmailInbox();
          toast.success(
            `Synced ${gmailResp.synced_count} contacts; fetched ${inboxR.synced_count} inbox messages.`
          );
        } catch {
          toast.success(`Synced ${gmailResp.synced_count} Gmail contacts.`);
        }
        setConnections(prev => prev.map(c =>
          c.platform === 'gmail'
            ? { ...c, contactCount: gmailResp.synced_count, lastSync: 'Just now' }
            : c
        ));
        setSyncingPlatform(null);
        return;
      } else if (platform === 'linkedin') {
        try {
          const li = await bridgesApi.getLinkedInStatus();
          if (li.messaging_connected) {
            const r = await bridgesApi.syncLinkedIn();
            toast.success(
              `LinkedIn chats synced (${r.messages_new ?? 0} new messages, ${r.chats ?? 0} chats).`
            );
            await fetchStatus();
            setSyncingPlatform(null);
            return;
          }
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'Messaging sync failed';
          toast.error(msg);
        }
        toast.message('Re-import LinkedIn connections', {
          description: 'Choose an updated Connections.csv from your LinkedIn data export.',
        });
        linkedinFileRef.current?.click();
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
      const msg =
        error instanceof Error
          ? error.message
          : `Failed to sync contacts from ${platformNames[platform as keyof typeof platformNames]}`;
      toast.error(msg);
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
      let sawDisconnected = false;
      let iterations = 0;
      while (active) {
        try {
          const status = await bridgesApi.getStatus();
          const waStatus = status?.whatsapp as
            | { connected?: boolean; contact_count?: number; state?: string | null; last_error?: string | null }
            | undefined;
          const waState = String(waStatus?.state || '').toUpperCase();
          if (waState) setWhatsappLifecycleState(waState);
          const conn = waState === 'CONNECTED' || waState === 'READY' || !!waStatus?.connected;
          // Require a "not connected" observation before accepting "connected", otherwise a stale
          // bridge session makes the wizard complete without scanning the new QR.
          if (!conn) {
            sawDisconnected = true;
          }
          // Hide QR as soon as the scan is done (CONNECTING -> SCANNED/CONNECTED/READY).
          if (waState && waState !== 'CONNECTING' && qrCodeData) {
            setQrCodeData(null);
          }
          if (conn && sawDisconnected) {
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
          iterations += 1;
          if (conn && !sawDisconnected && iterations >= 20) {
            toast.error(
              "WhatsApp still looks linked from before. Tap Disconnect, wait a few seconds, then Connect again."
            );
            return;
          }
        } catch (e) {
          console.error("Poll error:", e);
        }
        await new Promise(resolve => setTimeout(resolve, 2500));
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
    if (platform === 'linkedin') {
      setConnectingPlatform('linkedin');
      return;
    }

    if (connectingPlatform !== platform) {
      setConnectingPlatform(platform);
      setQrCodeData(null);
      setPairingCode(null);
      if (platform === 'whatsapp') setWhatsappLifecycleState(null);
    }

    if (platform === 'whatsapp' || platform === 'signal') {
      setIsLoading(true);
      try {
        const response = await bridgesApi.login(platform, phone);
        if (response.qr_code) {
          setQrCodeData(response.qr_code);
          setPairingCode(null);
          setShowPhoneInput(false);
          void fetchStatus();
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
    setWhatsappLifecycleState(null);
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
    setLiVerificationCode('');
    setRequiresLiMfa(false);
    setLiChallengeUrl(null);
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

  const requestDisconnect = (platform: string) => {
    setDisconnectPlatform(platform);
  };

  const handleDisconnect = async (platform: string) => {
    try {
      if (platform === 'gmail') await bridgesApi.disconnectGmail();
      else if (platform === 'outlook') await bridgesApi.disconnectOutlook();
      else if (platform === 'erpnext') await bridgesApi.disconnectERPNext();
      else if (platform === 'telegram') await bridgesApi.disconnectTelegram();
      else if (platform === 'instagram') await bridgesApi.disconnectInstagram();
      else if (platform === 'linkedin') {
        await bridgesApi.disconnectLinkedIn();
      }
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

  const confirmDisconnect = async () => {
    if (disconnectPlatform) {
      await handleDisconnect(disconnectPlatform);
      setDisconnectPlatform(null);
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

  const connectLinkedInNow = async () => {
    if (!liUsername.trim() || !liPassword.trim()) {
      toast.error('Enter your LinkedIn username and password');
      return;
    }
    setIsLoading(true);
    try {
      const response = await bridgesApi.connectLinkedIn(
        liUsername.trim(), 
        liPassword.trim(), 
        requiresLiMfa ? liVerificationCode : undefined
      );

      if (response.status === 'requires_mfa') {
        setRequiresLiMfa(true);
        if (response.challenge_url) {
          setLiChallengeUrl(response.challenge_url);
        }
        toast.info(response.message || "Verification required. A code has been sent to your email.");
        return;
      }

      toast.success('LinkedIn account connected! Syncing chats...');
      setRequiresLiMfa(false);
      setLiVerificationCode('');
      handleCloseModal();
      
      // Auto sync after connection
      await syncLinkedInNow();
      await fetchStatus();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setIsLoading(false);
    }
  };

  const syncLinkedInNow = async () => {
    setIsLoading(true);
    try {
      const r = await bridgesApi.syncLinkedIn();
      toast.success(`LinkedIn DMs synced (${r.messages_new ?? 0} new messages).`);
      await fetchStatus();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageShell title="Connections" className="pb-20">
      <input
        ref={linkedinFileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        aria-hidden
        onChange={handleLinkedInFileChange}
      />
      <main className="w-full min-w-0 pb-12 pt-0">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 rounded-2xl border border-border/60 bg-muted/15 p-4 text-sm leading-relaxed text-muted-foreground sm:p-5"
        >
          Connect your messaging platforms so Knudge can sync conversations and draft personalized messages.
        </motion.div>

        <div className="space-y-3">
          {connections.map((connection, index) => (
            <motion.div key={connection.platform} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.1 }}>
              <ConnectionCard
                connection={connection}
                onConnect={() => handleConnect(connection.platform)}
                onDisconnect={() => requestDisconnect(connection.platform)}
                onSync={() => handleSyncContacts(connection.platform)}
                isSyncing={syncingPlatform === connection.platform}
              />
            </motion.div>
          ))}
        </div>
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

              {connectingPlatform === 'linkedin' && (
                <div className="flex flex-col space-y-5 mb-6 text-sm">
                  <div className="rounded-2xl border border-border/60 bg-muted/10 p-3 space-y-2">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-2">
                       <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                       Native Sync Connection
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Connect your account directly using a secure browser bridge. This enables real-time message synchronization.
                    </p>
                  </div>

                  {!requiresLiMfa ? (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground ml-1 uppercase tracking-wider">LinkedIn Username</label>
                        <input
                          type="text"
                          placeholder="Email or Phone"
                          value={liUsername}
                          onChange={(e) => setLiUsername(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl bg-muted/30 border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all text-foreground text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-medium text-muted-foreground ml-1 uppercase tracking-wider">LinkedIn Password</label>
                        <input
                          type="password"
                          placeholder="••••••••"
                          value={liPassword}
                          onChange={(e) => setLiPassword(e.target.value)}
                          className="w-full h-11 px-4 rounded-xl bg-muted/30 border border-border focus:border-primary/50 focus:ring-2 focus:ring-primary/10 transition-all text-foreground text-sm"
                        />
                      </div>
                    </div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-4"
                    >
                      <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
                        <p className="text-primary text-sm font-semibold mb-1 flex items-center gap-2">
                          <QrCode className="h-4 w-4" />
                          Security Verification
                        </p>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          LinkedIn has sent a 6-digit verification code to your email. Please enter it below to authorize this session.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[11px] font-medium text-muted-foreground text-center block uppercase tracking-wider">Verification PIN</label>
                        <input
                          type="text"
                          placeholder="000000"
                          value={liVerificationCode}
                          onChange={(e) => setLiVerificationCode(e.target.value)}
                          className="w-full h-14 px-4 rounded-xl bg-muted/40 border-2 border-primary/20 text-foreground text-xl text-center font-mono tracking-[0.5em] focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all"
                          maxLength={6}
                        />
                      </div>
                    </motion.div>
                  )}

                  <div className="space-y-3 pt-2">
                    <button
                      type="button"
                      onClick={() => void connectLinkedInNow()}
                      disabled={isLoading}
                      className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm shadow-lg shadow-primary/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {requiresLiMfa ? 'Verifying...' : 'Initializing Bridge...'}
                        </>
                      ) : requiresLiMfa ? (
                        'Verify & Complete Setup'
                      ) : (
                        'Securely Connect LinkedIn'
                      )}
                    </button>

                    <div className="flex flex-col items-center gap-3 py-2">
                      <div className="flex items-center gap-2 w-full">
                        <div className="h-[1px] bg-border/50 flex-1" />
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-bold whitespace-nowrap">or use offline import</span>
                        <div className="h-[1px] bg-border/50 flex-1" />
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => linkedinFileRef.current?.click()}
                        disabled={isLoading}
                        className="text-xs font-medium text-primary hover:underline transition-all"
                      >
                         Choose Connections.csv
                      </button>
                    </div>

                    <div className="rounded-xl border border-border/50 bg-muted/5 p-3">
                      <p className="text-[10px] text-muted-foreground leading-relaxed text-center">
                        <span className="text-foreground font-semibold">Privacy Policy:</span> Knudge uses a self-hosted browser bridge. Your credentials are used once for authentication and are never shared with third parties.
                      </p>
                    </div>

                    {requiresLiMfa && (
                      <button
                        type="button"
                        onClick={() => setRequiresLiMfa(false)}
                        className="text-xs text-muted-foreground hover:text-foreground transition-all mx-auto w-full text-center"
                      >
                        Back to Login
                      </button>
                    )}
                  </div>
                </div>
              )}

              {connectingPlatform !== 'linkedin' && (
              <div className="flex flex-col items-center justify-center mb-6">
                {(isLoading && !pairingCode && !qrCodeData && !showPhoneInput) ? (
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Initializing secure connection...</p>
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
                ) : qrCodeData && (whatsappLifecycleState || 'CONNECTING') === 'CONNECTING' ? (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-inner border-2 border-dashed border-border relative">
                      <QRCodeSVG value={qrCodeData} size={256} level={"L"} includeMargin={false} className="w-64 h-64" />
                    </div>
                    <div className="flex gap-4">
                      <button onClick={() => handleConnect(connectingPlatform!)} className="text-xs text-muted-foreground underline hover:text-primary transition-colors">Refresh Code</button>
                      <button onClick={() => { setShowPhoneInput(true); setQrCodeData(null); }} className="text-xs text-primary underline hover:text-primary/80 transition-colors">Link with Phone Number</button>
                    </div>
                  </div>
                ) : whatsappLifecycleState === 'SCANNED' ? (
                  <div className="flex flex-col items-center space-y-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground text-center">
                      QR scanned. Finalizing connection…
                    </p>
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

              {!showPhoneInput && !pairingCode && connectingPlatform !== 'gmail' && connectingPlatform !== 'outlook' && connectingPlatform !== 'erpnext' && connectingPlatform !== 'instagram' && connectingPlatform !== 'linkedin' && (
                <p className="text-sm text-muted-foreground text-center mb-6">Scan this QR code with {platformNames[connectingPlatform as keyof typeof platformNames]} on your phone. The connection will complete automatically.</p>
              )}

              <button onClick={handleCloseModal} className="w-full py-3 rounded-xl bg-muted text-muted-foreground font-medium flex items-center justify-center gap-2 mt-4">Cancel</button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disconnect Confirmation Dialog */}
      <AlertDialog open={!!disconnectPlatform} onOpenChange={(open) => { if (!open) setDisconnectPlatform(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {disconnectPlatform ? platformNames[disconnectPlatform as keyof typeof platformNames] : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect your {disconnectPlatform ? platformNames[disconnectPlatform as keyof typeof platformNames] : ''} account from Knudge. Your synced data will be removed and you'll need to reconnect to access it again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}