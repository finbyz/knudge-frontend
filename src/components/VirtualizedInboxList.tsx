import { useRef, useCallback } from 'react';
import { List } from 'react-window';
import type { ListImperativeAPI, RowComponentProps } from 'react-window';
import { motion } from 'framer-motion';
import { Search, MessageCircle, Linkedin, Mail, X, Check, Archive, MailOpen, Loader2, Instagram } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { cn } from '@/lib/utils';
import type { InboxMessage } from '@/stores/inboxStore';

const platformConfig: Record<string, any> = {
  whatsapp: { icon: MessageCircle, bgColor: 'bg-[#25D366]', label: 'WhatsApp' },
  linkedin: { icon: Linkedin, bgColor: 'bg-[#0A66C2]', label: 'LinkedIn' },
  email: { icon: Mail, bgColor: 'bg-destructive', label: 'Email' },
  outlook: { icon: Mail, bgColor: 'bg-[#0078D4]', label: 'Outlook' },
  signal: { icon: MessageCircle, bgColor: 'bg-[#3A76F0]', label: 'Signal' },
  gmail: { icon: Mail, bgColor: 'bg-[#EA4335]', label: 'Gmail' },
  telegram: { icon: MessageCircle, bgColor: 'bg-[#229ED9]', label: 'Telegram' },
  instagram: { icon: Instagram, bgColor: 'bg-[#E1306C]', label: 'Instagram' },
};

const DEFAULT_PLATFORM = { icon: Mail, bgColor: 'bg-muted-foreground', label: 'Message' };

const decodeHTMLEntities = (text: string): string => {
  if (!text) return '';
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&#x27;': "'",
    '&#x2F;': '/',
    '&#32;': ' ',
    '&nbsp;': ' ',
  };
  return text.replace(/&[#\w\d]+;/g, (entity) => entities[entity] || entity);
};

const cleanPreview = (text: string) => {
  if (!text) return '';
  let clean = text.replace(/<[^>]*>/g, ' ');
  clean = clean.replace(/&amp;/g, '&');
  clean = clean.replace(/&lt;/g, '<');
  clean = clean.replace(/&gt;/g, '>');
  clean = clean.replace(/&#39;/g, "'");
  clean = clean.replace(/&nbsp;/g, ' ');
  clean = clean.replace(/&quot;/g, '"');
  clean = clean.replace(/\[image:[^\]]*\]/g, '');
  clean = clean.replace(/\s+/g, ' ').trim();
  return clean;
};

const highlightText = (text: string, query: string): React.ReactNode => {
  if (!query.trim()) return text;
  const decodedText = decodeHTMLEntities(text);
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = decodedText.split(regex);
  return parts.map((part, index) =>
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 text-foreground px-0.5 rounded font-medium">
        {part}
      </mark>
    ) : part
  );
};

