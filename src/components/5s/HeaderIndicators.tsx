'use client';

import { useState } from 'react';
import { StatsData } from '@/lib/store';
import { S_STEPS } from '@/lib/5s-constants';
import {
  ListTodo, Camera, ClipboardCheck, Trash2, Package,
  HelpCircle, ChevronDown, ChevronUp, TrendingUp
} from 'lucide-react';

interface HeaderIndicatorsProps {
  stats: StatsData | null;
}

export default function HeaderIndicators({ stats }: HeaderIndicatorsProps) {
  const [showByS, setShowByS] = useState(false);

  // Default stats when null (always show indicators)
  const s: StatsData = stats || {
    acciones: { total: 0, abiertas: 0, en_proceso: 0, resueltas: 0, cerradas: 0 },
    accionesByS: {},
    fotos: 0,
    fotosByS: {},
    estandares: { ok: 0, total: 0 },
    estandaresByS: {},
    innecesarios: { eliminados: 0, total: 0 },
    innecesariosByS: {},
    necesarios: 0,
    necesariosByS: {},
    dudosos: 0,
    dudososByS: {},
  };

  const accionesResueltas = s.acciones.resueltas + s.acciones.cerradas;
  const accionesPct = s.acciones.total > 0
    ? Math.round((accionesResueltas / s.acciones.total) * 100)
    : 0;

  const estandaresPct = s.estandares.total > 0
    ? Math.round((s.estandares.ok / s.estandares.total) * 100)
    : 0;

  const innecesariosPct = s.innecesarios.total > 0
    ? Math.round((s.innecesarios.eliminados / s.innecesarios.total) * 100)
    : 0;

  const hasAnyData = s.acciones.total > 0 || s.fotos > 0 || s.estandares.total > 0 || s.innecesarios.total > 0 || s.necesarios > 0 || s.dudosos > 0;

  const indicators = [
    {
      id: 'acciones',
      label: 'Acciones',
      icon: ListTodo,
      value: s.acciones.total,
      displayValue: String(s.acciones.total),
      bgGradient: 'from-amber-50 to-orange-50',
      borderColor: 'border-amber-300',
      iconColor: 'text-amber-600',
      valueColor: 'text-amber-800',
      barBg: 'bg-amber-200',
      barFill: 'bg-gradient-to-r from-amber-400 to-amber-500',
      pct: accionesPct,
      pctLabel: 'resueltas',
      subItems: [
        { label: 'Abiertas', count: s.acciones.abiertas, color: 'text-red-700', bg: 'bg-red-100 border-red-200' },
        { label: 'En proceso', count: s.acciones.en_proceso, color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200' },
        { label: 'Resueltas', count: accionesResueltas, color: 'text-green-700', bg: 'bg-green-100 border-green-200' },
      ],
    },
    {
      id: 'fotos',
      label: 'Fotos',
      icon: Camera,
      value: s.fotos,
      displayValue: String(s.fotos),
      bgGradient: 'from-sky-50 to-blue-50',
      borderColor: 'border-sky-300',
      iconColor: 'text-sky-600',
      valueColor: 'text-sky-800',
      barBg: 'bg-sky-200',
      barFill: 'bg-gradient-to-r from-sky-400 to-sky-500',
      pct: null,
      pctLabel: null,
      subItems: [],
    },
    {
      id: 'estandares',
      label: 'N\u00ba Est\u00e1ndares',
      icon: ClipboardCheck,
      value: s.estandares.total,
      displayValue: `${s.estandares.ok}/${s.estandares.total}`,
      bgGradient: 'from-violet-50 to-purple-50',
      borderColor: 'border-violet-300',
      iconColor: 'text-violet-600',
      valueColor: 'text-violet-800',
      barBg: 'bg-violet-200',
      barFill: 'bg-gradient-to-r from-violet-400 to-violet-500',
      pct: estandaresPct,
      pctLabel: 'cumplimiento',
      subItems: [],
    },
    {
      id: 'innecesarios',
      label: 'Innec. eliminados',
      icon: Trash2,
      value: s.innecesarios.total,
      displayValue: `${s.innecesarios.eliminados}/${s.innecesarios.total}`,
      bgGradient: 'from-rose-50 to-red-50',
      borderColor: 'border-rose-300',
      iconColor: 'text-rose-600',
      valueColor: 'text-rose-800',
      barBg: 'bg-rose-200',
      barFill: 'bg-gradient-to-r from-rose-400 to-rose-500',
      pct: innecesariosPct,
      pctLabel: 'eliminados',
      subItems: [],
    },
    {
      id: 'necesarios',
      label: 'Necesarios',
      icon: Package,
      value: s.necesarios,
      displayValue: String(s.necesarios),
      bgGradient: 'from-emerald-50 to-green-50',
      borderColor: 'border-emerald-300',
      iconColor: 'text-emerald-600',
      valueColor: 'text-emerald-800',
      barBg: 'bg-emerald-200',
      barFill: 'bg-gradient-to-r from-emerald-400 to-emerald-500',
      pct: null,
      pctLabel: null,
      subItems: [],
    },
    {
      id: 'dudosos',
      label: 'Dudosos',
      icon: HelpCircle,
      value: s.dudosos,
      displayValue: String(s.dudosos),
      bgGradient: 'from-yellow-50 to-amber-50',
      borderColor: 'border-yellow-300',
      iconColor: 'text-yellow-600',
      valueColor: 'text-yellow-800',
      barBg: 'bg-yellow-200',
      barFill: 'bg-gradient-to-r from-yellow-400 to-yellow-500',
      pct: null,
      pctLabel: null,
      subItems: [],
    },
  ];

  // Get per-S value for a given indicator
  const getSValue = (indId: string, sStep: number): { value: string; pct: number | null } => {
    switch (indId) {
      case 'acciones': {
        const d = s.accionesByS?.[sStep];
        if (!d) return { value: '0', pct: null };
        const resolved = d.resueltas || 0;
        const pct = d.total > 0 ? Math.round((resolved / d.total) * 100) : null;
        return { value: String(d.total), pct };
      }
      case 'fotos': {
        const v = s.fotosByS?.[sStep] || 0;
        return { value: String(v), pct: null };
      }
      case 'estandares': {
        const d = s.estandaresByS?.[sStep];
        if (!d) return { value: '0/0', pct: 0 };
        const pct = d.total > 0 ? Math.round((d.ok / d.total) * 100) : 0;
        return { value: `${d.ok}/${d.total}`, pct };
      }
      case 'innecesarios': {
        const d = s.innecesariosByS?.[sStep];
        if (!d) return { value: '0/0', pct: 0 };
        const pct = d.total > 0 ? Math.round((d.eliminados / d.total) * 100) : 0;
        return { value: `${d.eliminados}/${d.total}`, pct };
      }
      case 'necesarios': {
        const v = s.necesariosByS?.[sStep] || 0;
        return { value: String(v), pct: null };
      }
      case 'dudosos': {
        const v = s.dudososByS?.[sStep] || 0;
        return { value: String(v), pct: null };
      }
      default:
        return { value: '-', pct: null };
    }
  };

  return (
    <div className="border-t bg-gradient-to-r from-gray-50/95 to-slate-50/95 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-3 py-2.5">
        {/* Main indicators row */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {indicators.map((ind) => {
            const IconComp = ind.icon;
            const isEmpty = ind.value === 0 || ind.displayValue === '0' || ind.displayValue === '0/0';
            return (
              <div
                key={ind.id}
                className={`relative flex flex-col items-center justify-center px-2 py-2.5 rounded-xl bg-gradient-to-b ${ind.bgGradient} border ${ind.borderColor} transition-all hover:shadow-lg hover:scale-[1.03] cursor-default group`}
              >
                {/* Empty state subtle indicator */}
                {isEmpty && (
                  <div className="absolute top-1 right-1.5">
                    <span className="text-[7px] text-gray-400 font-medium opacity-60 group-hover:opacity-100 transition-opacity">
                      sin datos
                    </span>
                  </div>
                )}

                {/* Icon + Value */}
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className={`p-1 rounded-lg ${isEmpty ? 'bg-white/50' : 'bg-white/70'} shadow-sm`}>
                    <IconComp className={`h-3.5 w-3.5 ${ind.iconColor}`} />
                  </div>
                  <span className={`text-lg sm:text-2xl font-extrabold ${ind.valueColor} leading-none tracking-tight`}>
                    {ind.displayValue}
                  </span>
                </div>

                {/* Label */}
                <span className={`text-[9px] sm:text-[10px] font-semibold ${ind.iconColor} whitespace-nowrap mt-1 uppercase tracking-wide`}>
                  {ind.label}
                </span>

                {/* Percentage bar */}
                {ind.pct !== null && (
                  <div className="w-full mt-1.5">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[8px] text-gray-500 font-medium">{ind.pctLabel}</span>
                      <span className="text-[9px] font-bold text-gray-600">{ind.pct}%</span>
                    </div>
                    <div className={`w-full h-2 ${ind.barBg} rounded-full overflow-hidden`}>
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${ind.barFill}`}
                        style={{ width: `${ind.pct}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Sub-items (for acciones) */}
                {ind.id === 'acciones' && (
                  <div className="flex gap-1 mt-1.5 flex-wrap justify-center">
                    {ind.subItems.map((sub) => (
                      <span
                        key={sub.label}
                        className={`text-[8px] font-semibold px-1.5 py-0.5 rounded-md border ${sub.bg} ${sub.color}`}
                      >
                        {sub.count} {sub.label.toLowerCase()}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Per-S breakdown (always show toggle) */}
        <div className="mt-2">
          <button
            onClick={() => setShowByS(!showByS)}
            className="flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 mx-auto transition-colors py-0.5"
          >
            {showByS ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showByS ? 'Ocultar' : 'Ver'} desglose por S
            {!hasAnyData && <span className="text-gray-400 ml-1">(sin datos a\u00fan)</span>}
          </button>

          {showByS && (
            <div className="mt-1.5 overflow-x-auto">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left py-1.5 px-2 font-semibold text-gray-500">Indicador</th>
                    {S_STEPS.map(sStep => (
                      <th key={sStep.id} className="text-center py-1.5 px-2 font-bold min-w-[70px]" style={{ color: sStep.color }}>
                        S{sStep.id}
                      </th>
                    ))}
                    <th className="text-center py-1.5 px-2 font-bold text-gray-500">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {indicators.map(ind => (
                    <tr key={ind.id} className="border-b border-gray-100 hover:bg-white/60 transition-colors">
                      <td className={`py-1.5 px-2 font-semibold ${ind.iconColor} whitespace-nowrap flex items-center gap-1`}>
                        <ind.icon className="h-3 w-3" />
                        {ind.label}
                      </td>
                      {S_STEPS.map(sStep => {
                        const sv = getSValue(ind.id, sStep.id);
                        return (
                          <td key={sStep.id} className="text-center py-1.5 px-2">
                            <span className={`font-bold ${ind.valueColor}`}>{sv.value}</span>
                            {sv.pct !== null && sv.pct > 0 && (
                              <span className="text-gray-400 ml-0.5 text-[9px]">({sv.pct}%)</span>
                            )}
                          </td>
                        );
                      })}
                      <td className="text-center py-1.5 px-2">
                        <span className={`font-extrabold ${ind.valueColor}`}>{ind.displayValue}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
