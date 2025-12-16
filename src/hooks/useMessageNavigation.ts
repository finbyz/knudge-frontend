import { useState, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Message {
  id: string;
  platform: 'whatsapp' | 'linkedin' | 'email' | 'signal';
}

// Shared inbox messages state - in a real app this would come from a store
const mockInboxMessages: Message[] = [
  { id: '1', platform: 'whatsapp' },
  { id: '2', platform: 'linkedin' },
  { id: '3', platform: 'email' },
  { id: '4', platform: 'signal' },
  { id: '5', platform: 'whatsapp' },
  { id: '6', platform: 'email' },
  { id: '7', platform: 'linkedin' },
];

export function useMessageNavigation(currentMessageId: string, platform: string) {
  const navigate = useNavigate();
  const [messages] = useState<Message[]>(mockInboxMessages);

  const currentIndex = useMemo(() => {
    return messages.findIndex(m => m.id === currentMessageId);
  }, [messages, currentMessageId]);

  const totalMessages = messages.length;

  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < messages.length - 1;

  const navigateToMessage = useCallback((message: Message) => {
    if (message.platform === 'email') {
      navigate(`/inbox/email/${message.id}`, { replace: true });
    } else {
      navigate(`/inbox/chat/${message.id}`, { replace: true });
    }
  }, [navigate]);

  const goToPrevious = useCallback(() => {
    if (hasPrevious) {
      const prevMessage = messages[currentIndex - 1];
      navigateToMessage(prevMessage);
    }
  }, [hasPrevious, messages, currentIndex, navigateToMessage]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      const nextMessage = messages[currentIndex + 1];
      navigateToMessage(nextMessage);
    }
  }, [hasNext, messages, currentIndex, navigateToMessage]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'k') {
        goToPrevious();
      } else if (e.key === 'ArrowRight' || e.key === 'j') {
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToPrevious, goToNext]);

  return {
    currentIndex: currentIndex + 1, // 1-indexed for display
    totalMessages,
    hasPrevious,
    hasNext,
    goToPrevious,
    goToNext,
  };
}
