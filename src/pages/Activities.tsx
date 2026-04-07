import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Clock, MessageSquare, Mail, Users, Layers, Bell } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { API_BASE_URL } from '@/lib/api-client';
import { TopBar } from '@/components/TopBar';
import { useAuthStore } from '@/stores/authStore';

interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string | null;
  direction: string | null;
}

export default function Activities() {
  const [activities, setActivities] = useState<DashboardActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const { accessToken } = useAuthStore();

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/activity/`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const data = await response.json();
      setActivities(data.activities || []);
    } catch (error) {
      console.error('Failed to load activities:', error);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="min-h-screen bg-background pb-20 pt-0">
      <TopBar title="Activities" />

      <main className="max-w-5xl mx-auto px-6 pt-0 pb-12 space-y-8">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : activities.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="bg-card rounded-2xl border border-border divide-y divide-border"
          >
            {activities.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index < 10 ? index * 0.05 : 0 }}
                className="px-4 py-3 flex items-start gap-3"
              >
                {/* Icon */}
                <div className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                  getActivityColor(activity.type)
                )}>
                  {getActivityIcon(activity.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                </div>

                {/* Time */}
                <span className="text-xs text-muted-foreground shrink-0">
                  {activity.timestamp
                    ? new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                </span>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">No Activities Yet</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              Your message history and connection activities will appear here.
            </p>
          </motion.div>
        )}
      </main>
    </div>
  );
}