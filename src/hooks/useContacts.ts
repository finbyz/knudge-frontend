import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { API_BASE_URL } from '@/lib/api-client';

const CACHE_TIME = 10 * 60 * 1000;
const STALE_TIME = 2 * 60 * 1000;

interface Contact {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  photo_url?: string;
  provider?: string;
  created_at?: string;
}

interface ContactsResponse {
  contacts: Contact[];
  has_more: boolean;
  next_page?: number;
  total: number;
}

// Get all contacts with pagination
export function useContacts(circleId?: string) {
  const { accessToken } = useAuthStore();

  return useInfiniteQuery<ContactsResponse, Error, { pages: ContactsResponse[]; pageParams: number[] }, (string | undefined)[], number>({
    queryKey: ['contacts', circleId],
    queryFn: async ({ pageParam = 1 }) => {
      const url = circleId
        ? `${API_BASE_URL}/contacts/?circle_id=${circleId}&page=${pageParam}&limit=50`
        : `${API_BASE_URL}/contacts/?page=${pageParam}&limit=50`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch contacts');
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage.has_more) return undefined;
      return lastPage.next_page ?? undefined;
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!accessToken,
  });
}

// Get single contact
export function useContact(contactId: string | null) {
  const { accessToken } = useAuthStore();

  return useQuery({
    queryKey: ['contact', contactId],
    queryFn: async () => {
      if (!contactId) return null;
      const response = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch contact');
      return response.json();
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!accessToken && !!contactId,
  });
}

// Get unified contact info (includes all platforms)
export function useUnifiedContact(contactId: string | null) {
  const { accessToken } = useAuthStore();

  return useQuery({
    queryKey: ['contact', contactId, 'unified'],
    queryFn: async () => {
      if (!contactId) return null;
      const response = await fetch(`${API_BASE_URL}/contacts/${contactId}/unified`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch unified contact');
      return response.json();
    },
    staleTime: STALE_TIME,
    gcTime: CACHE_TIME,
    enabled: !!accessToken && !!contactId,
  });
}

// Get conversation summary for a contact
export function useContactConversationSummary(contactId: string | null) {
  const { accessToken } = useAuthStore();

  return useQuery({
    queryKey: ['contact', contactId, 'conversation-summary'],
    queryFn: async () => {
      if (!contactId) return null;
      const response = await fetch(`${API_BASE_URL}/contacts/${contactId}/conversation-summary`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Failed to fetch conversation summary');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - summaries don't change often
    gcTime: CACHE_TIME,
    enabled: !!accessToken && !!contactId,
  });
}

// Create contact mutation
export function useCreateContact() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactData: Partial<Contact>) => {
      const response = await fetch(`${API_BASE_URL}/contacts/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(contactData),
      });
      if (!response.ok) throw new Error('Failed to create contact');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

// Update contact mutation
export function useUpdateContact() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Contact> }) => {
      const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update contact');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['contact', variables.id] });
    },
  });
}

// Delete contact mutation
export function useDeleteContact() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`${API_BASE_URL}/contacts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error('Failed to delete contact');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}

// Search contacts
export function useSearchContacts(query: string) {
  const { accessToken } = useAuthStore();

  return useQuery({
    queryKey: ['contacts', 'search', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const response = await fetch(
        `${API_BASE_URL}/contacts/search?q=${encodeURIComponent(query)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) throw new Error('Failed to search contacts');
      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds for search
    gcTime: 2 * 60 * 1000,
    enabled: !!accessToken && query.length >= 2,
  });
}

// Prefetch contact for faster navigation
export function usePrefetchContact() {
  const { accessToken } = useAuthStore();
  const queryClient = useQueryClient();

  return (contactId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['contact', contactId],
      queryFn: async () => {
        const response = await fetch(`${API_BASE_URL}/contacts/${contactId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        return response.json();
      },
      staleTime: STALE_TIME,
    });
  };
}
