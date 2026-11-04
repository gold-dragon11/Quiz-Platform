import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nmtCalendarApi } from '@/features/nmt-calendar/api/nmt-calendar.api';
import { countdownText } from '@/features/nmt-calendar/lib/countdown';

export const NMT_CALENDAR_KEYS = {
  public: ['calendar', 'nmt'] as const,
  admin: ['admin', 'calendar', 'nmt'] as const,
};

const MINUTE = 60 * 1000;

export interface NmtCountdown {
  /** «143 дні 6 годин». */
  text: string;
  startDate: string;
  sourceUrl: string;
}

/**
 * The countdown to the NMT main session (decision 49), refreshed every minute;
 * null when no date has been entered, while it loads, if it fails, and from
 * the moment the session begins. Every caller renders nothing for null, so a
 * missing date leaves no trace on any page.
 */
export function useNmtCountdown(): NmtCountdown | null {
  const { data } = useQuery({
    queryKey: NMT_CALENDAR_KEYS.public,
    queryFn: () => nmtCalendarApi.getPublic(),
    // The date changes once a year; an hour of cache costs nothing.
    staleTime: 60 * MINUTE,
    retry: false,
  });
  const [now, setNow] = useState(() => Date.now());
  const session = data?.mainSession ?? null;

  useEffect(() => {
    if (!session) {
      return;
    }
    const timer = window.setInterval(() => setNow(Date.now()), MINUTE);
    return () => window.clearInterval(timer);
  }, [session]);

  if (!session) {
    return null;
  }
  const text = countdownText(session.startsAt, now);
  return text ? { text, startDate: session.startDate, sourceUrl: session.sourceUrl } : null;
}

export function useAdminNmtCalendar() {
  return useQuery({
    queryKey: NMT_CALENDAR_KEYS.admin,
    queryFn: () => nmtCalendarApi.getAdmin(),
  });
}

/** Save or clear; either way every countdown refetches. */
export function useNmtCalendarMutations() {
  const queryClient = useQueryClient();
  const refresh = async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: NMT_CALENDAR_KEYS.admin }),
      queryClient.invalidateQueries({ queryKey: NMT_CALENDAR_KEYS.public }),
    ]);
  };
  return {
    save: useMutation({ mutationFn: nmtCalendarApi.save, onSuccess: refresh }),
    clear: useMutation({ mutationFn: nmtCalendarApi.clear, onSuccess: refresh }),
  };
}
