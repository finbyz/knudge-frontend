import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ActivityItem } from '@/components/ActivityItem';
import { Activity } from '@/types';

export default function Activities() {
  const [activities] = useState<Activity[]>([]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center px-4 h-16">
          <Link to="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ChevronLeft className="h-5 w-5" />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <span className="flex-1 text-center font-semibold text-foreground">All Activities</span>
          <div className="w-16" />
        </div>
      </header>

      <main className="px-4 py-4">
        {activities.length > 0 ? (
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
                className="px-4"
              >
                <ActivityItem activity={activity} />
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