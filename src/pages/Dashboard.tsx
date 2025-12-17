import { useState, useEffect } from 'react';
import { Bell, Layers, MessageSquare, Users, Wifi, Loader2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { StatsCard } from '@/components/StatsCard';
import { ActivityItem } from '@/components/ActivityItem';
import { PlatformBadge } from '@/components/PlatformBadge';
import { Button } from '@/components/ui/button';
import { TopBar } from '@/components/TopBar';
import { NotificationPanel } from '@/components/NotificationPanel';
import { bridgesApi, BridgeStatus } from '@/api/bridges';
import { deckApi } from '@/api/deck';
import { Connection, Activity } from '@/types';
import { toast } from 'sonner';

export default function Dashboard() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [deckCount, setDeckCount] = useState(0);
  const [activities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [status, deckItems] = await Promise.all([
        bridgesApi.getStatus(),
        deckApi.getDeck()
      ]);

      // Map BridgeStatus to Connection objects for UI
      const mappedConnections: Connection[] = [
        { platform: 'whatsapp', status: status.whatsapp ? 'connected' : 'disconnected', lastSync: null },
        { platform: 'signal', status: status.signal ? 'connected' : 'disconnected', lastSync: null },
        { platform: 'linkedin', status: status.linkedin ? 'connected' : 'disconnected', lastSync: null },
      ];
      setConnections(mappedConnections);
      setDeckCount(deckItems.length);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const connectedPlatforms = connections.filter((c) => c.status === 'connected');

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-full bg-background pb-20">
      <TopBar title="Knudge" />

      <main className="px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="grid grid-cols-2 gap-3">
            <StatsCard
              icon={MessageSquare}
              label="Pending Messages"
              value={deckCount}
              variant="primary"
            />
            <StatsCard
              icon={Users}
              label="To Reach Out"
              value={8}
              trend="+3 today"
              variant="warning"
            />
          </div>
        </motion.section>

        {/* Connected Platforms */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Active Connections</h2>
            <Link to="/connections" className="text-sm text-primary font-medium">
              Manage
            </Link>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
            {connectedPlatforms.map((connection) => (
              <div
                key={connection.platform}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/50 shrink-0"
              >
                <PlatformBadge platform={connection.platform} size="sm" />
                <div className="flex items-center gap-1">
                  <Wifi className="h-3 w-3 text-success" />
                  <span className="text-xs font-medium text-muted-foreground">
                    {connection.contactCount}
                  </span>
                </div>
              </div>
            ))}
            {connectedPlatforms.length < 4 && (
              <Link
                to="/connections"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-dashed border-border text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors shrink-0"
              >
                + Add more
              </Link>
            )}
          </div>
        </motion.section>

        {/* CTA Button */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Link to="/deck">
            <Button
              size="lg"
              className="w-full h-14 gradient-primary text-primary-foreground border-0 text-base font-semibold shadow-glow hover:shadow-elevated transition-shadow"
            >
              <Layers className="h-5 w-5 mr-2" />
              View Deck ({deckCount} pending)
            </Button>
          </Link>
        </motion.section>

        {/* Activity Timeline */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-foreground">Recent Activity</h2>
            <Link to="/activities" className="text-sm text-primary font-medium">View all</Link>
          </div>
          {activities.length > 0 ? (
            <div className="bg-card rounded-2xl border border-border divide-y divide-border">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="px-4">
                  <ActivityItem activity={activity} />
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border p-6 text-center">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">No recent activity</p>
            </div>
          )}
        </motion.section>
      </main>
    </div>
  );
}