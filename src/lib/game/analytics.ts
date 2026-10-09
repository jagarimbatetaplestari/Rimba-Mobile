import { FocusSession } from '@/types/game';

export interface DayFocusStat {
  date: string; // YYYY-MM-DD
  totalMinutes: number;
  sessionCount: number;
  tags: Record<string, number>; // Tag -> minutes
}

export interface AnalyticsSummary {
  currentStreak: number;
  longestStreak: number;
  todayMinutes: number;
  todayTrees: number;
  totalFocusMinutes: number;
  totalCompletedSessions: number;
  tagDistribution: Record<string, number>;
  activityMap: Record<string, DayFocusStat>;
}

// Format local date YYYY-MM-DD
export function toLocalDateString(dateInput: Date | string | number): string {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates streaks and focus statistics from all stored sessions.
 * Pure deterministic calculation.
 */
export function calculateAnalytics(
  sessions: FocusSession[],
  currentDate: Date = new Date(),
  protectedDates: string[] = []
): AnalyticsSummary {
  const completed = sessions.filter((s) => s.status === 'completed' && s.completed_at);

  const activityMap: Record<string, DayFocusStat> = {};
  const tagDistribution: Record<string, number> = {};
  let totalFocusMinutes = 0;

  completed.forEach((s) => {
    const dateStr = toLocalDateString(s.completed_at || s.started_at);
    const duration = s.duration_minutes || Math.max(1, Math.round(
      (new Date(s.expected_end_at).getTime() - new Date(s.started_at).getTime()) / 60000
    ));

    totalFocusMinutes += duration;

    const tag = s.tag || 'Belajar';
    tagDistribution[tag] = (tagDistribution[tag] || 0) + duration;

    if (!activityMap[dateStr]) {
      activityMap[dateStr] = {
        date: dateStr,
        totalMinutes: 0,
        sessionCount: 0,
        tags: {},
      };
    }

    activityMap[dateStr].totalMinutes += duration;
    activityMap[dateStr].sessionCount += 1;
    activityMap[dateStr].tags[tag] = (activityMap[dateStr].tags[tag] || 0) + duration;
  });

  // Inject shielded dates to keep streak links intact
  protectedDates.forEach((pDate) => {
    if (!activityMap[pDate]) {
      activityMap[pDate] = {
        date: pDate,
        totalMinutes: 0,
        sessionCount: 1,
        tags: { 'Embun Pelindung': 0 },
      };
    }
  });

  // Calculate current and longest streak
  const todayStr = toLocalDateString(currentDate);
  const todayStat = activityMap[todayStr];
  const todayMinutes = todayStat ? todayStat.totalMinutes : 0;
  const todayTrees = todayStat ? todayStat.sessionCount : 0;

  // Gather unique sorted dates in descending order
  const activeDates = Object.keys(activityMap).sort().reverse();

  let currentStreak = 0;
  let longestStreak = 0;

  if (activeDates.length > 0) {
    // Check if user was active today or yesterday
    const yesterday = new Date(currentDate);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateString(yesterday);

    let checkDate = new Date(currentDate);
    // If no session today yet, but active yesterday, streak is maintained from yesterday
    if (!activityMap[todayStr] && activityMap[yesterdayStr]) {
      checkDate = yesterday;
    }

    // Count backwards day by day for current streak
    while (true) {
      const dStr = toLocalDateString(checkDate);
      if (activityMap[dStr] && activityMap[dStr].sessionCount > 0) {
        currentStreak += 1;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate longest consecutive streak across all active dates
    const sortedAsc = Object.keys(activityMap).sort();
    let tempStreak = 0;
    let prevDate: Date | null = null;

    sortedAsc.forEach((dStr) => {
      const cur = new Date(dStr);
      if (!prevDate) {
        tempStreak = 1;
      } else {
        const diffDays = Math.round((cur.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          tempStreak += 1;
        } else if (diffDays > 1) {
          tempStreak = 1;
        }
      }
      prevDate = cur;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    });
  }

  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
  }

  return {
    currentStreak,
    longestStreak,
    todayMinutes,
    todayTrees,
    totalFocusMinutes,
    totalCompletedSessions: completed.length,
    tagDistribution,
    activityMap,
  };
}

/**
 * Returns streak milestone badge title and icon.
 */
export function getStreakMilestone(streak: number): { title: string; icon: string; nextTarget: number } {
  if (streak >= 30) return { title: 'Maharaja Rimba', icon: '👑', nextTarget: 60 };
  if (streak >= 14) return { title: 'Pelindung Kanopi', icon: '🌲', nextTarget: 30 };
  if (streak >= 7) return { title: 'Penjaga Hutan', icon: '🌿', nextTarget: 14 };
  if (streak >= 3) return { title: 'Tunas Rimba', icon: '🌱', nextTarget: 7 };
  return { title: 'Pemula Rimba', icon: '🌾', nextTarget: 3 };
}

export type AnalyticsPeriod = 'day' | 'week' | 'month' | 'year';

export interface PeriodBarPoint {
  label: string;
  minutes: number;
}

export interface PeriodAnalyticsResult {
  period: AnalyticsPeriod;
  periodLabel: string;
  totalMinutes: number;
  previousPeriodMinutes: number;
  completedCount: number;
  witheredCount: number;
  tagDistribution: Record<string, number>;
  bars: PeriodBarPoint[];
  peakHeadline: string;
  comparisonHeadline: string;
}

const DAY_NAMES_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const DAY_NAMES_FULL = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const MONTH_NAMES_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTH_NAMES_FULL = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function getSessionDurationMinutes(s: FocusSession): number {
  return (
    s.duration_minutes ||
    Math.max(
      1,
      Math.round((new Date(s.expected_end_at).getTime() - new Date(s.started_at).getTime()) / 60000)
    )
  );
}

export function calculatePeriodAnalytics(
  sessions: FocusSession[],
  period: AnalyticsPeriod,
  offset: number = 0,
  baseDate: Date = new Date()
): PeriodAnalyticsResult {
  const start = new Date(baseDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  let periodLabel = '';

  if (period === 'day') {
    start.setDate(start.getDate() + offset);
    end.setTime(start.getTime());
    end.setHours(23, 59, 59, 999);
    const isToday = offset === 0;
    periodLabel = `${isToday ? 'Hari Ini, ' : ''}${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]} ${start.getFullYear()}`;
  } else if (period === 'week') {
    // Monday-start week
    const dayOfWeek = start.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    start.setDate(start.getDate() + diffToMonday + offset * 7);
    end.setTime(start.getTime());
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    periodLabel = `${start.getDate()} ${MONTH_NAMES_SHORT[start.getMonth()]} – ${end.getDate()} ${MONTH_NAMES_SHORT[end.getMonth()]} ${end.getFullYear()}`;
  } else if (period === 'month') {
    start.setDate(1);
    start.setMonth(start.getMonth() + offset);
    end.setTime(start.getTime());
    end.setMonth(start.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    periodLabel = `${MONTH_NAMES_FULL[start.getMonth()]} ${start.getFullYear()}`;
  } else {
    start.setFullYear(start.getFullYear() + offset, 0, 1);
    end.setFullYear(start.getFullYear(), 11, 31);
    end.setHours(23, 59, 59, 999);
    periodLabel = `Tahun ${start.getFullYear()}`;
  }

  // Previous period bounds for comparison
  const durationMs = end.getTime() - start.getTime() + 1;
  const prevStart = new Date(start.getTime() - durationMs);
  const prevEnd = new Date(start.getTime() - 1);

  let totalMinutes = 0;
  let previousPeriodMinutes = 0;
  let completedCount = 0;
  let witheredCount = 0;
  const tagDistribution: Record<string, number> = {};

  // Buckets for bar chart & natural-language peak insights
  const hourBuckets = new Array(24).fill(0);
  const weekdayBuckets = new Array(7).fill(0);
  const monthDayBuckets = new Array(31).fill(0);
  const monthBuckets = new Array(12).fill(0);

  sessions.forEach((s) => {
    const refTime = new Date(s.completed_at || s.started_at).getTime();
    const dur = getSessionDurationMinutes(s);

    if (refTime >= start.getTime() && refTime <= end.getTime()) {
      if (s.status === 'completed') {
        totalMinutes += dur;
        completedCount += 1;
        const tag = s.tag || 'Fokus';
        tagDistribution[tag] = (tagDistribution[tag] || 0) + dur;

        const d = new Date(s.started_at);
        hourBuckets[d.getHours()] += dur;
        weekdayBuckets[d.getDay()] += dur;
        monthDayBuckets[d.getDate() - 1] += dur;
        monthBuckets[d.getMonth()] += dur;
      } else if (s.status === 'abandoned') {
        witheredCount += 1;
      }
    } else if (refTime >= prevStart.getTime() && refTime <= prevEnd.getTime()) {
      if (s.status === 'completed') {
        previousPeriodMinutes += dur;
      }
    }
  });

  // Build bars for period
  const bars: PeriodBarPoint[] = [];
  if (period === 'day') {
    // Group into 6 x 4-hour blocks or 8 x 3-hour blocks for clean mobile readability
    const blocks = [
      { label: '00h', hours: [0, 1, 2] },
      { label: '03h', hours: [3, 4, 5] },
      { label: '06h', hours: [6, 7, 8] },
      { label: '09h', hours: [9, 10, 11] },
      { label: '12h', hours: [12, 13, 14] },
      { label: '15h', hours: [15, 16, 17] },
      { label: '18h', hours: [18, 19, 20] },
      { label: '21h', hours: [21, 22, 23] },
    ];
    blocks.forEach((b) => {
      bars.push({
        label: b.label,
        minutes: b.hours.reduce((acc, h) => acc + hourBuckets[h], 0),
      });
    });
  } else if (period === 'week') {
    const order = [1, 2, 3, 4, 5, 6, 0]; // Sen..Min
    order.forEach((dow) => {
      bars.push({
        label: DAY_NAMES_SHORT[dow],
        minutes: weekdayBuckets[dow],
      });
    });
  } else if (period === 'month') {
    // 5 weekly/5-day buckets across the month for clean mobile chart
    const daysInMonth = end.getDate();
    const ranges = [
      { label: '1-6', s: 0, e: 6 },
      { label: '7-12', s: 6, e: 12 },
      { label: '13-18', s: 12, e: 18 },
      { label: '19-24', s: 18, e: 24 },
      { label: `25-${daysInMonth}`, s: 24, e: daysInMonth },
    ];
    ranges.forEach((r) => {
      let sum = 0;
      for (let i = r.s; i < r.e; i++) sum += monthDayBuckets[i] || 0;
      bars.push({ label: r.label, minutes: sum });
    });
  } else {
    MONTH_NAMES_SHORT.forEach((mLabel, idx) => {
      bars.push({ label: mLabel, minutes: monthBuckets[idx] });
    });
  }

  // Generate Natural-Language Headlines (#27)
  let peakHeadline = 'Belum ada catatan fokus pada periode ini — tanam sesi pertamamu!';
  if (totalMinutes > 0) {
    if (period === 'day') {
      let bestHour = 0;
      hourBuckets.forEach((m, h) => {
        if (m > hourBuckets[bestHour]) bestHour = h;
      });
      const nextHour = (bestHour + 1) % 24;
      peakHeadline = `Jam emas fokusmu berada di pukul ${String(bestHour).padStart(2, '0')}:00 – ${String(nextHour).padStart(2, '0')}:00 (${hourBuckets[bestHour]}m).`;
    } else if (period === 'week' || period === 'month') {
      let bestDow = 0;
      weekdayBuckets.forEach((m, dow) => {
        if (m > weekdayBuckets[bestDow]) bestDow = dow;
      });
      peakHeadline = `Hari paling produktifmu adalah ${DAY_NAMES_FULL[bestDow]} dengan total ${weekdayBuckets[bestDow]} menit fokus.`;
    } else {
      let bestMonth = 0;
      monthBuckets.forEach((m, idx) => {
        if (m > monthBuckets[bestMonth]) bestMonth = idx;
      });
      peakHeadline = `Bulan terproduktifmu adalah ${MONTH_NAMES_FULL[bestMonth]} (${monthBuckets[bestMonth]} menit fokus).`;
    }
  }

  const diff = totalMinutes - previousPeriodMinutes;
  let comparisonHeadline = '';
  if (totalMinutes === 0 && previousPeriodMinutes === 0) {
    comparisonHeadline = 'Mulai 1 sesi fokus untuk menyalakan grafik produktivitas pulau Rimba.';
  } else if (diff > 0) {
    comparisonHeadline = `Naik +${diff} menit dibanding periode sebelumnya (${previousPeriodMinutes}m). Pertahankan!`;
  } else if (diff < 0) {
    comparisonHeadline = `Berkurang ${Math.abs(diff)} menit dari periode lalu (${previousPeriodMinutes}m) — ayo kembali fokus!`;
  } else {
    comparisonHeadline = `Stabil di ${totalMinutes} menit, sama persis dengan periode sebelumnya.`;
  }

  return {
    period,
    periodLabel,
    totalMinutes,
    previousPeriodMinutes,
    completedCount,
    witheredCount,
    tagDistribution,
    bars,
    peakHeadline,
    comparisonHeadline,
  };
}

export interface CircadianRhythmData {
  hourlyMinutes: number[];
  peakHour: number;
  peakHourMinutes: number;
  peakWindowLabel: string;
  quadrantSummaries: {
    dawn: number;      // 04:00 - 09:59
    day: number;       // 10:00 - 15:59
    sunset: number;    // 16:00 - 19:59
    night: number;     // 20:00 - 03:59
  };
}

/**
 * Calculates 24-hour circadian focus distribution across all completed sessions.
 */
export function calculateCircadianFocusRhythm(sessions: FocusSession[]): CircadianRhythmData {
  const hourly = new Array(24).fill(0);
  const completed = sessions.filter((s) => s.status === 'completed' && s.completed_at);

  completed.forEach((s) => {
    const d = new Date(s.completed_at || s.started_at);
    const hour = d.getHours();
    const duration = s.duration_minutes || 25;
    hourly[hour] += duration;
  });

  let peakHour = 0;
  let maxMinutes = 0;
  hourly.forEach((m, h) => {
    if (m > maxMinutes) {
      maxMinutes = m;
      peakHour = h;
    }
  });

  const nextHour = (peakHour + 1) % 24;
  let peakWindowLabel = 'Pagi Hari';
  if (peakHour >= 4 && peakHour < 10) peakWindowLabel = `Fajar Tenang (${String(peakHour).padStart(2, '0')}:00 – ${String(nextHour).padStart(2, '0')}:00)`;
  else if (peakHour >= 10 && peakHour < 16) peakWindowLabel = `Siang Berdaya (${String(peakHour).padStart(2, '0')}:00 – ${String(nextHour).padStart(2, '0')}:00)`;
  else if (peakHour >= 16 && peakHour < 20) peakWindowLabel = `Senja Teduh (${String(peakHour).padStart(2, '0')}:00 – ${String(nextHour).padStart(2, '0')}:00)`;
  else peakWindowLabel = `Malam Kontemplatif (${String(peakHour).padStart(2, '0')}:00 – ${String(nextHour).padStart(2, '0')}:00)`;

  let dawn = 0;
  let day = 0;
  let sunset = 0;
  let night = 0;

  for (let h = 0; h < 24; h++) {
    const val = hourly[h];
    if (h >= 4 && h < 10) dawn += val;
    else if (h >= 10 && h < 16) day += val;
    else if (h >= 16 && h < 20) sunset += val;
    else night += val;
  }

  return {
    hourlyMinutes: hourly,
    peakHour,
    peakHourMinutes: maxMinutes,
    peakWindowLabel: maxMinutes > 0 ? peakWindowLabel : 'Mulai sesi untuk memetakan jam emasmu',
    quadrantSummaries: { dawn, day, sunset, night },
  };
}

/**
 * Filters and returns all focus sessions for a specific local date string YYYY-MM-DD.
 */
export function getDetailedSessionsForDate(
  sessions: FocusSession[],
  targetDateStr: string
): FocusSession[] {
  return sessions
    .filter((s) => {
      const dateStr = toLocalDateString(s.completed_at || s.started_at);
      return dateStr === targetDateStr;
    })
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
}

export interface FlowMasteryMetrics {
  completionRate: number;     // 0..100
  avgSessionMinutes: number;  // rounded integer
  deepWorkCount: number;      // sessions >= 25 mins
  totalFocusHours: number;    // total hours
  flowHarmonyScore: number;   // 0..100 composite score
}

/**
 * Calculates flow and consistency metrics based on sessions and interrupted trees.
 */
export function calculateFlowMastery(
  sessions: FocusSession[],
  stumpsCount: number
): FlowMasteryMetrics {
  const completed = sessions.filter((s) => s.status === 'completed' && s.completed_at);
  const totalCompleted = completed.length;
  const totalAttempted = totalCompleted + stumpsCount;

  const completionRate = totalAttempted > 0 ? Math.round((totalCompleted / totalAttempted) * 100) : 100;
  const totalMinutes = completed.reduce((acc, s) => acc + (s.duration_minutes || 25), 0);
  const avgSessionMinutes = totalCompleted > 0 ? Math.round(totalMinutes / totalCompleted) : 25;
  const deepWorkCount = completed.filter((s) => (s.duration_minutes || 25) >= 25).length;
  const totalFocusHours = Math.round((totalMinutes / 60) * 10) / 10;

  // Composite flow harmony score (weighted: completion rate 50%, deep work consistency 30%, avg duration 20%)
  const deepRatio = totalCompleted > 0 ? Math.min(1, deepWorkCount / totalCompleted) : 1;
  const durFactor = Math.min(1, avgSessionMinutes / 45);
  const flowHarmonyScore = Math.round(completionRate * 0.5 + deepRatio * 100 * 0.3 + durFactor * 100 * 0.2);

  return {
    completionRate,
    avgSessionMinutes,
    deepWorkCount,
    totalFocusHours,
    flowHarmonyScore,
  };
}


