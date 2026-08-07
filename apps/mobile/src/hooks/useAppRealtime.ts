import { useEffect } from 'react';
import EventSource from 'react-native-sse';
import { API_BASE_URL } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export function useAppRealtime(orgId: string | undefined, onEvent: (type: string) => void) {
  useEffect(() => {
    if (!orgId) return;

    let source: EventSource | null = null;

    const connectSSE = async () => {
      try {
        const token = await AsyncStorage.getItem('@auth_token') || '';
        
        // Connect to the unified SSE stream
        source = new EventSource(`${API_BASE_URL}/${orgId}/stream?token=${token}`, {
          withCredentials: true
        });

        source.addEventListener('message', (event: any) => {
          if (event.data) {
            try {
              const data = JSON.parse(event.data);
              if (data.type && data.type !== 'connected') {
                onEvent(data.type);
              }
            } catch (err) {
              console.error('Failed to parse SSE data', err);
            }
          }
        });

        source.addEventListener('error', (err: any) => {
          console.error('SSE Error:', err);
        });

      } catch (err) {
        console.error('Failed to connect to SSE', err);
      }
    };

    connectSSE();

    return () => {
      if (source) {
        source.removeAllEventListeners();
        source.close();
      }
    };
  }, [orgId, onEvent]);
}
