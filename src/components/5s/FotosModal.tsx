'use client';

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Camera, Upload, X, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { use5SStore } from '@/lib/store';
import { S_STEPS, MIN_PHOTOS, MINI_STEPS } from '@/lib/5s-constants';

interface FotosModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

/** S-specific prompts for the photo upload area */
const BEFORE_PROMPT_BY_S: Record<number, string> = {
  1: 'Fotografía los elementos innecesarios que hay en la zona. Esto servirá como referencia "ANTES" de la clasificación.',
  2: 'Fotografía cómo está organizada la zona actualmente. Esto servirá como referencia "ANTES" de la reorganización.',
  3: 'Fotografía los puntos de suciedad de la zona. Esto servirá como referencia "ANTES" de la limpieza.',
  4: 'Fotografía el estado actual de la zona. Esto servirá como referencia "ANTES" de la estandarización.',
  5: 'Fotografía el nivel de cumplimiento de los estándares. Esto servirá como referencia "ANTES" de la disciplina.',
};

export default function FotosModal({ open, onClose, sStep, miniStep }: FotosModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const miniStepData = MINI_STEPS.find(m => m.id === miniStep);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAdmin = currentUser?.role === 'admin' && adminFreeNavigation;

  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const sDescription = miniStepData?.descriptionByS?.[sStep] || miniStepData?.description || '';
  const beforePrompt = BEFORE_PROMPT_BY_S[sStep] || 'Fotografía la zona para documentar su estado actual.';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setBeforePhotos(prev => [...prev, base64]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (index: number) => {
    setBeforePhotos(prev => prev.filter((_, i) => i !== index));
  };

  const canSubmit = beforePhotos.length >= MIN_PHOTOS;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const photoUrls = beforePhotos.join(',');
      const res = await fetch(`/api/progress/${sStep}/${miniStep}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: true,
          photoUrls,
          score: 100,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsCompleted(true);
        await fetchProgress();
      }
    } catch (error) {
      console.error('Error submitting photos:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminSkip = async () => {
    try {
      const res = await fetch(`/api/progress/${sStep}/${miniStep}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, score: 100, notes: 'Completado por administrador (skip)' }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchProgress();
        onClose();
      }
    } catch (error) {
      console.error('Error admin skip:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>Fotografías (Antes)</span>
            <Badge variant="outline" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
              {sStepData?.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isAdmin && !isCompleted && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-xs text-amber-700 font-medium">Modo Admin:</span>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100"
              onClick={handleAdminSkip}
            >
              Completar paso sin subir fotos
            </Button>
          </div>
        )}

        {isCompleted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Fotografías del ANTES Guardadas</h3>
            <p className="text-muted-foreground">
              Ha subido {beforePhotos.length} fotos como evidencia del estado inicial de la zona.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* S-specific instructions */}
            <div className="p-3 rounded-lg border-l-4" style={{ borderColor: sStepData?.color, backgroundColor: `${sStepData?.color}08` }}>
              <p className="text-sm font-medium" style={{ color: sStepData?.color }}>
                {sStepData?.japaneseName} — {sStepData?.spanishName}
              </p>
              <p className="text-sm text-muted-foreground mt-1">{beforePrompt}</p>
            </div>

            {/* Progress indicator */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Fotos del ANTES subidas</span>
              <Badge variant={beforePhotos.length >= MIN_PHOTOS ? 'default' : 'secondary'}>
                {beforePhotos.length} / {MIN_PHOTOS} mínimo
              </Badge>
            </div>

            {/* Upload area */}
            <Card>
              <CardContent className="p-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  className="w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Haga clic para subir fotos del ANTES
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Soporta JPG, PNG, GIF — Mínimo {MIN_PHOTOS} fotos de la zona
                  </p>
                </button>
              </CardContent>
            </Card>

            {/* Photo previews */}
            {beforePhotos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {beforePhotos.map((photo, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={photo}
                        alt={`Antes ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {beforePhotos.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay fotos del ANTES aún</p>
                <p className="text-xs mt-1">Suba fotografías de la zona para documentar el estado actual</p>
              </div>
            )}

            {/* Requirements */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Mínimo {MIN_PHOTOS} fotos del estado ANTES de la zona</p>
              <p>• Las fotos deben mostrar cómo está la zona antes de actuar</p>
              <p>• Incluya diferentes ángulos y perspectivas de la zona</p>
            </div>

            {/* Submit button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                style={canSubmit ? { backgroundColor: sStepData?.color } : undefined}
              >
                {isSubmitting ? 'Enviando...' : `Guardar Fotos ANTES (${beforePhotos.length} fotos)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
