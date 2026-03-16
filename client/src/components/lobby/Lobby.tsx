import React, { useState } from 'react';

interface Props {
  onCreateRoom: (name: string) => void;
  onJoinRoom: (code: string, name: string) => void;
  connecting: boolean;
  error: string | null;
}

export default function Lobby({ onCreateRoom, onJoinRoom, connecting, error }: Props) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: 8,
    border: '2px solid #a0682a',
    background: '#2a1a0a',
    color: '#f5e6c8',
    fontSize: 16,
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  const btnStyle: React.CSSProperties = {
    padding: '12px 28px',
    borderRadius: 10,
    border: '2px solid #a0682a',
    background: '#6a3f14',
    color: '#f5e6c8',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    width: '100%',
    transition: 'background 0.15s',
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f2a0f 0%, #1a3a1a 40%, #0a1a2a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Segoe UI", sans-serif',
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.6)',
        border: '2px solid #a0682a',
        borderRadius: 20,
        padding: '40px 48px',
        maxWidth: 420,
        width: '90vw',
        textAlign: 'center',
        boxShadow: '0 8px 40px #0008',
      }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🐰</div>
        <h1 style={{ color: '#f5e6c8', margin: 0, fontSize: 32, fontWeight: 900 }}>
          Bunny Catan
        </h1>
        <p style={{ color: '#b09070', margin: '8px 0 24px', fontSize: 15 }}>
          Build burrows. Collect carrots. Outfox your friends.
        </p>

        {error && (
          <div style={{
            background: '#440000', color: '#ff9090',
            borderRadius: 8, padding: '8px 12px', marginBottom: 16, fontSize: 14,
          }}>
            {error}
          </div>
        )}

        {mode === 'menu' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button style={btnStyle} onClick={() => setMode('create')}>
              🏡 Create Game
            </button>
            <button style={{ ...btnStyle, background: '#1a3a5a', borderColor: '#4a7ab5' }}
              onClick={() => setMode('join')}>
              🔗 Join Game
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              style={inputStyle}
              placeholder="Your bunny name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && name.trim() && onCreateRoom(name.trim())}
              autoFocus
            />
            <button
              style={{ ...btnStyle, opacity: name.trim() ? 1 : 0.5 }}
              disabled={!name.trim() || connecting}
              onClick={() => onCreateRoom(name.trim())}
            >
              {connecting ? 'Connecting...' : '🐾 Create Room'}
            </button>
            <button style={{ ...btnStyle, background: 'transparent', border: 'none', color: '#808080', fontSize: 14 }}
              onClick={() => setMode('menu')}>
              ← Back
            </button>
          </div>
        )}

        {mode === 'join' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              style={inputStyle}
              placeholder="Your bunny name"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
            <input
              style={inputStyle}
              placeholder="Room code (e.g. BUNNY-4829)"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && name.trim() && code.trim() && onJoinRoom(code.trim(), name.trim())}
            />
            <button
              style={{ ...btnStyle, opacity: name.trim() && code.trim() ? 1 : 0.5 }}
              disabled={!name.trim() || !code.trim() || connecting}
              onClick={() => onJoinRoom(code.trim(), name.trim())}
            >
              {connecting ? 'Joining...' : '🚪 Join Room'}
            </button>
            <button style={{ ...btnStyle, background: 'transparent', border: 'none', color: '#808080', fontSize: 14 }}
              onClick={() => setMode('menu')}>
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
