import { useEffect, useState } from 'react';
import { getAdminStats, type AdminStats } from '../services/adminStats';

export default function AdminStatsBadge() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    const res = await getAdminStats();
    setLoading(false);
    if (res.data) setStats(res.data);
  };

  useEffect(() => {
    fetchStats();
    const id = window.setInterval(fetchStats, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (!stats) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="관리자 통계 (클릭하여 상세 보기)"
        style={{
          position: 'fixed',
          right: 16,
          bottom: 16,
          zIndex: 9000,
          background: 'rgba(15, 23, 42, 0.85)',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          padding: '8px 12px',
          fontSize: 12,
          fontFamily: 'inherit',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          lineHeight: 1.3,
        }}
      >
        <span style={{ fontSize: 14 }}>📊</span>
        <span>
          <strong style={{ fontSize: 14 }}>{stats.dauToday}</strong>
          <span style={{ opacity: 0.7, marginLeft: 4 }}>오늘</span>
          <span style={{ opacity: 0.5, margin: '0 6px' }}>·</span>
          <strong style={{ fontSize: 14 }}>{stats.totalUsers}</strong>
          <span style={{ opacity: 0.7, marginLeft: 4 }}>누적</span>
        </span>
      </button>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.4)',
            zIndex: 9100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 16,
              padding: '24px 28px',
              minWidth: 380,
              maxWidth: 520,
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                📊 사용량 통계
              </h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="닫기"
                style={{
                  width: 32, height: 32, borderRadius: 8, border: 'none',
                  background: '#f1f5f9', color: '#475569', cursor: 'pointer',
                  fontSize: 18, lineHeight: 1, padding: 0,
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <StatTile label="오늘 활성 사용자" value={stats.dauToday} unit="명" />
              <StatTile label="누적 가입자" value={stats.totalUsers} unit="명" />
              <StatTile label="최근 7일 평균 DAU" value={stats.dau7Avg} unit="명/일" />
              <StatTile label="최근 30일 평균 DAU" value={stats.dau30Avg} unit="명/일" />
            </div>

            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>
                최근 30일 일별 활성 사용자
              </div>
              <TrendSparkline trend={stats.trend} />
            </div>

            <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
              <div>· DAU는 사용자가 그 날 한 번이라도 백엔드를 호출한 경우 1회로 카운트됩니다.</div>
              <div>· 정확한 일별 총 요청 수는 <a href="https://dash.cloudflare.com" target="_blank" rel="noreferrer" style={{ color: '#6366f1' }}>Cloudflare 대시보드</a>에서 확인할 수 있습니다.</div>
              <div>· 데이터는 5분마다 자동 갱신됩니다. {loading && <span style={{ color: '#6366f1' }}>새로고침 중...</span>}</div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatTile({ label, value, unit }: { label: string; value: number; unit: string }) {
  return (
    <div style={{
      background: '#f8fafc',
      borderRadius: 10,
      padding: '12px 14px',
      border: '1px solid #e2e8f0',
    }}>
      <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#0f172a' }}>
        {value.toLocaleString()}
        <span style={{ fontSize: 11, fontWeight: 400, color: '#94a3b8', marginLeft: 4 }}>{unit}</span>
      </div>
    </div>
  );
}

function TrendSparkline({ trend }: { trend: { day: string; count: number }[] }) {
  const W = 460;
  const H = 80;
  const PAD = 4;
  const max = Math.max(1, ...trend.map((p) => p.count));
  const step = trend.length > 1 ? (W - PAD * 2) / (trend.length - 1) : 0;
  const points = trend
    .map((p, i) => {
      const x = PAD + i * step;
      const y = H - PAD - (p.count / max) * (H - PAD * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const last = trend[trend.length - 1];

  return (
    <div style={{ background: '#f8fafc', borderRadius: 10, padding: 10, border: '1px solid #e2e8f0' }}>
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        <polyline
          points={points}
          fill="none"
          stroke="#6366f1"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {trend.map((p, i) => {
          const x = PAD + i * step;
          const y = H - PAD - (p.count / max) * (H - PAD * 2);
          return <circle key={p.day} cx={x} cy={y} r={1.6} fill="#6366f1" opacity={i === trend.length - 1 ? 1 : 0.4} />;
        })}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: '#94a3b8' }}>
        <span>{trend[0]?.day.slice(5)}</span>
        <span>최대 {max}명</span>
        <span>{last?.day.slice(5)} ({last?.count}명)</span>
      </div>
    </div>
  );
}
