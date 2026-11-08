import React, { useState } from 'react';

export default function App() {
  const [count, setCount] = useState(0);
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 600, margin: '60px auto', padding: '0 20px' }}>
      <h1 style={{ color: '#1d4ed8' }}>Test — Standard Web App</h1>
      <p style={{ color: '#6b7280' }}>
        A small sample React/Vite app.
      </p>
      <div style={{ marginTop: 32, padding: 20, background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Counter: {count}</p>
        <button
          onClick={() => setCount(c => c + 1)}
          style={{ marginTop: 12, padding: '8px 20px', background: '#1d4ed8', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}
        >
          Click me
        </button>
      </div>
    </div>
  );
}
