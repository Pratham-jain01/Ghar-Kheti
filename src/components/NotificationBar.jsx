import React, { useState } from 'react';

export default function NotificationBar({ alerts }) {
  const [dismissed, setDismissed] = useState(new Set());

  const visible = (alerts || []).filter(n => !dismissed.has(n.id));
  if (visible.length === 0) return null;

  return (
    <>
      {visible.map(n => (
        <div key={n.id} className={`notification-bar ${n.type}`}>
          <span className="notification-icon">{n.icon}</span>
          <span className="notification-text">{n.text}</span>
          <button
            className="notification-dismiss"
            onClick={() => setDismissed(prev => new Set([...prev, n.id]))}
          >
            ✕
          </button>
        </div>
      ))}
    </>
  );
}
