import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

let socket;

export function useQueue(centerId, doctorId, date) {
  const [queueData, setQueueData] = useState(null);

  useEffect(() => {
    if (!centerId && !doctorId) return;

    socket = io({ path: '/socket.io' });

    socket.emit('queue:join', { center_id: centerId, doctor_id: doctorId, date });

    socket.on('queue:updated', (data) => setQueueData(data));

    return () => {
      socket.emit('queue:leave', { center_id: centerId, doctor_id: doctorId, date });
      socket.disconnect();
    };
  }, [centerId, doctorId, date]);

  return queueData;
}
