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
  periodLabel?: string; // e.g. "Trimestre 1"
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
      <Card>
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
        <CardTitle className="text-sm font-bold flex items-center justify-between">
          <span>AUDIT. 5S{periodLabel ? `. ${periodLabel}` : ''}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-normal opacity-80">RESULTADO</span>
            <span className="text-xl font-black">{avgAudit > 0 ? avgAudit.toFixed(1) : '—'}</span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
          {/* Left: Radar Chart */}
          <div className="flex justify-center">
            <ResponsiveContainer width={compact ? 280 : 320} height={compact ? 280 : 320}>
              <RadarChart data={chartData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis
                  dataKey="S"
                  tick={{ fontSize: 12, fontWeight: 600, fill: '#374151' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fontSize: 9, fill: '#9ca3af' }}
                  tickCount={6}
                />
                {/* Max area (purple) - outermost */}
                <Radar
                  name="Máx"
                  dataKey="max"
                  stroke="#8B5CF6"
                  fill="#8B5CF6"
                  fillOpacity={0.08}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
                {/* Objetivo (red) */}
                <Radar
                  name="Objetivo"
                  dataKey="objetivo"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.08}
                  strokeWidth={2}
                />
                {/* Min (green) */}
                <Radar
                  name="Mín"
                  dataKey="min"
                  stroke="#22C55E"
                  fill="#22C55E"
                  fillOpacity={0.08}
                  strokeWidth={1.5}
                  strokeDasharray="4 2"
                />
                {/* Actual audit (blue) - innermost */}
                <Radar
                  name="Auditoría"
                  dataKey="audit"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.25}
                  strokeWidth={2.5}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [`${value}`, name]}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  iconSize={10}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Right: Data Table */}
          <div>
            <h3 className="text-xs font-bold text-gray-600 uppercase mb-2 text-center">
              Datos de Evaluación{periodLabel ? ` ${periodLabel}` : ''}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="border border-gray-300 px-2 py-1.5 bg-gray-100 text-left font-semibold"></th>
                    {S_STEPS.map(s => (
                      <th key={s.id} className="border border-gray-300 px-2 py-1.5 bg-gray-100 text-center font-semibold" style={{ color: s.color }}>
                        {s.id}S
                      </th>
                    ))}
                    <th className="border border-gray-300 px-2 py-1.5 bg-gray-200 text-center font-bold">
                      Resultado
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Audit row */}
                  <tr className="bg-blue-50">
                    <td className="border border-gray-300 px-2 py-1.5 font-semibold text-blue-700">AUDIT.</td>
                    {chartData.map((d, i) => (
                      <td key={i} className="border border-gray-300 px-2 py-1.5 text-center font-bold text-blue-700">
                        {d.audit > 0 ? d.audit.toFixed(1) : '—'}
                      </td>
                    ))}
                    <td className="border border-gray-300 px-2 py-1.5 text-center font-black text-blue-800 bg-blue-100">
                      {avgAudit > 0 ? avgAudit.toFixed(1) : '—'}
                    </td>
                  </tr>
                  {/* Objetivo row */}
                  <tr className="bg-yellow-50">
                    <td className="border border-gray-300 px-2 py-1.5 font-semibold text-amber-700">Objetivo</td>
                    {chartData.map((d, i) => (
                      <td key={i} className="border border-gray-300 px-2 py-1.5 text-center font-medium text-amber-700">
                        {d.objetivo}
                      </td>
                    ))}
                    <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-amber-800 bg-yellow-100">
                      {avgObjetivo.toFixed(0)}
                    </td>
                  </tr>
                  {/* Min row */}
                  <tr className="bg-green-50">
                    <td className="border border-gray-300 px-2 py-1.5 font-semibold text-green-700">Mín</td>
                    {chartData.map((d, i) => (
                      <td key={i} className="border border-gray-300 px-2 py-1.5 text-center font-medium text-green-700">
                        {d.min}
                      </td>
                    ))}
                    <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-green-800 bg-green-100">
                      {avgMin.toFixed(0)}
                    </td>
                  </tr>
                  {/* Max row */}
                  <tr className="bg-purple-50">
                    <td className="border border-gray-300 px-2 py-1.5 font-semibold text-purple-700">Máx</td>
                    {chartData.map((d, i) => (
                      <td key={i} className="border border-gray-300 px-2 py-1.5 text-center font-medium text-purple-700">
                        {d.max}
                      </td>
                    ))}
                    <td className="border border-gray-300 px-2 py-1.5 text-center font-bold text-purple-800 bg-purple-100">
                      {avgMax.toFixed(0)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Score vs Target comparison */}
            {avgAudit > 0 && (
              <div className="mt-3 p-2 rounded-lg border text-center" style={{
                backgroundColor: avgAudit >= avgObjetivo ? '#f0fdf4' : avgAudit >= avgMin ? '#fffbeb' : '#fef2f2',
                borderColor: avgAudit >= avgObjetivo ? '#bbf7d0' : avgAudit >= avgMin ? '#fde68a' : '#fecaca',
              }}>
                <span className="text-xs font-semibold" style={{
                  color: avgAudit >= avgObjetivo ? '#16a34a' : avgAudit >= avgMin ? '#d97706' : '#dc2626',
                }}>
                  {avgAudit >= avgObjetivo ? '✓ Objetivo alcanzado' : avgAudit >= avgMin ? '⚠ Por debajo del objetivo' : '✗ Por debajo del mínimo'}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
