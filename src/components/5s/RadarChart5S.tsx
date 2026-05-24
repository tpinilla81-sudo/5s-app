'use client';

import { useEffect, useState } from 'react';
import {
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  Radar, Legend, ResponsiveContainer, Tooltip
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { S_STEPS } from '@/lib/5s-constants';

interface AuditTarget {
  id: string;
  sStep: number;
  objetivo: number;
  min: number;
  max: number;
}

interface AuditScore {
  sStep: number;
  score: number;
}

interface Props {
  projectId: string;
  auditScores?: AuditScore[];
  periodLabel?: string; // e.g. "TRIMESTRE 1"
  compact?: boolean;
}

export default function RadarChart5S({ projectId, auditScores, periodLabel, compact }: Props) {
  const [targets, setTargets] = useState<AuditTarget[]>([]);
  const [scores, setScores] = useState<AuditScore[]>(auditScores || []);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load targets
      const targetsRes = await fetch(`/api/audit-targets?projectId=${projectId}`);
      const targetsJson = await targetsRes.json();
      if (targetsJson.success) {
        setTargets(targetsJson.data);
      }

      // Load latest audit scores if not provided
      if (!auditScores || auditScores.length === 0) {
        const auditRes = await fetch(`/api/audit?projectId=${projectId}&auditType=quarterly`);
        const auditJson = await auditRes.json();
        if (auditJson.success && auditJson.data && auditJson.data.length > 0) {
          // Get the latest quarterly audit per S step
          const latestByS: Record<number, number> = {};
          for (const a of auditJson.data) {
            if (a.sStep >= 1 && a.sStep <= 5 && a.score !== null) {
              // Data is already ordered by auditDate desc, so first one is latest
              if (!(a.sStep in latestByS)) {
                latestByS[a.sStep] = a.score;
              }
            }
          }
          setScores(Object.entries(latestByS).map(([s, score]) => ({ sStep: parseInt(s), score })));
        }
      }
    } catch (error) {
      console.error('Error loading radar data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4 flex justify-center items-center min-h-[300px]">
          <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
        </CardContent>
      </Card>
    );
  }

  // Build chart data
  const targetMap: Record<number, AuditTarget> = {};
  for (const t of targets) {
    targetMap[t.sStep] = t;
  }

  const scoreMap: Record<number, number> = {};
  for (const s of scores) {
    scoreMap[s.sStep] = s.score;
  }

  const chartData = S_STEPS.map(s => {
    const target = targetMap[s.id] || { objetivo: 70, min: 50, max: 100 };
    return {
      subject: s.japaneseName,
      S: `${s.id}S`,
      audit: scoreMap[s.id] !== undefined ? scoreMap[s.id] : 0,
      objetivo: target.objetivo,
      min: target.min,
      max: target.max,
    };
  });

  // Calculate overall result
  const auditValues = chartData.map(d => d.audit).filter(v => v > 0);
  const objetivoValues = chartData.map(d => d.objetivo);
  const minValues = chartData.map(d => d.min);
  const maxValues = chartData.map(d => d.max);

  const avgAudit = auditValues.length > 0
    ? (auditValues.reduce((a, b) => a + b, 0) / auditValues.length)
    : 0;
  const avgObjetivo = objetivoValues.reduce((a, b) => a + b, 0) / objetivoValues.length;
  const avgMin = minValues.reduce((a, b) => a + b, 0) / minValues.length;
  const avgMax = maxValues.reduce((a, b) => a + b, 0) / maxValues.length;

  const periodText = periodLabel || 'T1';

  return (
    <Card className="overflow-hidden shadow-lg">
      {/* Header matching image style */}
      <CardHeader className="pb-2 bg-gradient-to-r from-blue-700 to-indigo-800 text-white">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <span className="uppercase tracking-wide">AUDIT. 5S. {periodText}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-normal opacity-80">RESULTADO</span>
            <span className="text-2xl font-black bg-white/20 rounded-md px-3 py-0.5">
              {avgAudit > 0 ? avgAudit.toFixed(1).replace('.', ',') : '—'}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {/* Two main sections: DATOS (left) + RADARES (right) */}
        <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>

          {/* LEFT: DATOS - Data Table */}
          <div className={`${!compact ? 'border-r border-gray-200' : ''}`}>
            <div className="bg-gray-100 px-3 py-2 text-center border-b border-gray-200">
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                DATOS
              </h3>
              <p className="text-[10px] text-gray-500 font-medium">
                Datos de Evaluación {periodText}
              </p>
            </div>
            <div className="p-3">
              <table className="w-full text-xs border-collapse border-2 border-gray-400">
                <thead>
                  <tr>
                    <th className="border border-gray-400 px-2 py-2 bg-yellow-300 text-left font-black text-gray-800 w-20">
                    </th>
                    {S_STEPS.map(s => (
                      <th key={s.id} className="border border-gray-400 px-2 py-2 bg-yellow-300 text-center font-black text-gray-800">
                        {s.id}S
                      </th>
                    ))}
                    <th className="border border-gray-400 px-2 py-2 bg-yellow-400 text-center font-black text-gray-900">
                      Resultado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* AUDIT row - Gray background */}
                  <tr>
                    <td className="border border-gray-400 px-2 py-2 font-black text-gray-800 bg-gray-300">
                      AUDIT. {periodText}
                    </td>
                    {chartData.map((d, i) => (
                      <td key={i} className="border border-gray-400 px-2 py-2 text-center font-bold text-gray-800 bg-gray-200">
                        {d.audit > 0 ? d.audit.toFixed(1).replace('.', ',') : '—'}
                      </td>
                    ))}
                    <td className="border border-gray-400 px-2 py-2 text-center font-black text-gray-900 bg-gray-300">
                      {avgAudit > 0 ? avgAudit.toFixed(1).replace('.', ',') : '—'}
                    </td>
                  </tr>
                  {/* Objetivo row - White/light background */}
                  <tr>
                    <td className="border border-gray-400 px-2 py-2 font-bold text-red-700 bg-white">
                      Objetivo
                    </td>
                    {chartData.map((d, i) => (
                      <td key={i} className="border border-gray-400 px-2 py-2 text-center font-semibold text-gray-700 bg-white">
                        {d.objetivo}
                      </td>
                    ))}
                    <td className="border border-gray-400 px-2 py-2 text-center font-bold text-gray-800 bg-gray-50">
                      {avgObjetivo.toFixed(0)}
                    </td>
                  </tr>
                  {/* Min row - Red background */}
                  <tr>
                    <td className="border border-gray-400 px-2 py-2 font-bold text-white bg-red-500">
                      Min
                    </td>
                    {chartData.map((d, i) => (
                      <td key={i} className="border border-gray-400 px-2 py-2 text-center font-semibold text-white bg-red-400">
                        {d.min}
                      </td>
                    ))}
                    <td className="border border-gray-400 px-2 py-2 text-center font-bold text-white bg-red-500">
                      {avgMin.toFixed(0)}
                    </td>
                  </tr>
                  {/* Max row - Green background */}
                  <tr>
                    <td className="border border-gray-400 px-2 py-2 font-bold text-white bg-green-600">
                      Max
                    </td>
                    {chartData.map((d, i) => (
                      <td key={i} className="border border-gray-400 px-2 py-2 text-center font-semibold text-white bg-green-500">
                        {d.max}
                      </td>
                    ))}
                    <td className="border border-gray-400 px-2 py-2 text-center font-bold text-white bg-green-600">
                      {avgMax.toFixed(0)}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Score vs Target comparison */}
              {avgAudit > 0 && (
                <div className="mt-3 p-2.5 rounded-lg border-2 text-center" style={{
                  backgroundColor: avgAudit >= avgObjetivo ? '#dcfce7' : avgAudit >= avgMin ? '#fef9c3' : '#fee2e2',
                  borderColor: avgAudit >= avgObjetivo ? '#86efac' : avgAudit >= avgMin ? '#fde047' : '#fca5a5',
                }}>
                  <span className="text-xs font-black" style={{
                    color: avgAudit >= avgObjetivo ? '#15803d' : avgAudit >= avgMin ? '#a16207' : '#dc2626',
                  }}>
                    {avgAudit >= avgObjetivo ? '✓ OBJETIVO ALCANZADO' : avgAudit >= avgMin ? '⚠ POR DEBAJO DEL OBJETIVO' : '✗ POR DEBAJO DEL MÍNIMO'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: RADARES - Radar Chart */}
          <div>
            <div className="bg-gray-100 px-3 py-2 text-center border-b border-gray-200">
              <h3 className="text-xs font-black text-gray-700 uppercase tracking-wider">
                RADARES
              </h3>
              <p className="text-[10px] text-gray-500 font-medium">
                AUDIT. 5S. {periodText}
              </p>
            </div>
            <div className="p-2 flex flex-col items-center justify-center">
              <ResponsiveContainer width={compact ? 260 : 320} height={compact ? 260 : 320}>
                <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="#d1d5db" />
                  <PolarAngleAxis
                    dataKey="S"
                    tick={{ fontSize: 13, fontWeight: 800, fill: '#374151' }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: '#9ca3af' }}
                    tickCount={6}
                  />
                  {/* Max area (green) - outermost */}
                  <Radar
                    name="Max"
                    dataKey="max"
                    stroke="#16a34a"
                    fill="#22c55e"
                    fillOpacity={0.08}
                    strokeWidth={2}
                    strokeDasharray="5 3"
                  />
                  {/* Objetivo (red) */}
                  <Radar
                    name="Objetivo"
                    dataKey="objetivo"
                    stroke="#dc2626"
                    fill="#ef4444"
                    fillOpacity={0.08}
                    strokeWidth={2.5}
                  />
                  {/* Min (red dashed) */}
                  <Radar
                    name="Min"
                    dataKey="min"
                    stroke="#f87171"
                    fill="#fca5a5"
                    fillOpacity={0.06}
                    strokeWidth={1.5}
                    strokeDasharray="4 3"
                  />
                  {/* Actual audit (blue) - innermost */}
                  <Radar
                    name="Auditoría"
                    dataKey="audit"
                    stroke="#2563eb"
                    fill="#3b82f6"
                    fillOpacity={0.3}
                    strokeWidth={3}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}`, name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, fontWeight: 'bold' }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }}
                    iconSize={12}
                  />
                </RadarChart>
              </ResponsiveContainer>

              {/* Result display box like the image */}
              <div className="mt-1 bg-white border-2 border-gray-300 rounded-lg px-6 py-2 shadow-sm text-center">
                <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Resultado</p>
                <p className={`text-2xl font-black ${
                  avgAudit >= avgObjetivo ? 'text-green-600' : avgAudit >= avgMin ? 'text-amber-600' : 'text-red-600'
                }`}>
                  {avgAudit > 0 ? avgAudit.toFixed(1).replace('.', ',') : '—'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
