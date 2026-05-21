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
import { S_STEPS, MIN_PHOTOS } from '@/lib/5s-constants';

interface FotosModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

export default function FotosModal({ open, onClose, sStep, miniStep }: FotosModalProps) {
  const { fetchProgress } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [beforePhotos, setBeforePhotos] = useState<string[]>([]);
  const [afterPhotos, setAfterPhotos] = useState<string[]>([]);
  const [activeSection, setActiveSection] = useState<'before' | 'after'>('before');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const handleFileSelect = (section: 'before' | 'after') => (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (section === 'before') {
          setBeforePhotos(prev => [...prev, base64]);
        } else {
          setAfterPhotos(prev => [...prev, base64]);
        }
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removePhoto = (section: 'before' | 'after', index: number) => {
    if (section === 'before') {
      setBeforePhotos(prev => prev.filter((_, i) => i !== index));
    } else {
      setAfterPhotos(prev => prev.filter((_, i) => i !== index));
    }
  };

  const totalPhotos = beforePhotos.length + afterPhotos.length;
  const canSubmit = totalPhotos >= MIN_PHOTOS && beforePhotos.length > 0 && afterPhotos.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    try {
      const photoUrls = [...beforePhotos, ...afterPhotos].join(',');
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

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>Evidencia Fotográfica</span>
            <Badge variant="outline" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
              {sStepData?.name}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {isCompleted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">¡Evidencia Completada!</h3>
            <p className="text-muted-foreground">
              Ha subido {totalPhotos} fotos como evidencia fotográfica.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress indicator */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Fotos subidas</span>
              <Badge variant={totalPhotos >= MIN_PHOTOS ? 'default' : 'secondary'}>
                {totalPhotos} / {MIN_PHOTOS} mínimo
              </Badge>
            </div>

            {/* Section toggle */}
            <div className="flex gap-2">
              <Button
                variant={activeSection === 'before' ? 'default' : 'outline'}
                onClick={() => setActiveSection('before')}
                className="flex-1"
                style={activeSection === 'before' ? { backgroundColor: sStepData?.color } : undefined}
              >
                📸 Antes ({beforePhotos.length})
              </Button>
              <Button
                variant={activeSection === 'after' ? 'default' : 'outline'}
                onClick={() => setActiveSection('after')}
                className="flex-1"
                style={activeSection === 'after' ? { backgroundColor: sStepData?.color } : undefined}
              >
                ✨ Después ({afterPhotos.length})
              </Button>
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
                  onChange={handleFileSelect(activeSection)}
                />
                <button
                  className="w-full border-2 border-dashed rounded-lg p-8 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm font-medium">
                    Haga clic para subir fotos de {activeSection === 'before' ? 'ANTES' : 'DESPUÉS'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Soporta JPG, PNG, GIF
                  </p>
                </button>
              </CardContent>
            </Card>

            {/* Photo previews */}
            {(activeSection === 'before' ? beforePhotos : afterPhotos).length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(activeSection === 'before' ? beforePhotos : afterPhotos).map((photo, index) => (
                  <div key={index} className="relative group">
                    <div className="aspect-square rounded-lg overflow-hidden border bg-muted">
                      <img
                        src={photo}
                        alt={`${activeSection === 'before' ? 'Antes' : 'Después'} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <button
                      className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removePhoto(activeSection, index)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Empty state */}
            {(activeSection === 'before' ? beforePhotos : afterPhotos).length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay fotos de {activeSection === 'before' ? 'antes' : 'después'} aún</p>
              </div>
            )}

            {/* Requirements */}
            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Mínimo {MIN_PHOTOS} fotos en total (antes y después)</p>
              <p>• Debe subir al menos una foto de antes y una de después</p>
            </div>

            {/* Submit button */}
            <div className="flex justify-end">
              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || isSubmitting}
                style={canSubmit ? { backgroundColor: sStepData?.color } : undefined}
              >
                {isSubmitting ? 'Enviando...' : `Enviar Evidencia (${totalPhotos} fotos)`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