interface RowData {
  messages: InboxMessage[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  searchQuery: string;
  swipeState: {
    messageId: string | null;
    offsetX: number;
    isSwiping: boolean;
  };
  removingId: string | null;
  onRowClick: (message: InboxMessage) => void;
  onTouchStart: (e: React.TouchEvent, messageId: string) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onMouseDown: (e: React.MouseEvent, messageId: string) => void;
  onMouseUp: () => void;
  toggleSelection: (messageId: string) => void;
}

// Memoized row component for performance
type MessageRowProps = RowComponentProps<{ data: RowData }>;

function MessageRow({
  index,
  style,
  data,
}: MessageRowProps): JSX.Element | null {
  const message = data.messages[index];
  if (!message) return null;

  const sender = message.sender ?? { name: '', initials: '?', avatar: undefined, phone: undefined };

  const platformKey = (message.platform || 'email').toLowerCase();
  const platform = platformConfig[platformKey] || DEFAULT_PLATFORM;
  const PlatformIcon = platform.icon;
  const isSelected = data.selectedIds.has(message.id);
  const isBeingSwiped = data.swipeState.messageId === message.id;
  const swipeOffset = isBeingSwiped ? data.swipeState.offsetX : 0;
  const isRemoving = data.removingId === message.id;

  return (
    <div style={style} className="relative">
      <motion.div
        initial={false}
        animate={{
          opacity: isRemoving ? 0 : 1,
          x: isRemoving ? -300 : 0,
        }}
        transition={{ duration: 0.2 }}
        className={cn(
          'relative overflow-hidden border-b border-border last:border-b-0'
        )}
      >
        {/* Swipe backgrounds */}
        <div
          className="absolute inset-y-0 right-0 bg-destructive flex items-center justify-end px-6 transition-opacity"
          style={{ opacity: swipeOffset < -20 ? Math.min(1, Math.abs(swipeOffset) / 100) : 0 }}
        >
          <div className="flex items-center gap-2 text-destructive-foreground">
            <Archive className="h-5 w-5" />
            <span className="font-medium">Archive</span>
          </div>
        </div>

        <div
          className="absolute inset-y-0 left-0 bg-primary flex items-center justify-start px-6 transition-opacity"
          style={{ opacity: swipeOffset > 20 ? Math.min(1, swipeOffset / 100) : 0 }}
        >
          <div className="flex items-center gap-2 text-primary-foreground">
            <MailOpen className="h-5 w-5" />
            <span className="font-medium">{message.unread ? 'Read' : 'Unread'}</span>
          </div>
        </div>

        {/* Main row content */}
        <div
          className={cn(
            'flex items-start gap-3 p-4 cursor-pointer transition-all bg-card relative',
            'hover:bg-muted/50',
            isSelected && 'bg-primary/10',
            data.selectionMode && 'select-none'
          )}
          style={{
            transform: `translateX(${swipeOffset}px)`,
            transition: data.swipeState.isSwiping ? 'none' : 'transform 0.2s ease-out'
          }}
          onClick={() => data.onRowClick(message)}
          onTouchStart={(e) => data.onTouchStart(e, message.id)}
          onTouchMove={data.onTouchMove}
          onTouchEnd={data.onTouchEnd}
          onMouseDown={(e) => data.onMouseDown(e, message.id)}
          onMouseUp={data.onMouseUp}
          onMouseLeave={data.onMouseUp}
        >
          {/* Selection checkbox */}
          {data.selectionMode && (
            <div className="flex-shrink-0 self-center">
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  data.toggleSelection(message.id);
                }}
                className={cn(
                  'h-5 w-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer',
                  isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
                )}
              >
                {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
            </div>
          )}

          {/* Avatar with platform icon */}
          <div className="relative flex-shrink-0">
            <Avatar
              initials={sender.initials ?? '?'}
              src={sender.avatar}
              size="lg"
              isGroup={message.platform === 'whatsapp' && message.id.includes('@g.us')}
            />
            <div
              className={cn(
                'absolute -bottom-0.5 -right-0.5 h-5 w-5 rounded-full flex items-center justify-center border-2 border-card',
                platform.bgColor
              )}
            >
              <PlatformIcon className="h-2.5 w-2.5 text-white" />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-1">
              <span
                className={cn(
                  'truncate text-[17px]',
                  message.unread ? 'text-foreground font-semibold' : 'text-foreground font-medium'
                )}
              >
                {highlightText(sender.name ?? '', data.searchQuery)}
              </span>
              <span
                className={cn(
                  'text-[11px] flex-shrink-0 mt-1',
                  message.unread ? 'text-primary font-bold' : 'text-muted-foreground'
                )}
              >
                {message.timestamp}
              </span>
            </div>

            {/* Preview based on platform */}
            {['gmail', 'outlook', 'email'].includes(message.platform) ? (
              <div className="mt-0.5">
                {message.subject && (
                  <p className={cn(
                    "text-[14px] truncate leading-tight",
                    message.unread ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
                  )}>
                    {highlightText(message.subject, data.searchQuery)}
                  </p>
                )}
                <p className="text-[14px] text-muted-foreground line-clamp-1 mt-0 font-normal leading-normal">
                  {highlightText(cleanPreview(message.preview) || 'No preview available', data.searchQuery)}
                </p>
              </div>
            ) : (
              <div className="mt-0.5">
                <p className="text-[14px] line-clamp-2 text-muted-foreground font-normal leading-snug">
                  {highlightText(cleanPreview(message.preview) || 'No messages yet', data.searchQuery)}
                </p>
              </div>
            )}
          </div>

          {/* Unread indicator */}
          <div className="flex flex-col items-end gap-1 flex-shrink-0 self-center">
            {message.unread && (
              message.unreadCount && message.unreadCount > 1 ? (
                <div className="h-5 min-w-5 px-1.5 rounded-full bg-[#25D366] flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">
                    {message.unreadCount}
                  </span>
                </div>
              ) : (
                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
              )
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

interface VirtualizedInboxListProps {
  messages: InboxMessage[];
  selectionMode: boolean;
  selectedIds: Set<string>;
  searchQuery: string;
  swipeState: {
    messageId: string | null;
    offsetX: number;
    isSwiping: boolean;
  };
  removingId: string | null;
  onRowClick: (message: InboxMessage) => void;
  onTouchStart: (e: React.TouchEvent, messageId: string) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  onMouseDown: (e: React.MouseEvent, messageId: string) => void;
  onMouseUp: () => void;
  toggleSelection: (messageId: string) => void;
  onScroll?: (scrollDirection: 'up' | 'down', scrollTop: number) => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const ITEM_HEIGHT = 88; // Height of each message row in pixels
const LIST_HEIGHT_OFFSET = 200; // Space for TopBar and search

export function VirtualizedInboxList({
  messages,
  selectionMode,
  selectedIds,
  searchQuery,
  swipeState,
  removingId,
  onRowClick,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onMouseDown,
  onMouseUp,
  toggleSelection,
  onEndReached,
  hasMore = false,
  isLoading = false,
}: VirtualizedInboxListProps) {
  const listRef = useRef<ListImperativeAPI>(null);
  // Guard against `onRowsRendered` firing repeatedly while a page load is in flight.
  const lastEndReachedLengthRef = useRef<number | null>(null);

  const itemData: RowData = {
    messages,
    selectionMode,
    selectedIds,
    searchQuery,
    swipeState,
    removingId,
    onRowClick,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
    onMouseUp,
    toggleSelection,
  };

  const handleRowsRendered = useCallback(({ stopIndex }: { startIndex: number; stopIndex: number }) => {
    // Trigger pagination when the viewport is close to the end.
    if (
      onEndReached &&
      hasMore &&
      !isLoading &&
      stopIndex >= messages.length - 4 &&
      lastEndReachedLengthRef.current !== messages.length
    ) {
      lastEndReachedLengthRef.current = messages.length;
      onEndReached();
    }
  }, [messages.length, onEndReached, hasMore, isLoading]);

  // Calculate list height based on viewport
  const listHeight = typeof window !== 'undefined'
    ? window.innerHeight - LIST_HEIGHT_OFFSET
    : 600;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <List
        listRef={listRef}
        style={{ height: listHeight }}
        rowCount={messages.length}
        rowHeight={ITEM_HEIGHT}
        rowProps={{ data: itemData }}
        rowComponent={MessageRow}
        onRowsRendered={handleRowsRendered}
        overscanCount={5} // Number of items to render outside visible area
        className="scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent"
      />

      {/* Loading indicator at bottom */}
      {isLoading && (
        <div className="p-4 text-center">
          <Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export default VirtualizedInboxList;
