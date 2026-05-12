// 관리자 전용 사용량 통계 API 클라이언트

export interface AdminStatsTrendPoint {
  day: string;
  count: number;
}

export interface AdminStats {
  today: string;
  dauToday: number;
  totalUsers: number;
  dau7Avg: number;
  dau30Avg: number;
  trend: AdminStatsTrendPoint[];
}

export interface AdminStatsResult {
  data: AdminStats | null;
  error?: string;
}

export async function getAdminStats(): Promise<AdminStatsResult> {
  try {
    const res = await fetch('/api/admin/stats', {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    if (res.status === 403) return { data: null, error: 'forbidden' };
    if (!res.ok) return { data: null, error: `http_${res.status}` };
    const data = (await res.json()) as AdminStats;
    return { data };
  } catch (err) {
    return { data: null, error: String(err) };
  }
}
