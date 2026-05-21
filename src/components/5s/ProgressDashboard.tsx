'use client';

import { motion } from 'framer-motion';
import { S_STEPS } from '@/lib/5s-constants';
import { use5SStore } from '@/lib/store';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Target, TrendingUp } from 'lucide-react';
import QuesitoDisplay from './QuesitoDisplay';

export default function ProgressDashboard() {
  const { progress, getCompletedCount, isQuesitoEarned } = use5SStore();
  const { sSteps: completedSSteps, miniSteps: completedMiniSteps, total: totalMiniSteps } = getCompletedCount();
  const overallPercent = totalMiniSteps > 0 ? Math.round((completedMiniSteps / totalMiniSteps) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-purple-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{completedMiniSteps}</p>
              <p className="text-xs text-muted-foreground">Mini-pasos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{completedSSteps}</p>
              <p className="text-xs text-muted-foreground">Quesitos</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold">{overallPercent}%</p>
              <p className="text-xs text-muted-foreground">General</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Overall progress bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progreso General</span>
            <span className="text-sm text-muted-foreground">{completedMiniSteps}/{totalMiniSteps}</span>
          </div>
          <Progress value={overallPercent} className="h-3" />
        </CardContent>
      </Card>

      {/* Per-S progress */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
        {S_STEPS.map((s, i) => {
          const sProgress = progress.filter(p => p.sStep === s.id);
          const sCompleted = sProgress.filter(p => p.completed).length;
          const sPercent = (sCompleted / 5) * 100;
          const earned = isQuesitoEarned(s.id);

          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
            >
              <Card className={`h-full ${earned ? 'border-green-300' : ''}`}>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-xs font-semibold truncate">{s.name}</span>
                    {earned && <span className="text-xs">✅</span>}
                  </div>
                  <Progress value={sPercent} className="h-2 mb-1" />
                  <p className="text-xs text-muted-foreground text-center">
                    {sCompleted}/5
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quesitos display */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Quesitos Obtenidos
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-2">
          <QuesitoDisplay size={100} />
        </CardContent>
        <div className="px-4 pb-3 flex justify-center gap-4 flex-wrap">
          {S_STEPS.map(s => (
            <div key={s.id} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-xs text-muted-foreground">{s.name}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
