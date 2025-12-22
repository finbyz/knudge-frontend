import { Check, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';
import { Connection } from '@/types';
import { PlatformBadge } from './PlatformBadge';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface ConnectionCardProps {
  connection: Connection;
  onConnect: () => void;
  onDisconnect: () => void;
  onSync?: () => void;
  isSyncing?: boolean;
}

const platformNames = {
  whatsapp: 'WhatsApp',
  linkedin: 'LinkedIn',
  signal: 'Signal',
  email: 'Email',
  gmail: 'Gmail',
  outlook: 'Outlook',
  erpnext: 'ERPNext'
};

export function ConnectionCard({ connection, onConnect, onDisconnect, onSync, isSyncing = false }: ConnectionCardProps) {
  const isConnected = connection.status === 'connected';
  const isStatusSyncing = connection.status === 'syncing';

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PlatformBadge platform={connection.platform} size="lg" />
          <div>
            <h3 className="font-semibold text-foreground">{platformNames[connection.platform]}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {isConnected && (
                <>
                  <Check className="h-3.5 w-3.5 text-success" />
                  <span className="text-xs text-success font-medium">Connected</span>
                </>
              )}
              {isStatusSyncing && (
                <>
                  <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin" />
                  <span className="text-xs text-primary font-medium">Syncing...</span>
                </>
              )}
              {connection.status === 'disconnected' && (
                <>
                  <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Not connected</span>
                </>
              )}
            </div>
          </div>
        </div>

        <Button
          variant={isConnected ? 'outline' : 'default'}
          size="sm"
          onClick={isConnected ? onDisconnect : onConnect}
          className={cn(
            isConnected
              ? 'border-destructive/50 text-destructive hover:bg-destructive/10'
              : 'gradient-primary text-primary-foreground border-0'
          )}
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </Button>
      </div>

      {(isConnected || isStatusSyncing) && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>{connection.contactCount} contacts</span>
          <div className="flex items-center gap-2">
            {connection.lastSync && <span>Last synced: {connection.lastSync}</span>}
            {onSync && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSync}
                disabled={isSyncing}
                className="h-6 px-2 text-xs"
              >
                {isSyncing ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Sync
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
