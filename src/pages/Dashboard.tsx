import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Bell, Layers, MessageSquare, Users, Wifi, Loader2, Clock, Mail } from 'lucide-react';
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
import { API_BASE_URL } from '@/lib/api-client';
import { useAuthStore } from '@/stores/authStore';

interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string | null;
  direction: string | null;
}

export default function Dashboard() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [deckCount, setDeckCount] = useState(0);
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [status, deckItems, activitiesData] = await Promise.all([
        bridgesApi.getStatus(),
        deckApi.getDeck(),
        fetch(`${API_BASE_URL}/activity/`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        }).then(r => r.json())
      ]);

      // Map BridgeStatus to Connection objects for UI
      const mappedConnections: Connection[] = (Object.keys(status) as Array<keyof BridgeStatus>).map(key => ({
        platform: key,
        status: status[key].connected ? 'connected' : 'disconnected',
        contactCount: status[key].contact_count,
        lastSync: null
      }));
      setConnections(mappedConnections);
      setDeckCount(deckItems.length);
      setActivities(activitiesData.activities || []);
    } catch (error) {
      console.error("Failed to load dashboard:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const sortedConnections = [...connections].sort((a, b) => {
    if (a.status === 'connected' && b.status !== 'connected') return -1;
    if (a.status !== 'connected' && b.status === 'connected') return 1;
    return 0;
  });

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'whatsapp': return <MessageSquare className="h-4 w-4" />;
      case 'email': return <Mail className="h-4 w-4" />;
      case 'contact': return <Users className="h-4 w-4" />;
      case 'deck': return <Layers className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'whatsapp': return 'bg-green-100 text-green-600';
      case 'email': return 'bg-blue-100 text-blue-600';
      case 'contact': return 'bg-purple-100 text-purple-600';
      case 'deck': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
  };

  return (
    <div className="h-full bg-transparent overflow-y-auto no-scrollbar pb-24">
      <TopBar title="Overview" />

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto px-6 py-8 space-y-10"
      >
        {/* Hero Section / Stats */}
        <motion.section variants={itemVariants}>
          <div className="flex flex-col md:flex-row items-end justify-between mb-6 gap-4">
            <div>
              <h1 className="text-3xl font-black tracking-tight text-foreground">Welcome back</h1>
              <p className="text-muted-foreground font-medium mt-1">Here's what needs your attention today.</p>
            </div>
            <div className="flex gap-2">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-[10px] font-bold text-success uppercase tracking-widest">System Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

            {/* Spotlight Card - The refactored View Deck CTA */}
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="sm:col-span-2 relative group overflow-hidden rounded-3xl"
            >
              <Link to="/deck" className="block h-full">
                <div className="h-full w-full p-6 gradient-primary relative z-10 flex flex-col justify-between shadow-glow group-hover:shadow-elevated transition-all duration-300">
                  <div className="flex justify-between items-start">
                    <div className="h-12 w-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                      <Layers className="h-6 w-6 text-white" />
                    </div>
                    <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">{deckCount} items</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Review Your Deck</h3>
                    <p className="text-white/80 text-sm mt-1 font-medium">Smart outreach suggestions generated for you.</p>
                  </div>
                </div>
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 -mr-16 -mt-16 h-64 w-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-500" />
              </Link>
            </motion.div>
          </div>
        </motion.section>

        {/* Action Row */}
        <motion.section variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Recent Activity
              </h2>
              <Link to="/activities" className="text-xs font-bold text-primary uppercase tracking-widest hover:underline">View all</Link>
            </div>

            {activities.length > 0 ? (
              <div className="glass-card rounded-3xl overflow-hidden divide-y divide-border/50">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="px-5 py-4 flex items-center gap-4 hover:bg-primary/5 transition-colors group">
                    <div className={cn(
                      "h-10 w-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:rotate-6",
                      getActivityColor(activity.type)
                    )}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground font-medium truncate">{activity.description}</p>
                    </div>
                    <span className="text-[10px] font-extrabold text-muted-foreground/60 uppercase">
                      {activity.timestamp
                        ? new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : ''
                      }
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card rounded-3xl p-10 text-center flex flex-col items-center">
                <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                  <Clock className="h-8 w-8 text-muted-foreground opacity-20" />
                </div>
                <p className="text-muted-foreground font-semibold">No recent activity</p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-foreground">Channels</h2>
                <Link to="/connections" className="text-xs font-bold text-primary uppercase tracking-widest hover:underline">Manage</Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {sortedConnections.slice(0, 4).map((connection) => (
                  <div
                    key={connection.platform}
                    className={cn(
                      "flex flex-col items-center gap-3 p-4 rounded-3xl transition-all border group",
                      connection.status === 'connected'
                        ? "glass-card border-transparent animate-pulse-glow"
                        : "bg-muted/10 border-dashed border-border opacity-50 grayscale hover:grayscale-0 hover:opacity-100"
                    )}
                  >
                    <PlatformBadge platform={connection.platform} size="md" status={connection.status} />
                    <div className="text-center">
                      <p className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground">
                        {connection.platform}
                      </p>
                      <p className="text-[9px] font-bold text-success uppercase">
                        {connection.status === 'connected' ? `${connection.contactCount} synced` : 'Offline'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>
      </motion.main>
    </div>
  );
}