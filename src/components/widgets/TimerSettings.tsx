import { useState, useRef } from 'react';
import { IoVolumeHigh } from 'react-icons/io5';
import { playAlarm } from '../../utils/sound';

const ALARM_SOUNDS = [
  { id: 'alarm1', label: '초인종', file: '/sounds/alarm1.mp3' },
  { id: 'alarm2', label: '맑은 벨', file: '/sounds/alarm2.mp3' },
  { id: 'alarm3', label: '게임 차임', file: '/sounds/alarm3.mp3' },
  { id: 'alarm4', label: '정답', file: '/sounds/alarm4.mp3' },
  { id: 'alarm5', label: '종소리', file: '/sounds/alarm5.mp3' },
  { id: 'beep', label: '기본 비프', file: '' },
];

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
}

export default function TimerSettings({ config, onConfigChange }: Props) {
  const selectedSound = (config.alarmSound as string) || 'alarm1';
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const handlePreview = (soundId: string) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
      previewAudioRef.current = null;
    }
    if (previewingId === soundId) {
      setPreviewingId(null);
      return;
    }

    const sound = ALARM_SOUNDS.find((s) => s.id === soundId);
    if (sound && sound.file) {
      const audio = new Audio(sound.file);
      previewAudioRef.current = audio;
      setPreviewingId(soundId);
      audio.play().catch(() => {});
      audio.onended = () => {
        setPreviewingId(null);
        previewAudioRef.current = null;
      };
    } else {
      setPreviewingId(soundId);
      playAlarm('');
      setTimeout(() => setPreviewingId(null), 2200);
    }
  };

  const selectSound = (soundId: string) => {
    onConfigChange({ ...config, alarmSound: soundId });
  };

  return (
    <div>
      <p style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', marginBottom: '8px', margin: 0, paddingBottom: '8px' }}>
        알람 소리
      </p>
      {ALARM_SOUNDS.map((sound) => (
        <div
          key={sound.id}
          onClick={() => selectSound(sound.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            borderRadius: '8px',
            cursor: 'pointer',
            background: selectedSound === sound.id ? '#eef2ff' : 'transparent',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { if (selectedSound !== sound.id) e.currentTarget.style.background = '#f8fafc'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = selectedSound === sound.id ? '#eef2ff' : 'transparent'; }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); handlePreview(sound.id); }}
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              border: 'none',
              background: previewingId === sound.id ? '#6366f1' : '#f1f5f9',
              color: previewingId === sound.id ? 'white' : '#64748b',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'all 0.15s',
            }}
          >
            <IoVolumeHigh size={13} />
          </button>
          <span
            style={{
              flex: 1,
              fontSize: '13px',
              fontWeight: selectedSound === sound.id ? 600 : 400,
              color: selectedSound === sound.id ? '#6366f1' : '#334155',
            }}
          >
            {sound.label}
          </span>
          {selectedSound === sound.id && (
            <span style={{ fontSize: '13px', color: '#6366f1' }}>✓</span>
          )}
        </div>
      ))}
    </div>
  );
}
