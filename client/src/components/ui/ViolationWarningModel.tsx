// components/ui/ViolationWarningModal.tsx
import { AlertTriangle, X } from 'lucide-react';
import type { Violation } from './ViolationFeed';

const VIOLATION_META: Record<string, { label: string; detail: string }> = {
  tab_switch:     { label: 'Tab switched',     detail: 'You left the exam window.' },
  window_blur:    { label: 'Window unfocused', detail: 'The exam window lost focus.' },
  gaze_left:      { label: 'Gaze left',        detail: 'Your eyes moved off screen.' },
  gaze_right:     { label: 'Gaze right',       detail: 'Your eyes moved off screen.' },
  no_face:        { label: 'No face detected', detail: 'Your face was not visible.' },
  multiple_faces: { label: 'Multiple faces',   detail: 'Another person was detected.' },
  copy_attempt:   { label: 'Copy attempt',     detail: 'Clipboard use is not allowed.' },
  paste_attempt:  { label: 'Paste attempt',    detail: 'Clipboard use is not allowed.' },
};

interface Props {
  isOpen: boolean;
  violation: Violation | null;   // the specific event that triggered this
  totalCount: number;
  autoSubmitAt?: number;
  onClose: () => void;
}

export default function ViolationWarningModal({
  isOpen,
  violation,
  totalCount,
  autoSubmitAt = 7,
  onClose,
}: Props) {
  if (!isOpen || !violation) return null;

  const meta = VIOLATION_META[violation.type] ?? {
    label: violation.type, detail: '',
  };
  const remaining = autoSubmitAt - totalCount;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.5)',
    }}>
      <div style={{
        width: '340px',
        background: 'var(--color-background-primary)',
        borderRadius: 'var(--border-radius-lg)',
        border: '0.5px solid var(--color-border-tertiary)',
        overflow: 'hidden',
      }}>
        {/* Red top bar */}
        <div style={{
          background: '#FCEBEB', padding: '20px 20px 16px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          borderBottom: '0.5px solid var(--color-border-tertiary)',
        }}>
          <div style={{
            width: '48px', height: '48px', borderRadius: '50%',
            background: '#F7C1C1', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AlertTriangle size={22} color="#A32D2D" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontWeight: 500, fontSize: '15px', color: '#A32D2D', margin: '0 0 4px' }}>
              Suspicious activity detected
            </p>
            <p style={{ fontSize: '12px', color: '#993556', margin: 0 }}>
              {remaining > 0
                ? `${remaining} more violation${remaining !== 1 ? 's' : ''} will auto-submit your exam`
                : 'Your exam will be submitted now'}
            </p>
          </div>
        </div>

        {/* Specific event card */}
        <div style={{ padding: '16px 20px' }}>
          <div style={{
            background: '#FCEBEB', borderRadius: 'var(--border-radius-md)',
            padding: '10px 14px', marginBottom: '14px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
              <span style={{ fontWeight: 500, fontSize: '13px', color: '#A32D2D' }}>
                {meta.label}
              </span>
              <span style={{ fontSize: '11px', color: '#993556' }}>
                {new Date(violation.occurred_at).toLocaleTimeString('en-IN', {
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                })}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#993556', margin: 0 }}>{meta.detail}</p>
          </div>

          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '4px', marginBottom: '14px' }}>
            {Array.from({ length: autoSubmitAt }).map((_, i) => (
              <div key={i} style={{
                flex: 1, height: '5px', borderRadius: '2px',
                background: i < totalCount ? '#E24B4A' : 'var(--color-border-tertiary)',
              }} />
            ))}
          </div>

          <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
            All violations are recorded and reviewed by exam administrators.
            Please keep your face visible and stay on this page.
          </p>

          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '9px',
              background: '#E24B4A', color: '#fff', border: 'none',
              borderRadius: 'var(--border-radius-md)',
              fontWeight: 500, fontSize: '13px', cursor: 'pointer',
            }}
          >
            I understand — continue exam
          </button>
        </div>
      </div>
    </div>
  );
}