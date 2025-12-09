import { Bell, Layers, MessageSquare, Users, Wifi } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { StatsCard } from '@/components/StatsCard';
import { ActivityItem } from '@/components/ActivityItem';
import { PlatformBadge } from '@/components/PlatformBadge';
import { Button } from '@/components/ui/button';
import { mockActivities, mockConnections, mockActionCards } from '@/data/mockData';

export default function Dashboard() {
  const connectedPlatforms = mockConnections.filter((c) => c.status === 'connected');

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-16">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">K</span>
            </div>
            <span className="font-bold text-xl text-foreground">Knudge</span>
          </div>
          <button className="h-10 w-10 rounded-xl bg-muted/50 flex items-center justify-center relative hover:bg-muted transition-colors">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive" />
          </button>
        </div>
      </header>

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
              value={mockActionCards.length}
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
              View Deck ({mockActionCards.length} pending)
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
            <button className="text-sm text-primary font-medium">View all</button>
          </div>
          <div className="bg-card rounded-2xl border border-border divide-y divide-border">
            {mockActivities.slice(0, 5).map((activity) => (
              <div key={activity.id} className="px-4">
                <ActivityItem activity={activity} />
              </div>
            ))}
          </div>
        </motion.section>
      </main>
    </div>
  );
}
