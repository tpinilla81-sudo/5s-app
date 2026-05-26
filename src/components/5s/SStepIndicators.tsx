'use client';

import { use5SStore } from '@/lib/store';
import { S_STEPS } from '@/lib/5s-constants';
import {
  ListTodo, Camera, ClipboardCheck, Trash2, Package, HelpCircle
} from 'lucide-react';

interface SStepIndicatorsProps {
  sStep: number;
}

export default function SStepIndicators({ sStep }: SStepIndicatorsProps) {
  const { stats } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);

  if (!sStepData) return null;

  // Use stats if available, otherwise default to zeros
  const accionesData = stats?.accionesByS?.[sStep] || { total: 0, abiertas: 0, en_proceso: 0, resueltas: 0 };
  const fotosCount = stats?.fotosByS?.[sStep] || 0;
  const estandaresData = stats?.estandaresByS?.[sStep] || { ok: 0, total: 0 };
  const innecesariosData = stats?.innecesariosByS?.[sStep] || { eliminados: 0, total: 0 };
  const necesariosCount = stats?.necesariosByS?.[sStep] || 0;
  const dudososCount = stats?.dudososByS?.[sStep] || 0;

  const accionesPct = accionesData.total > 0
    ? Math.round((accionesData.resueltas / accionesData.total) * 100)
    : 0;
  const estandaresPct = estandaresData.total > 0
    ? Math.round((estandaresData.ok / estandaresData.total) * 100)
    : 0;
  const innecesariosPct = innecesariosData.total > 0
    ? Math.round((innecesariosData.eliminados / innecesariosData.total) * 100)
    : 0;

  const color = sStepData.color;

  const indicators = [
    {
      id: 'acciones',
      label: 'Acciones',
      icon: ListTodo,
      value: accionesData.total,
      displayValue: String(accionesData.total),
      pct: accionesPct,
      pctLabel: 'resueltas',
      subItems: [
        { label: 'Abiertas', count: accionesData.abiertas, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
        { label: 'En proceso', count: accionesData.en_proceso, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200' },
        { label: 'Resueltas', count: accionesData.resueltas, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
      ],
    },
    {
      id: 'fotos',
      label: 'Fotos',
      icon: Camera,
      value: fotosCount,
      displayValue: String(fotosCount),
      pct: null,
      pctLabel: null,
      subItems: [],
    },
    {
      id: 'estandares',
      label: 'N\u00ba Est\u00e1ndares',
      icon: ClipboardCheck,
      value: estandaresData.total,
      displayValue: `${estandaresData.ok}/${estandaresData.total}`,
      pct: estandaresPct,
      pctLabel: 'cumplimiento',
      subItems: [],
    },
    {
      id: 'innecesarios',
      label: 'Innec. elim.',
      icon: Trash2,
      value: innecesariosData.total,
      displayValue: `${innecesariosData.eliminados}/${innecesariosData.total}`,
      pct: innecesariosPct,
      pctLabel: 'eliminados',
      subItems: [],
    },
    {
      id: 'necesarios',
      label: 'Necesarios',
      icon: Package,
      value: necesariosCount,
      displayValue: String(necesariosCount),
      pct: null,
      pctLabel: null,
      subItems: [],
    },
    {
      id: 'dudosos',
      label: 'Dudosos',
      icon: HelpCircle,
      value: dudososCount,
      displayValue: String(dudososCount),
      pct: null,
      pctLabel: null,
      subItems: [],
    },
  ];

  return (
    <div className="mb-6">
      {/* Section title */}
      <div className="flex items-center gap-2 mb-2">
        <div className="h-0.5 flex-1 rounded-full" style={{ backgroundColor: color + '20' }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: color + '99' }}>
          Indicadores {sStepData.name}
        </span>
        <div className="h-0.5 flex-1 rounded-full" style={{ backgroundColor: color + '20' }} />
      </div>

      {/* Indicators grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {indicators.map((ind) => {
          const IconComp = ind.icon;
          const isEmpty = ind.value === 0 || ind.displayValue === '0' || ind.displayValue === '0/0';

          return (
            <div
              key={ind.id}
              className="relative flex flex-col items-center justify-center px-1.5 py-2 rounded-xl border transition-all hover:shadow-md hover:scale-[1.03] cursor-default group"
              style={{
                backgroundColor: isEmpty ? `${color}08` : `${color}15`,
                borderColor: isEmpty ? `${color}20` : `${color}40`,
              }}
            >
              {/* Empty dot */}
              {isEmpty && (
                <div className="absolute top-1 right-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300 opacity-50" />
                </div>
              )}

              {/* Icon + Value */}
              <div className="flex items-center gap-1 mb-0.5">
                <IconComp className="h-3 w-3" style={{ color }} />
                <span className="text-lg font-extrabold leading-none" style={{ color }}>
                  {ind.displayValue}
                </span>
              </div>

              {/* Label */}
              <span className="text-[8px] font-semibold whitespace-nowrap uppercase tracking-wide" style={{ color: color + 'BB' }}>
                {ind.label}
              </span>

              {/* Percentage bar */}
              {ind.pct !== null && (
                <div className="w-full mt-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[7px] text-gray-500">{ind.pctLabel}</span>
                    <span className="text-[8px] font-bold" style={{ color }}>{ind.pct}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: color + '20' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ backgroundColor: color, width: `${ind.pct}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Sub-items for acciones */}
              {ind.id === 'acciones' && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                  {ind.subItems.map((sub) => (
                    <span
                      key={sub.label}
                      className={`text-[7px] font-semibold px-1 py-0.5 rounded border ${sub.bg} ${sub.color}`}
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
    </div>
  );
}
