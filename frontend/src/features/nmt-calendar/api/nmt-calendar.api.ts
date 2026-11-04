import axios from 'axios';
import { env } from '@/config/env';
import { apiClient } from '@/lib/api-client';

/** GET /calendar/nmt (decision 49): the main session while it is still ahead. */
export interface NmtCountdownView {
  mainSession: {
    /** «2027-05-14». */
    startDate: string;
    /** 00:00 Kyiv on that day, as an instant. */
    startsAt: string;
    sourceUrl: string;
  } | null;
}

/** GET /admin/calendar/nmt: what was entered, past or not. */
export interface NmtCalendarRecord {
  mainSessionStart: string;
  sourceUrl: string;
  updatedAt: string;
}

export const nmtCalendarApi = {
  /**
   * Public, read by the landing page for visitors with no account, so it is a
   * bare Axios call: the shared client would try to refresh a session that
   * does not exist and bounce a visitor to the login form.
   */
  async getPublic(): Promise<NmtCountdownView> {
    const { data } = await axios.get<NmtCountdownView>(`${env.apiUrl}/calendar/nmt`);
    return data;
  },

  async getAdmin(): Promise<NmtCalendarRecord | null> {
    const { data } = await apiClient.get<{ calendar: NmtCalendarRecord | null }>('/admin/calendar/nmt');
    return data.calendar;
  },

  async save(payload: { mainSessionStart: string; sourceUrl: string }): Promise<NmtCalendarRecord> {
    const { data } = await apiClient.put<{ calendar: NmtCalendarRecord }>('/admin/calendar/nmt', payload);
    return data.calendar;
  },

  async clear(): Promise<void> {
    await apiClient.delete('/admin/calendar/nmt');
  },
};
