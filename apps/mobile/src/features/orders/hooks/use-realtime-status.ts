import { getRealtimeClient } from '@/lib/realtime-client';
import { useEffect, useState } from 'react';

export function useRealtimeStatus() {
  const [status, setStatus] = useState(() => getRealtimeClient().status());

  useEffect(() => {
    const client = getRealtimeClient();
    const id = setInterval(() => setStatus(client.status()), 1000);
    return () => clearInterval(id);
  }, []);

  return status;
}
