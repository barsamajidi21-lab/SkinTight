import React, { useMemo } from 'react';
import { BarChart3, Download, Clock, AlertCircle, Calendar } from 'lucide-react';
import { ClinicCase, TriageColor } from '../../types/clinic';

interface PilotMetricsTabProps {
  cases: ClinicCase[];
}

function getIsoWeekLabel(isoDate: string): string {
  const d = new Date(isoDate);
  const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function diffMinutes(startIso?: string, endIso?: string): number | null {
  if (!startIso || !endIso) return null;
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (Number.isNaN(ms) || ms < 0) return null;
  return Math.round(ms / 60000);
}

function formatDurationMinutes(mins: number | null): string {
  if (mins === null) return '—';
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h < 24) return m > 0 ? `${h}h ${m}m` : `${h}h`;
  const days = Math.floor(h / 24);
  const remH = h % 24;
  return remH > 0 ? `${days}d ${remH}h` : `${days}d`;
}

function computeAvgAndMedian(values: number[]): { avg: number | null; median: number | null } {
  if (values.length === 0) return { avg: null, median: null };
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  const avg = Math.round(sum / sorted.length);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
  return { avg, median };
}

interface RowStats {
  label: string;
  count: number;
  reviewStats: { avg: number | null; median: number | null };
  scheduleStats: { avg: number | null; median: number | null };
  overrides: number;
}

function aggregateCases(groupLabel: string, list: ClinicCase[]): RowStats {
  const toReview = list
    .map(c => diffMinutes(c.dateSubmitted, c.reviewedAt))
    .filter((v): v is number => v !== null);
  const toSchedule = list
    .map(c => diffMinutes(c.dateSubmitted, c.scheduledAt))
    .filter((v): v is number => v !== null);

  return {
    label: groupLabel,
    count: list.length,
    reviewStats: computeAvgAndMedian(toReview),
    scheduleStats: computeAvgAndMedian(toSchedule),
    overrides: list.filter(c => !!c.override).length,
  };
}

