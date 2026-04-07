import { useRef, useCallback, memo } from 'react';
import { List } from 'react-window';
import type { ListImperativeAPI, RowComponentProps } from 'react-window';
import { motion } from 'framer-motion';
import { Avatar } from '@/components/Avatar';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  text: string;
  timestamp: string;
  sortDate?: Date;
  direction: 'INCOMING' | 'OUTGOING';
  sender_name?: string;
  sender_avatar?: string;
  media_type?: string;
  media_url?: string;
}

interface RowData {
  messages: ChatMessage[];
  currentUserName: string;
  currentUserAvatar?: string;
}

// Memoized message row component
type MessageRowProps = RowComponentProps<{ data: RowData }>;

const MessageRow = memo(function MessageRow({
  index,
  style,
  data,
}: MessageRowProps) {
  const message = data.messages[index];
  const isIncoming = message.direction === 'INCOMING';

  return (
    <div
      style={style}
      className={cn(
        'flex w-full px-4 py-2',
        isIncoming ? 'justify-start' : 'justify-end'
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn(
          'flex max-w-[75%] gap-2',
          isIncoming ? 'flex-row' : 'flex-row-reverse'
        )}
      >
        {/* Avatar */}
        <Avatar
          initials={isIncoming
            ? (message.sender_name?.[0] || '?').toUpperCase()
            : (data.currentUserName?.[0] || 'Y').toUpperCase()
          }
          src={isIncoming ? message.sender_avatar : data.currentUserAvatar}
          size="sm"
          className="flex-shrink-0 mt-1"
        />

        {/* Message bubble */}
        <div
          className={cn(
            'rounded-2xl px-4 py-2.5 text-sm',
            isIncoming
              ? 'bg-muted text-foreground rounded-tl-sm'
              : 'bg-primary text-primary-foreground rounded-tr-sm'
          )}
        >
          {/* Sender name for incoming messages in groups */}
          {isIncoming && message.sender_name && (
            <p className="text-xs font-medium text-muted-foreground mb-1">
              {message.sender_name}
            </p>
          )}

          {/* Message text */}
          {message.text && (
            <p className="whitespace-pre-wrap break-words">{message.text}</p>
          )}

          {/* Media content */}
          {message.media_url && (
            <div className="mt-1">
              {message.media_type?.startsWith('image') ? (
                <img
                  src={message.media_url}
                  alt="Media"
                  className="rounded-lg max-w-full max-h-64 object-cover"
                  loading="lazy"
                />
              ) : message.media_type?.startsWith('audio') ? (
                <audio controls className="max-w-full">
                  <source src={message.media_url} type={message.media_type} />
                </audio>
              ) : message.media_type?.startsWith('video') ? (
                <video controls className="rounded-lg max-w-full max-h-64">
                  <source src={message.media_url} type={message.media_type} />
                </video>
              ) : (
                <a
                  href={message.media_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm underline"
                >
                  📎 Attachment
                </a>
              )}
            </div>
          )}

          {/* Timestamp */}
          <p
            className={cn(
              'text-[10px] mt-1',
              isIncoming ? 'text-muted-foreground' : 'text-primary-foreground/70'
            )}
          >
            {message.timestamp}
          </p>
        </div>
      </motion.div>
    </div>
  );
});

interface VirtualizedChatListProps {
  messages: ChatMessage[];
  currentUserName: string;
  currentUserAvatar?: string;
  onScroll?: (scrollDirection: 'up' | 'down', scrollTop: number) => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const ITEM_HEIGHT = 72; // Base height for messages
const OVERSCAN = 10;

export function VirtualizedChatList({
  messages,
  currentUserName,
  currentUserAvatar,
  onEndReached,
  hasMore = false,
  isLoading = false,
}: VirtualizedChatListProps) {
  const listRef = useRef<ListImperativeAPI>(null);

  const itemData: RowData = {
    messages,
    currentUserName,
    currentUserAvatar,
  };

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!onEndReached || !hasMore || isLoading) return;
    if (event.currentTarget.scrollTop < 100) {
      onEndReached();
    }
  }, [onEndReached, hasMore, isLoading]);

  // Calculate list height based on viewport minus header/footer
  const listHeight = typeof window !== 'undefined'
    ? window.innerHeight - 180 // Adjust for header and input
    : 600;

  return (
    <div className="flex-1 overflow-hidden">
      <List
        listRef={listRef}
        style={{ height: listHeight }}
        rowCount={messages.length}
        rowHeight={ITEM_HEIGHT}
        rowProps={{ data: itemData }}
        rowComponent={MessageRow}
        onScroll={handleScroll}
        overscanCount={OVERSCAN}
        className="scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent"
      />

      {/* Loading indicator at top */}
      {isLoading && (
        <div className="p-4 text-center absolute top-0 left-0 right-0 bg-background/80">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
      )}
    </div>
  );
}

export default VirtualizedChatList;
