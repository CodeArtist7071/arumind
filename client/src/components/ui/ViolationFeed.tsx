import { useEffect, useRef } from 'react';
import { AlertTriangle, Eye, EyeOff, Copy, Users, Monitor } from 'lucide-react';

export interface Violation {
  id: string;
  type: string;
  occurred_at: string;
}

interface ViolationFeedProps {
  violations: Violation[];
  totalCount: number;
  autoSubmitAt?: number;
}

const VIOLATION_META: Record<string, {
  label: string;
  detail: string;
  severity: 'high' | 'medium';
}> = {
  tab_switch:      { label: 'Tab switched',      detail: 'Left exam window',        severity: 'high'   },
  window_blur:     { label: 'Window unfocused',   detail: 'App lost focus',          severity: 'high'   },
  gaze_left:       { label: 'Gaze left',          detail: 'Eyes moved off screen',   severity: 'medium' },
  gaze_right:      { label: 'Gaze right',         detail: 'Eyes moved off screen',   severity: 'medium' },
  no_face:         { label: 'No face detected',   detail: 'Face missing — 3 frames', severity: 'high'   },
  multiple_faces:  { label: 'Multiple faces',     detail: 'Extra person detected',   severity: 'high'   },
  copy_attempt:    { label: 'Copy attempt',       detail: 'Clipboard blocked',       severity: 'medium' },
  paste_attempt:   { label: 'Paste attempt',      detail: 'Clipboard blocked',       severity: 'medium' },
};

const SEVERITY_STYLE = {
  high:   { bg: '#FCEBEB', dot: '#E24B4A', label: '#A32D2D', detail: '#993556', time: '#993556' },
  medium: { bg: '#FAEEDA', dot: '#BA7517', label: '#633806', detail: '#854F0B', time: '#854F0B' },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function ViolationFeed({
  violations,
  totalCount,
  autoSubmitAt = 7,
}: ViolationFeedProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // auto-scroll to top on new violation
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [violations.length]);

  const filled = Math.min(totalCount, autoSubmitAt);

  return (
    <div style={{
      width: '260px',
      background: 'bg-white',
      border: '0.5px solid var(--color-border-tertiary)',
      borderRadius: 'var(--border-radius-lg)',
      overflow: 'hidden',
      fontSize: '13px',
    }}>

      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: '0.5px solid var(--color-border-tertiary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          <div style={{
            width: '8px', height: '8px', borderRadius: '50%',
            background: '#E24B4A',
            animation: 'vf-pulse 1.2s ease infinite',
          }} />
          <span style={{ fontWeight: 500, color: 'text-black' }}>
            Proctoring active
          </span>
        </div>
        {totalCount > 0 && (
          <span style={{
            fontSize: '11px', fontWeight: 500,
            background: '#FCEBEB', color: '#A32D2D',
            padding: '2px 7px', borderRadius: '4px',
          }}>
            {totalCount} violation{totalCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Feed list */}
      <div ref={listRef} style={{ maxHeight: '260px', overflowY: 'auto' }}>
        {violations.length === 0 ? (
          <div style={{
            padding: '24px 16px', textAlign: 'center',
            color: 'var(--color-text-tertiary)', fontSize: '12px',
          }}>
            No violations yet
          </div>
        ) : (
          violations.map((v, i) => {
            const meta = VIOLATION_META[v.type] ?? {
              label: v.type, detail: '', severity: 'medium' as const,
            };
            const s = SEVERITY_STYLE[meta.severity];
            const isLatest = i === 0;

            return (
              <div
                key={v.id}
                style={{
                  padding: '9px 14px',
                  borderBottom: '0.5px solid var(--color-border-tertiary)',
                  display: 'flex', gap: '9px', alignItems: 'flex-start',
                  background: isLatest ? s.bg : 'transparent',
                  animation: isLatest ? 'vf-slide 0.3s ease' : 'none',
                  transition: 'background 0.4s ease',
                }}
              >
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%',
                  background: s.dot, marginTop: '5px', flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500, color: s.label }}>{meta.label}</span>
                    <span style={{ fontSize: '11px', color: s.time, flexShrink: 0, marginLeft: '8px' }}>
                      {formatTime(v.occurred_at)}
                    </span>
                  </div>
                  {meta.detail && (
                    <span style={{ fontSize: '11px', color: s.detail }}>{meta.detail}</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Progress bar footer */}
      <div style={{
        padding: '9px 14px',
        borderTop: '0.5px solid var(--color-border-tertiary)',
        background: 'var(--color-background-secondary)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <span style={{ fontSize: '11px', color: 'var(--color-text-tertiary)' }}>
            Auto-submit at {autoSubmitAt}
          </span>
          <span style={{ fontSize: '11px', color: totalCount >= autoSubmitAt - 2 ? '#A32D2D' : 'var(--color-text-tertiary)' }}>
            {filled}/{autoSubmitAt}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '3px' }}>
          {Array.from({ length: autoSubmitAt }).map((_, i) => (
            <div key={i} style={{
              flex: 1, height: '5px', borderRadius: '2px',
              background: i < filled ? '#E24B4A' : 'var(--color-border-tertiary)',
              transition: 'background 0.3s ease',
            }} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes vf-slide { from { opacity:0; transform:translateX(12px); } to { opacity:1; transform:translateX(0); } }
        @keyframes vf-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>
    </div>
  );
}