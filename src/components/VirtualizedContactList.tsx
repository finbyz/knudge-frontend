import { useRef, useCallback, memo } from 'react';
import { List } from 'react-window';
import type { ListImperativeAPI, RowComponentProps } from 'react-window';
import { motion } from 'framer-motion';
import { Mail, Phone, ChevronRight } from 'lucide-react';
import { Avatar } from '@/components/Avatar';
import { cn } from '@/lib/utils';

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  provider?: string;
}

interface RowData {
  contacts: Contact[];
  selectedIds: Set<string>;
  selectionMode: boolean;
  onContactClick: (contact: Contact) => void;
  onToggleSelection: (contactId: string) => void;
  getInitials: (name: string) => string;
}

// Memoized contact row component
type ContactRowProps = RowComponentProps<{ data: RowData }>;

const ContactRow = memo(function ContactRow({
  index,
  style,
  data,
}: ContactRowProps) {
  const contact = data.contacts[index];
  const isSelected = data.selectedIds.has(contact.id);

  return (
    <div
      style={style}
      className="px-4"
    >
      <motion.div
        initial={false}
        animate={{ opacity: 1 }}
        className={cn(
          'flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-colors',
          'border-b border-border last:border-b-0',
          isSelected ? 'bg-primary/10' : 'hover:bg-muted/50'
        )}
        onClick={() => {
          if (data.selectionMode) {
            data.onToggleSelection(contact.id);
          } else {
            data.onContactClick(contact);
          }
        }}
      >
        {/* Selection checkbox */}
        {data.selectionMode && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              data.onToggleSelection(contact.id);
            }}
            className={cn(
              'h-5 w-5 rounded border-2 flex items-center justify-center transition-all cursor-pointer flex-shrink-0',
              isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'
            )}
          >
            {isSelected && (
              <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
        )}

        {/* Avatar */}
        <Avatar
          initials={data.getInitials(contact.name)}
          src={contact.photo_url}
          size="lg"
          className="flex-shrink-0"
        />

        {/* Contact info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate">
            {contact.name}
          </h3>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            {contact.email && (
              <div className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                <span>{contact.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Arrow */}
        {!data.selectionMode && (
          <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
        )}
      </motion.div>
    </div>
  );
});

interface VirtualizedContactListProps {
  contacts: Contact[];
  selectedIds: Set<string>;
  selectionMode: boolean;
  onContactClick: (contact: Contact) => void;
  onToggleSelection: (contactId: string) => void;
  onEndReached?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

const ITEM_HEIGHT = 80; // Height of each contact row
const OVERSCAN = 5;

export function VirtualizedContactList({
  contacts,
  selectedIds,
  selectionMode,
  onContactClick,
  onToggleSelection,
  onEndReached,
  hasMore = false,
  isLoading = false,
}: VirtualizedContactListProps) {
  const listRef = useRef<ListImperativeAPI>(null);

  const getInitials = useCallback((name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }, []);

  const itemData: RowData = {
    contacts,
    selectedIds,
    selectionMode,
    onContactClick,
    onToggleSelection,
    getInitials,
  };

  const handleRowsRendered = useCallback(({ stopIndex }: { startIndex: number; stopIndex: number }) => {
    if (onEndReached && hasMore && !isLoading && stopIndex >= contacts.length - 4) {
      onEndReached();
    }
  }, [contacts.length, onEndReached, hasMore, isLoading]);

  // Calculate list height based on viewport
  const listHeight = typeof window !== 'undefined'
    ? window.innerHeight - 180 // Adjust for header
    : 600;

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden">
      <List
        listRef={listRef}
        style={{ height: listHeight }}
        rowCount={contacts.length}
        rowHeight={ITEM_HEIGHT}
        rowProps={{ data: itemData }}
        rowComponent={ContactRow}
        onRowsRendered={handleRowsRendered}
        overscanCount={OVERSCAN}
        className="scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent"
      />

      {/* Loading indicator at bottom */}
      {isLoading && (
        <div className="p-4 text-center">
          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto" />
        </div>
      )}
    </div>
  );
}

export default VirtualizedContactList;