export const PilotMetricsTab: React.FC<PilotMetricsTabProps> = ({ cases }) => {
  const colorRows = useMemo(() => {
    const colors: TriageColor[] = ['red', 'yellow', 'green'];
    return colors.map(col => {
      const subset = cases.filter(c => (c.override?.overriddenColor || c.color) === col);
      return { color: col, ...aggregateCases(col.toUpperCase(), subset) };
    });
  }, [cases]);

  const weeklyRows = useMemo(() => {
    const map = new Map<string, ClinicCase[]>();
    for (const c of cases) {
      const wk = getIsoWeekLabel(c.dateSubmitted);
      if (!map.has(wk)) map.set(wk, []);
      map.get(wk)!.push(c);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([week, list]) => aggregateCases(week, list));
  }, [cases]);

  const overridesList = useMemo(() => {
    return cases
      .filter(c => !!c.override)
      .map(c => ({
        caseId: c.id,
        date: c.override!.timestamp,
        originalColor: c.override!.originalColor,
        overriddenColor: c.override!.overriddenColor,
        reason: c.override!.reason,
        overriddenBy: c.override!.overriddenBy,
      }));
  }, [cases]);

  const handleDownloadCsv = () => {
    // Strictly de-identified CSV: NO patient names, emails, phones, photos, or free-text patient comments
    const headers = [
      'case_id',
      'week',
      'original_color',
      'final_color',
      'status',
      'override_applied',
      'submitted_at',
      'reviewed_at',
      'scheduled_at',
      'closed_at',
      'minutes_to_reviewed',
      'minutes_to_scheduled',
    ];

    const escapeCsv = (val: string | number | boolean | null | undefined) => {
      const str = val === null || val === undefined ? '' : String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = cases.map(c => {
      const finalColor = c.override?.overriddenColor || c.color;
      const minReview = diffMinutes(c.dateSubmitted, c.reviewedAt);
      const minSched = diffMinutes(c.dateSubmitted, c.scheduledAt);
      return [
        c.id,
        getIsoWeekLabel(c.dateSubmitted),
        c.color,
        finalColor,
        c.status,
        !!c.override,
        c.dateSubmitted,
        c.reviewedAt || '',
        c.scheduledAt || '',
        c.closedAt || '',
        minReview ?? '',
        minSched ?? '',
      ]
        .map(escapeCsv)
        .join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `clinic_pilot_metrics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <BarChart3 size={18} className="text-teal-400" /> Pilot Workflow Metrics
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            De-identified triage volume, review wait times, scheduling speed, and category override counts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-black flex items-center justify-center gap-2 shrink-0 whitespace-nowrap cursor-pointer"
        >
          <Download size={15} />
          Download CSV (No Patient Info)
        </button>
      </div>

      {/* Breakdown By Color */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Clock size={16} className="text-teal-400" /> Metrics by Category Color
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Color</th>
                <th className="py-2.5 px-3">Cases</th>
                <th className="py-2.5 px-3">Avg Wait → Reviewed</th>
                <th className="py-2.5 px-3">Median → Reviewed</th>
                <th className="py-2.5 px-3">Avg Wait → Scheduled</th>
                <th className="py-2.5 px-3">Median → Scheduled</th>
                <th className="py-2.5 px-3">Overrides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {colorRows.map(row => (
                <tr key={row.label} className="hover:bg-slate-800/30">
                  <td className="py-3 px-3 font-bold">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                        row.color === 'red'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                          : row.color === 'yellow'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {row.label}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-white">{row.count}</td>
                  <td className="py-3 px-3">{formatDurationMinutes(row.reviewStats.avg)}</td>
                  <td className="py-3 px-3">{formatDurationMinutes(row.reviewStats.median)}</td>
                  <td className="py-3 px-3">{formatDurationMinutes(row.scheduleStats.avg)}</td>
                  <td className="py-3 px-3">{formatDurationMinutes(row.scheduleStats.median)}</td>
                  <td className="py-3 px-3">{row.overrides}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Breakdown By Week */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-teal-400" /> Metrics by Week
        </h3>
        {weeklyRows.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center">No cases recorded yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 text-slate-400 uppercase text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Week</th>
                  <th className="py-2.5 px-3">Total Cases</th>
                  <th className="py-2.5 px-3">Avg → Reviewed</th>
                  <th className="py-2.5 px-3">Median → Reviewed</th>
                  <th className="py-2.5 px-3">Avg → Scheduled</th>
                  <th className="py-2.5 px-3">Median → Scheduled</th>
                  <th className="py-2.5 px-3">Overrides</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {weeklyRows.map(row => (
                  <tr key={row.label} className="hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-mono font-bold text-teal-300">{row.label}</td>
                    <td className="py-3 px-3 font-bold text-white">{row.count}</td>
                    <td className="py-3 px-3">{formatDurationMinutes(row.reviewStats.avg)}</td>
                    <td className="py-3 px-3">{formatDurationMinutes(row.reviewStats.median)}</td>
                    <td className="py-3 px-3">{formatDurationMinutes(row.scheduleStats.avg)}</td>
                    <td className="py-3 px-3">{formatDurationMinutes(row.scheduleStats.median)}</td>
                    <td className="py-3 px-3">{row.overrides}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Staff Overrides & Reasons */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertCircle size={16} className="text-amber-400" /> Staff Category Overrides ({overridesList.length})
          </h3>
          <span className="text-[11px] text-slate-400">De-identified (reasons &amp; category changes only)</span>
        </div>

        {overridesList.length === 0 ? (
          <div className="text-xs text-slate-500 py-6 text-center">No staff color overrides recorded yet.</div>
        ) : (
          <div className="space-y-2.5">
            {overridesList.map((ov, idx) => (
              <div key={idx} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-[11px] text-slate-400">#{ov.caseId.slice(-6)}</span>
                    <span className="font-bold text-white">
                      {ov.originalColor.toUpperCase()} → {ov.overriddenColor.toUpperCase()}
                    </span>
                    <span className="text-slate-400">by {ov.overriddenBy}</span>
                  </div>
                  <p className="text-slate-300 mt-1">Reason: "{ov.reason}"</p>
                </div>
                <span className="text-[11px] text-slate-500 shrink-0">
                  {new Date(ov.date).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
