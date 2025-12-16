import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Plus, Radar } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSourcesStore, Source } from '@/stores/sourcesStore';
import { SourceGroup } from '@/components/sources/SourceGroup';
import { IntentConfigModal } from '@/components/sources/IntentConfigModal';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
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

export default function MySources() {
  const navigate = useNavigate();
  const { 
    sources, 
    expandedGroups, 
    toggleGroup, 
    toggleSourceActive, 
    updateSource,
    deleteSource 
  } = useSourcesStore();
  
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [deletingSourceId, setDeletingSourceId] = useState<string | null>(null);

  // Group sources
  const groupedSources = useMemo(() => ({
    priority: sources.filter(s => s.group === 'priority'),
    inspiration: sources.filter(s => s.group === 'inspiration'),
    communities: sources.filter(s => s.group === 'communities'),
  }), [sources]);

  const isEmpty = sources.length === 0;

  const handleToggleSource = (id: string) => {
    toggleSourceActive(id);
    const source = sources.find(s => s.id === id);
    if (source) {
      toast({
        title: source.isActive ? 'Source muted' : 'Source unmuted',
        description: `${source.name} is now ${source.isActive ? 'muted' : 'active'}`,
      });
    }
  };

  const handleEditSource = (source: Source) => {
    setEditingSource(source);
  };

  const handleSaveEdit = (config: {
    intent: Source['intent'];
    options: Source['options'];
  }) => {
    if (editingSource) {
      updateSource(editingSource.id, {
        intent: config.intent,
        options: config.options,
      });
      toast({
        title: 'Source updated',
        description: `${editingSource.name} settings have been updated`,
      });
      setEditingSource(null);
    }
  };

  const handleDeleteConfirm = () => {
    if (deletingSourceId) {
      const source = sources.find(s => s.id === deletingSourceId);
      deleteSource(deletingSourceId);
      toast({
        title: 'Source removed',
        description: source ? `${source.name} has been removed` : 'Source removed',
      });
      setDeletingSourceId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24 lg:pb-8 overflow-x-hidden">
      {/* Header - Responsive */}
      <header className="sticky top-0 z-40 bg-card border-b border-border shadow-sm">
        <div className="flex items-center justify-between px-4 md:px-6 lg:px-8 h-16 max-w-6xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <Link
              to="/feed"
              className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-muted-foreground" />
            </Link>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-foreground">My Sources</h1>
              <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">
                People and channels you're monitoring
              </p>
            </div>
          </div>
          
          {/* Desktop: Button in header */}
          <Button
            onClick={() => navigate('/feed/sources/add')}
            className="hidden sm:flex h-10 px-4 rounded-full gradient-primary text-primary-foreground gap-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Source</span>
          </Button>
        </div>
      </header>

      {/* Content - Responsive container */}
      <main className="w-full max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-6">
        {isEmpty ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center px-4 py-20 text-center min-h-[400px]"
          >
            <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-6">
              <Radar className="h-10 w-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">No Sources Yet</h2>
            <p className="text-muted-foreground mb-8 max-w-sm">
              Start monitoring people, channels, and news sources to power your AI assistant.
            </p>
            <Button
              onClick={() => navigate('/feed/sources/add')}
              size="lg"
              className="h-14 px-8 rounded-full gradient-primary text-primary-foreground text-lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add Your First Source
            </Button>
          </motion.div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {/* Source Groups */}
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <SourceGroup
                title="Priority Accounts"
                subtitle="Key Leads/Competitors"
                group="priority"
                sources={groupedSources.priority}
                isExpanded={expandedGroups.priority}
                onToggleExpand={() => toggleGroup('priority')}
                onToggleSource={handleToggleSource}
                onEditSource={handleEditSource}
                onDeleteSource={setDeletingSourceId}
              />
            </div>
            
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <SourceGroup
                title="Content Inspiration"
                subtitle="News/Influencers"
                group="inspiration"
                sources={groupedSources.inspiration}
                isExpanded={expandedGroups.inspiration}
                onToggleExpand={() => toggleGroup('inspiration')}
                onToggleSource={handleToggleSource}
                onEditSource={handleEditSource}
                onDeleteSource={setDeletingSourceId}
              />
            </div>
            
            <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
              <SourceGroup
                title="Communities"
                subtitle="WhatsApp Groups/Telegram Channels"
                group="communities"
                sources={groupedSources.communities}
                isExpanded={expandedGroups.communities}
                onToggleExpand={() => toggleGroup('communities')}
                onToggleSource={handleToggleSource}
                onEditSource={handleEditSource}
                onDeleteSource={setDeletingSourceId}
              />
            </div>
          </div>
        )}
      </main>

      {/* Mobile FAB - Only visible on small screens */}
      <Button
        onClick={() => navigate('/feed/sources/add')}
        size="icon"
        className="sm:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full gradient-primary text-primary-foreground shadow-lg"
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* Edit Intent Modal */}
      <IntentConfigModal
        isOpen={!!editingSource}
        onClose={() => setEditingSource(null)}
        onSave={handleSaveEdit}
        source={null}
        editingSource={editingSource}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingSourceId} onOpenChange={() => setDeletingSourceId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Source?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove this source from your monitoring list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
