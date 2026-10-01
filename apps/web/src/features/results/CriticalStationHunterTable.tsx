/**
 * BeamLab Sprint B3.2 — Critical Station Hunter Table
 * Interactive diagnostic table ranking governing design stations across the model with capacity checks.
 */

import React, { useState, useMemo } from 'react';
import {
  type CriticalDesignStation,
} from './EnvelopeEngine';
import {
  ShieldAlert,
  Search,
  Crosshair,
  TrendingUp,
} from 'lucide-react';

interface CriticalStationHunterTableProps {
  criticalStations: CriticalDesignStation[];
  selectedMemberId?: string | null;
  onSelectStation?: (memberId: string, x: number) => void;
  className?: string;
}

export const CriticalStationHunterTable: React.FC<CriticalStationHunterTableProps> = ({
  criticalStations,
  selectedMemberId,
  onSelectStation,
  className = '',
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredStations = useMemo(() => {
    return criticalStations.filter((st) => {
      const matchSearch =
        st.memberName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.section.toLowerCase().includes(searchTerm.toLowerCase()) ||
        st.governingCombo.toLowerCase().includes(searchTerm.toLowerCase());

      const matchType =
        filterType === 'all' ||
        (filterType === 'moment' && st.governingType.includes('Moment')) ||
        (filterType === 'shear' && st.governingType === 'Shear') ||
        (filterType === 'axial' && st.governingType.includes('Axial')) ||
        (filterType === 'deflection' && st.governingType === 'Deflection');

      return matchSearch && matchType;
    });
  }, [criticalStations, searchTerm, filterType]);

  const stats = useMemo(() => {
    let maxUtil = 0;
    let overstressedCount = 0;
    let criticalCount = 0;
    let worstMember = '';

    for (const st of criticalStations) {
      if (st.utilization > maxUtil) {
        maxUtil = st.utilization;
        worstMember = st.memberName;
      }
      if (st.status === 'Overstressed') overstressedCount++;
      if (st.status === 'Critical') criticalCount++;
    }

    return { maxUtil, overstressedCount, criticalCount, worstMember };
  }, [criticalStations]);

  return (
    <div
      className={`flex flex-col bg-slate-950/95 text-slate-100 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden ${className}`}
    >
      {/* 1. HEADER & SUMMARY METRICS */}
      <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-4 border-b border-slate-800 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-white">Critical Station Hunter</h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                {criticalStations.length} Stations
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Multi-case governing extrema and cross-section unity utilization
            </p>
          </div>
        </div>

        {/* Quick KPI badges */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400">Governing &eta;:</span>
            <span
              className={`font-mono font-bold ${
                stats.maxUtil > 1.0
                  ? 'text-rose-400'
                  : stats.maxUtil > 0.9
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {(stats.maxUtil * 100).toFixed(1)}%
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400">Critical:</span>
            <span className="font-mono font-bold text-amber-400">{stats.criticalCount}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-slate-400">Overstressed:</span>
            <span
              className={`font-mono font-bold ${
                stats.overstressedCount > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {stats.overstressedCount}
            </span>
          </div>
        </div>
      </div>

      {/* 2. FILTERS & SEARCH */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-slate-800/80 bg-slate-900/30 text-xs">
        {/* Type pills */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg">
          {[
            { id: 'all', label: 'All Checks' },
            { id: 'moment', label: 'Bending (Mz)' },
            { id: 'shear', label: 'Shear (Vy)' },
            { id: 'axial', label: 'Axial (N)' },
            { id: 'deflection', label: 'Deflection (\u03B4)' },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterType(btn.id)}
              className={`px-2.5 py-1 rounded font-medium transition-all ${
                filterType === btn.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-48">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filter member, combo..."
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* 3. TABLE BODY */}
      <div className="overflow-x-auto max-h-[360px] custom-scrollbar">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-4">#</th>
              <th className="py-2.5 px-4">Member</th>
              <th className="py-2.5 px-4">Station (x)</th>
              <th className="py-2.5 px-4">Governing Check</th>
              <th className="py-2.5 px-4 text-right">Demand (Sd)</th>
              <th className="py-2.5 px-4 text-right">Capacity (Rd)</th>
              <th className="py-2.5 px-4">Utilization (&eta;)</th>
              <th className="py-2.5 px-4">Governing Load Combination</th>
              <th className="py-2.5 px-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredStations.map((st, idx) => {
              const isSelected = selectedMemberId === st.memberId;
              const utilPct = Math.min(100, st.utilization * 100);

              let statusColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
              let barColor = 'bg-emerald-500';
              if (st.status === 'Moderate') {
                statusColor = 'text-blue-400 bg-blue-500/10 border-blue-500/20';
                barColor = 'bg-blue-500';
              } else if (st.status === 'Critical') {
                statusColor = 'text-amber-400 bg-amber-500/10 border-amber-500/20';
                barColor = 'bg-amber-500';
              } else if (st.status === 'Overstressed') {
                statusColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
                barColor = 'bg-rose-500';
              }

              return (
                <tr
                  key={`${st.memberId}_${st.governingType}_${idx}`}
                  className={`hover:bg-slate-900/60 transition-colors ${
                    isSelected ? 'bg-blue-950/30' : ''
                  }`}
                >
                  <td className="py-2.5 px-4 text-slate-500">{idx + 1}</td>

                  <td className="py-2.5 px-4 font-sans">
                    <div className="font-semibold text-slate-200">{st.memberName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{st.section}</div>
                  </td>

                  <td className="py-2.5 px-4">
                    <span className="text-white font-bold">{st.x.toFixed(2)} m</span>{' '}
                    <span className="text-[10px] text-slate-500">
                      ({(st.stationRatio * 100).toFixed(0)}%)
                    </span>
                  </td>

                  <td className="py-2.5 px-4 font-sans text-slate-300">
                    {st.governingType}
                  </td>

                  <td className="py-2.5 px-4 text-right font-bold text-slate-100">
                    {st.governingValue > 0 ? `+${st.governingValue}` : st.governingValue}{' '}
                    <span className="text-[10px] text-slate-400 font-normal">{st.unit}</span>
                  </td>

                  <td className="py-2.5 px-4 text-right text-slate-400">
                    {st.capacity ? `${st.capacity} ${st.unit}` : '—'}
                  </td>

                  <td className="py-2.5 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${barColor}`}
                          style={{ width: `${utilPct}%` }}
                        />
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded border font-semibold ${statusColor}`}
                      >
                        {(st.utilization * 100).toFixed(0)}%
                      </span>
                    </div>
                  </td>

                  <td className="py-2.5 px-4 text-slate-400 font-sans text-[11px]">
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      {st.governingCombo}
                    </span>
                  </td>

                  <td className="py-2.5 px-4 text-center">
                    <button
                      onClick={() => onSelectStation?.(st.memberId, st.x)}
                      className="px-2.5 py-1 rounded bg-blue-600/20 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/30 transition-all font-sans text-xs flex items-center gap-1 mx-auto"
                      title="Inspect station in 2D Studio and 3D Canvas"
                    >
                      <TrendingUp className="w-3 h-3" />
                      <span>Inspect</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 4. FOOTER NOTE */}
      <div className="flex items-center justify-between px-6 py-2.5 border-t border-slate-800 bg-slate-900/60 text-[11px] text-slate-500">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-slate-400" />
          <span>AISC 360-16 / Eurocode 3 Cross-Section Unity Elastic-Plastic Capacity Hunter</span>
        </div>
        <div>Total evaluated combinations: 8 (6 ULS · 2 SLS)</div>
      </div>
    </div>
  );
};
