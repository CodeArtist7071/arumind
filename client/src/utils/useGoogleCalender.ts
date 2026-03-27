// client/src/hooks/useGoogleCalendar.ts

import { useState, useEffect, useCallback } from 'react';
import * as Cal from '../services/googleCalenderService';
import type { GCalEvent } from '../services/googleCalenderService';
import { supabase } from '../utils/supabase';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { fetchUserProfile } from '../slice/userSlice';

export function useGoogleCalendar() {
  const dispatch = useDispatch<AppDispatch>();
  const { user, profile } = useSelector((state: RootState) => state.user);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      try {
        await Cal.initCalendar();
        // If profile says we should be connected, at least show the connected UI
        if (profile?.google_calendar_connected) {
          setConnected(true);
          // Optional: Attempt silent re-auth if token is missing
          // But we'll do that on-demand during API calls to avoid popup blocking
        }
      } catch (e) {
        console.error('Google Calendar init failed:', e);
        setError('Failed to load Google Calendar SDK.');
      }
    };
    init();
  }, [profile?.google_calendar_connected]);

  const connect = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await Cal.requestAccess(true);
      setConnected(true);
      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ google_calendar_connected: true })
          .eq('id', user.id);
        dispatch(fetchUserProfile());
      }
    } catch (e: any) {
      setError(e.message ?? 'Connection failed');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const disconnect = useCallback(async () => {
    Cal.signOut();
    setConnected(false);
    setEvents([]);
    if (user?.id) {
      await supabase
        .from('profiles')
        .update({ google_calendar_connected: false })
        .eq('id', user.id);
      dispatch(fetchUserProfile());
    }
  }, [user, dispatch]);

  const fetchEvents = useCallback(
    async (daysAhead = 30) => {
      // If we think we are connected but don't have a token, try to get one silently
      if (connected && !Cal.isConnected()) {
        try { await Cal.requestAccess(); } catch (e) { console.error(e); }
      }
      
      if (!Cal.isConnected()) return;
      
      setLoading(true);
      try {
        const timeMin = new Date().toISOString();
        const timeMax = new Date(
          Date.now() + daysAhead * 86_400_000
        ).toISOString();
        const items = await Cal.listEvents(timeMin, timeMax);
        setEvents(items);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    },
    [connected]
  );

  const guardConnection = useCallback(async () => {
    if (!Cal.isConnected()) {
      await Cal.requestAccess();
      setConnected(true);
    }
  }, []);

  const addEvent = useCallback(
    async (event: GCalEvent) => {
      await guardConnection();
      setLoading(true);
      try {
        const created = await Cal.createEvent(event);
        setEvents((prev) => [...prev, created]);
        return created;
      } finally {
        setLoading(false);
      }
    },
    [guardConnection]
  );

  const editEvent = useCallback(
    async (id: string, patch: Partial<GCalEvent>) => {
      await guardConnection();
      setLoading(true);
      try {
        const updated = await Cal.updateEvent(id, patch);
        setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
        return updated;
      } finally {
        setLoading(false);
      }
    },
    [guardConnection]
  );

  const removeEvent = useCallback(
    async (id: string) => {
      await guardConnection();
      setLoading(true);
      try {
        await Cal.deleteEvent(id);
        setEvents((prev) => prev.filter((e) => e.id !== id));
      } finally {
        setLoading(false);
      }
    },
    [guardConnection]
  );

  return {
    connected,
    events,
    loading,
    error,
    connect,
    disconnect,
    fetchEvents,
    addEvent,
    editEvent,
    removeEvent,
  };
}
