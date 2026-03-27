// client/src/services/calendarService.ts

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let gapiInited = false;
let gsiInited = false;
let tokenClient: any = null;
let accessToken: string | null = null;

const loadScript = (src: string): Promise<void> =>
  new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(s);
  });

export const initGapi = async (): Promise<void> => {
  if (gapiInited) return;
  await loadScript('https://apis.google.com/js/api.js');
  await new Promise<void>((resolve) => window.gapi.load('client', resolve));
  await window.gapi.client.init({});
  await window.gapi.client.load(
    'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'
  );
  gapiInited = true;
};

export const initGsi = async (): Promise<void> => {
  if (gsiInited) return;
  await loadScript('https://accounts.google.com/gsi/client');
  gsiInited = true;
};

let initPromise: Promise<void> | null = null;

export const initCalendar = (): Promise<void> => {
  if (!initPromise) {
    initPromise = (async () => {
      await Promise.all([initGapi(), initGsi()]);
      
      // Hydrate token from localStorage on boot
      const savedToken = localStorage.getItem('gcal_access_token');
      if (savedToken) {
        accessToken = savedToken;
        window.gapi.client.setToken({ access_token: accessToken });
      }

      tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: () => {}, // overridden per-call
      });
    })();
  }
  return initPromise;
};

export const requestAccess = (forceConsent = false): Promise<void> =>
  new Promise((resolve, reject) => {
    // Ensure we wait for init to finish if it's currently loading
    initCalendar().then(() => {
      if (!tokenClient) {
        reject(new Error('Calendar not initialized.'));
        return;
      }
      
      // If we already have a token in memory and aren't forcing a new consent prompt, we can skip
      if (accessToken && !forceConsent) {
        resolve();
        return;
      }

      tokenClient.callback = (resp: any) => {
        if (resp.error) {
          reject(new Error(resp.error));
          return;
        }
        accessToken = resp.access_token;
        localStorage.setItem('gcal_access_token', accessToken);
        window.gapi.client.setToken({ access_token: accessToken });
        resolve();
      };
      
      // prompt: '' tries silent auth if already consented
      tokenClient.requestAccessToken({ prompt: forceConsent ? 'consent' : '' });
    }).catch(reject);
  });

export const signOut = (): void => {
  const token = window.gapi.client.getToken();
  if (token && token.access_token) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {});
  }
  window.gapi.client.setToken(null);
  accessToken = null;
  localStorage.removeItem('gcal_access_token');
};

export const isConnected = (): boolean => !!accessToken;

// ── Types ──────────────────────────────────────────────────────────────────

export interface GCalEvent {
  id?: string;
  summary: string;
  description?: string;
  colorId?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  reminders?: {
    useDefault: boolean;
    overrides?: { method: 'email' | 'popup'; minutes: number }[];
  };
}

// ── Helper ────────────────────────────────────────────────────────────────

const executeWithRetry = async (requestConfig: any, retryCount = 0): Promise<any> => {
  try {
    const res = await window.gapi.client.request(requestConfig);
    return res.result;
  } catch (error: any) {
    // 401 Unauthorized usually means the access token has expired
    if (error.status === 401 && retryCount < 1) {
      console.warn('Google Calendar: 401 Unauthorized. Attempting to refresh token...');
      accessToken = null;
      localStorage.removeItem('gcal_access_token');
      try {
        await requestAccess(); // Attempt re-auth
        // Update the request with the new token if gapi didn't do it automatically
        return executeWithRetry(requestConfig, retryCount + 1);
      } catch (authError) {
        console.error('Re-authentication failed:', authError);
        throw error; // throw original 401 if re-auth fails
      }
    }
    throw error;
  }
};

// ── CRUD ──────────────────────────────────────────────────────────────────

export const createEvent = async (event: GCalEvent): Promise<any> => {
  return executeWithRetry({
    path: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    method: 'POST',
    body: JSON.stringify(event),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const listEvents = async (
  timeMin: string,
  timeMax: string
): Promise<any[]> => {
  const result = await executeWithRetry({
    path: 'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    method: 'GET',
    params: {
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    },
  });
  return result.items ?? [];
};

export const updateEvent = async (
  eventId: string,
  patch: Partial<GCalEvent>
): Promise<any> => {
  return executeWithRetry({
    path: `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    method: 'PATCH',
    body: JSON.stringify(patch),
    headers: { 'Content-Type': 'application/json' },
  });
};

export const deleteEvent = async (eventId: string): Promise<void> => {
  await executeWithRetry({
    path: `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    method: 'DELETE',
  });
};
