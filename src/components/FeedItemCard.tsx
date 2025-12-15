import { useState } from 'react';
import { Youtube, Rss, Linkedin, Sparkles, RefreshCw, Send, X, Calendar } from 'lucide-react';
import { FeedItem } from '@/types';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';

interface FeedItemCardProps {
  item: FeedItem;
  onDraft: () => void;
  onDismiss: () => void;
}

const typeConfig = {
  youtube: {
    icon: Youtube,
    bgClass: 'bg-red-500/10',
    iconClass: 'text-red-500',
    cardBg: 'bg-gradient-to-br from-red-50 to-card dark:from-red-950/20',
    borderClass: 'border-red-200/50 dark:border-red-800/30',
  },
  rss: {
    icon: Rss,
    bgClass: 'bg-orange-500/10',
    iconClass: 'text-orange-500',
    cardBg: 'bg-gradient-to-br from-orange-50 to-card dark:from-orange-950/20',
    borderClass: 'border-orange-200/50 dark:border-orange-800/30',
  },
  linkedin: {
    icon: Linkedin,
    bgClass: 'bg-blue-500/10',
    iconClass: 'text-blue-600',
    cardBg: 'bg-gradient-to-br from-blue-50 to-card dark:from-blue-950/20',
    borderClass: 'border-blue-200/50 dark:border-blue-800/30',
  },
};

export function FeedItemCard({ item, onDraft, onDismiss }: FeedItemCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [draftComment, setDraftComment] = useState('');
  const [regenerateInstructions, setRegenerateInstructions] = useState('');
  const [showRegenerateInput, setShowRegenerateInput] = useState(false);

  const config = typeConfig[item.type];
  const Icon = config.icon;

  const handleDraftClick = () => {
    // Generate initial draft
    const drafts = [
      `Great insights on this! I particularly found the perspective on ${item.title.split(' ').slice(0, 3).join(' ')} very interesting.`,
      `Thanks for sharing this. The points about ${item.title.split(' ').slice(-3).join(' ')} really resonated with me.`,
      `Excellent content! This aligns well with what I've been seeing in the industry lately.`,
    ];
    setDraftComment(drafts[Math.floor(Math.random() * drafts.length)]);
    setIsExpanded(true);
  };

  const handleRegenerate = () => {
    const variations = [
      `Fascinating take on this topic! ${regenerateInstructions ? `Specifically regarding ${regenerateInstructions}, ` : ''}I'd love to hear more about your thoughts on the future implications.`,
      `Really valuable content here. ${regenerateInstructions ? `On the topic of ${regenerateInstructions}, ` : ''}This is exactly the kind of discussion our industry needs.`,
      `Insightful perspective! ${regenerateInstructions ? `Your point about ${regenerateInstructions} ` : ''}This deserves more attention.`,
    ];
    setDraftComment(variations[Math.floor(Math.random() * variations.length)]);
    setShowRegenerateInput(false);
    setRegenerateInstructions('');
  };

  const handlePost = () => {
    onDraft();
    setIsExpanded(false);
    setDraftComment('');
  };

  const handleCancel = () => {
    setIsExpanded(false);
    setDraftComment('');
    setShowRegenerateInput(false);
    setRegenerateInstructions('');
  };

  return (
    <div className={cn(
      'rounded-2xl shadow-card border overflow-hidden transition-all',
      isExpanded ? config.cardBg : 'bg-card',
      isExpanded ? config.borderClass : 'border-border'
    )}>
      {item.thumbnail && (
        <div className="aspect-video bg-muted">
          <img
            src={item.thumbnail}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', config.bgClass)}>
            <Icon className={cn('h-4 w-4', config.iconClass)} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground line-clamp-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {item.source} • {item.timestamp}
            </p>
          </div>
        </div>

        {!isExpanded ? (
          <>
            <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">AI Suggests</span>
              </div>
              <p className="text-sm text-foreground">{item.suggestion}</p>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button
                onClick={handleDraftClick}
                className="flex-1 gradient-primary text-primary-foreground border-0"
              >
                Draft Comment
              </Button>
              <Button
                variant="outline"
                onClick={onDismiss}
              >
                Dismiss
              </Button>
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-3">
            {/* Draft Comment Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Draft Comment
                </span>
              </div>
              <button onClick={handleCancel} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Editable Draft */}
            <textarea
              value={draftComment}
              onChange={(e) => setDraftComment(e.target.value)}
              className="w-full min-h-[100px] p-3 rounded-xl bg-card/80 border border-border text-foreground text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
              placeholder="Your comment..."
            />

            {/* Regenerate section */}
            <div className="space-y-2">
              {showRegenerateInput && (
                <input
                  type="text"
                  placeholder="Add instructions for regeneration (optional)..."
                  value={regenerateInstructions}
                  onChange={(e) => setRegenerateInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-card/80 border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              )}
              <div className="flex gap-2">
                {showRegenerateInput ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowRegenerateInput(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleRegenerate}
                      className="flex-1 gradient-primary text-primary-foreground border-0"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      Regenerate
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowRegenerateInput(true)}
                    className="w-full"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Regenerate with Instructions
                  </Button>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePost}
                className="flex-1 gradient-primary text-primary-foreground border-0"
              >
                <Send className="h-4 w-4 mr-2" />
                Post Comment
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}