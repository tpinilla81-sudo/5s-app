'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  Upload,
  X,
  CheckCircle,
  Image as ImageIcon,
  SwitchCamera,
  Video,
  VideoOff,
  Zap,
  GalleryHorizontalEnd,
  Loader2,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { use5SStore } from '@/lib/store';
import { S_STEPS, MIN_PHOTOS, MINI_STEPS } from '@/lib/5s-constants';
import {
  compressImage,
  generatePhotoFilename,
  base64toFile,
  estimateBase64Size,
  formatBytes,
} from '@/lib/image-utils';

interface FotosModalProps {
  open: boolean;
  onClose: () => void;
  sStep: number;
  miniStep: number;
}

const BEFORE_PROMPT_BY_S: Record<number, string> = {
  1: 'Fotografía los elementos innecesarios que hay en la zona. Esto servirá como referencia "ANTES" de la clasificación.',
  2: 'Fotografía cómo está organizada la zona actualmente. Esto servirá como referencia "ANTES" de la reorganización.',
  3: 'Fotografía los puntos de suciedad de la zona. Esto servirá como referencia "ANTES" de la limpieza.',
  4: 'Fotografía el estado actual de la zona. Esto servirá como referencia "ANTES" de la estandarización.',
  5: 'Fotografía el nivel de cumplimiento de los estándares. Esto servirá como referencia "ANTES" de la disciplina.',
};

interface PhotoItem {
  preview: string;
  serverUrl: string;
  uploaded: boolean;
  uploading: boolean;
  estimatedSize: number;
}

export default function FotosModal({ open, onClose, sStep, miniStep }: FotosModalProps) {
  const { fetchProgress, currentUser, adminFreeNavigation, currentProject, currentZone } = use5SStore();
  const sStepData = S_STEPS.find(s => s.id === sStep);
  const miniStepData = MINI_STEPS.find(m => m.id === miniStep);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isAdmin = currentUser?.role === 'admin' && adminFreeNavigation;
  const isResponsable = currentUser?.role === 'responsable';
  const isAuditor = currentUser?.role === 'auditor';
  const isReadOnly = isResponsable || isAuditor || (currentUser?.role === 'admin' && !adminFreeNavigation); // View-only when responsable, auditor, or admin with lock closed

  const [isFullscreen, setIsFullscreen] = useState(true);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [cameraMode, setCameraMode] = useState<'idle' | 'streaming' | 'capturing'>('idle');
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [captureFlash, setCaptureFlash] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');

  const beforePrompt = BEFORE_PROMPT_BY_S[sStep] || 'Fotografía la zona para documentar su estado actual.';

  const uploadPhoto = async (base64Data: string, index: number): Promise<string | null> => {
    try {
      const projectId = currentProject?.id || 'unknown';
      const filename = generatePhotoFilename(projectId, sStep, miniStep, index);
      const file = base64toFile(base64Data, filename);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('filename', filename);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) return data.url;
      return null;
    } catch (error) {
      console.error('Upload error:', error);
      return null;
    }
  };

  const addPhoto = useCallback(async (rawBase64: string) => {
    try {
      const compressed = await compressImage(rawBase64);
      const estimatedSize = estimateBase64Size(compressed);

      const newPhoto: PhotoItem = {
        preview: compressed,
        serverUrl: '',
        uploaded: false,
        uploading: true,
        estimatedSize,
      };

      setPhotos(prev => [...prev, newPhoto]);

      const url = await uploadPhoto(compressed, photos.length);

      setPhotos(prev =>
        prev.map((p, i) =>
          i === prev.length - 1 && p.uploading
            ? { ...p, serverUrl: url || '', uploaded: !!url, uploading: false }
            : p
        )
      );
    } catch (error) {
      console.error('Error processing photo:', error);
    }
  }, [sStep, miniStep, currentProject?.id, photos.length]);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraMode('idle');
  }, [stream]);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      setStream(mediaStream);
      setCameraMode('streaming');
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      if (err.name === 'NotAllowedError') setCameraError('Permiso denegado. Permite el acceso a la cámara.');
      else if (err.name === 'NotFoundError') setCameraError('No se encontró ninguna cámara.');
      else setCameraError('Error al acceder a la cámara. Intenta subir una foto desde tu galería.');
    }
  }, [facingMode]);

  const switchCamera = useCallback(async () => {
    stopStream();
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  }, [stopStream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (facingMode === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0);
    const base64 = canvas.toDataURL('image/jpeg', 0.9);
    setCaptureFlash(true);
    setTimeout(() => setCaptureFlash(false), 300);
    addPhoto(base64);
  }, [facingMode, addPhoto]);

  useEffect(() => {
    if (!open) {
      stopStream();
      setPhotos([]);
      setIsCompleted(false);
      setCameraError(null);
      setCameraMode('idle');
      setActiveTab('camera');
    }
  }, [open, stopStream]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onloadend = async () => { await addPhoto(reader.result as string); };
      reader.readAsDataURL(file);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    for (const file of Array.from(files)) {
      const reader = new FileReader();
      reader.onloadend = async () => { await addPhoto(reader.result as string); };
      reader.readAsDataURL(file);
    }
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const removePhoto = (index: number) => setPhotos(prev => prev.filter((_, i) => i !== index));

  const uploadingCount = photos.filter(p => p.uploading).length;
  const canSubmit = photos.length >= MIN_PHOTOS && uploadingCount === 0;
  const totalSize = photos.reduce((sum, p) => sum + p.estimatedSize, 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const urls = photos.map(p => p.serverUrl || p.preview).join(',');
      const res = await fetch(`/api/progress/step?sStep=${sStep}&miniStep=${miniStep}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, photoUrls: urls, score: 100, projectId: currentProject?.id, zoneId: currentZone?.id || null }),
      });
      const json = await res.json();
      if (json.success) { setIsCompleted(true); stopStream(); await fetchProgress(); }
    } catch (error) {
      console.error('Error submitting photos:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdminSkip = async () => {
    try {
      const res = await fetch(`/api/progress/step?sStep=${sStep}&miniStep=${miniStep}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true, score: 100, notes: 'Completado por administrador (skip)', projectId: currentProject?.id, zoneId: currentZone?.id || null }),
      });
      const json = await res.json();
      if (json.success) { await fetchProgress(); onClose(); }
    } catch (error) { console.error('Error admin skip:', error); }
  };

  const isMobile = typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  return (
    <Dialog open={open} onOpenChange={() => { stopStream(); onClose(); }}>
      <DialogContent size={isFullscreen ? "fullscreen" : "xl"} className="flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" style={{ color: sStepData?.color }} />
            <span>Fotografías (Antes)</span>
            <Badge variant="outline" style={{ borderColor: sStepData?.color, color: sStepData?.color }}>
              {sStepData?.name}
            </Badge>
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="ml-auto p-1 rounded hover:bg-muted transition-colors"
              title={isFullscreen ? "Reducir ventana" : "Pantalla completa"}
            >
              {isFullscreen ? <Minimize2 className="h-4 w-4 text-muted-foreground" /> : <Maximize2 className="h-4 w-4 text-muted-foreground" />}
            </button>
          </DialogTitle>
        </DialogHeader>

        {isAdmin && !isCompleted && (
          <div className="flex items-center gap-2 p-2 mx-6 flex-shrink-0 bg-amber-50 border border-amber-200 rounded-lg">
            <span className="text-xs text-amber-700 font-medium">Modo Admin:</span>
            <Button variant="outline" size="sm" className="text-xs border-amber-300 text-amber-700 hover:bg-amber-100" onClick={handleAdminSkip}>
              Completar paso sin subir fotos
            </Button>
          </div>
        )}

        {isReadOnly && (
          <div className="flex items-center gap-2 p-2 mx-6 flex-shrink-0 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-xs text-blue-700 font-medium">Solo lectura: {currentUser?.role === 'admin' ? 'Activa el candado para poder realizar pasos.' : currentUser?.role === 'auditor' ? 'El auditor puede ver el progreso pero no subir fotos.' : 'El responsable puede ver el progreso pero no realizar pasos.'}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 pb-6 min-h-0">
        {isCompleted ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Fotografías del ANTES Guardadas</h3>
            <p className="text-muted-foreground">Ha guardado {photos.length} fotos como evidencia del estado inicial.</p>
            <p className="text-xs text-muted-foreground mt-2">Tamaño total optimizado: {formatBytes(totalSize)}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg border-l-4" style={{ borderColor: sStepData?.color, backgroundColor: `${sStepData?.color}08` }}>
              <p className="text-sm font-medium" style={{ color: sStepData?.color }}>{sStepData?.japaneseName} — {sStepData?.spanishName}</p>
              <p className="text-sm text-muted-foreground mt-1">{beforePrompt}</p>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Fotos del ANTES</span>
              <div className="flex items-center gap-2">
                <Badge variant={photos.length >= MIN_PHOTOS ? 'default' : 'secondary'}>{photos.length} / {MIN_PHOTOS} mínimo</Badge>
                {totalSize > 0 && <span className="text-xs text-muted-foreground">({formatBytes(totalSize)})</span>}
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-100 rounded-lg">
              <Zap className="h-4 w-4 text-blue-500 shrink-0" />
              <p className="text-xs text-blue-700">Las fotos se comprimen automáticamente (máx. 1200×900px, calidad 70%) para ahorrar espacio. Cada foto optimizada pesa ~80-150KB.</p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex gap-1 p-1 bg-muted rounded-lg">
                  <button className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'camera' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => setActiveTab('camera')}>
                    <Camera className="h-4 w-4" />Hacer foto
                  </button>
                  <button className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'upload' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`} onClick={() => { setActiveTab('upload'); stopStream(); }}>
                    <GalleryHorizontalEnd className="h-4 w-4" />Subir desde galería
                  </button>
                </div>

                {activeTab === 'camera' && (
                  <div className="space-y-3">
                    <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleCameraCapture} />
                    {isMobile && cameraMode === 'idle' && (
                      <div className="space-y-3">
                        <button className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-colors" onClick={() => cameraInputRef.current?.click()}>
                          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${sStepData?.color}20` }}><Zap className="h-7 w-7" style={{ color: sStepData?.color }} /></div>
                          <p className="text-sm font-semibold">Abrir cámara del dispositivo</p>
                          <p className="text-xs text-muted-foreground">Toma fotos directamente con la cámara de tu móvil</p>
                        </button>
                        <button className="w-full flex items-center justify-center gap-2 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors" onClick={() => { if (cameraInputRef.current) { cameraInputRef.current.setAttribute('capture', 'user'); cameraInputRef.current.click(); setTimeout(() => { if (cameraInputRef.current) cameraInputRef.current.setAttribute('capture', 'environment'); }, 500); } }}>
                          <SwitchCamera className="h-3 w-3" />Usar cámara frontal
                        </button>
                      </div>
                    )}
                    {!isMobile && (
                      <div className="space-y-3">
                        {cameraMode === 'idle' && (
                          <button className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-colors" onClick={startCamera}>
                            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${sStepData?.color}20` }}><Video className="h-7 w-7" style={{ color: sStepData?.color }} /></div>
                            <p className="text-sm font-semibold">Activar cámara</p>
                            <p className="text-xs text-muted-foreground">Conecta tu cámara para tomar fotos directamente</p>
                          </button>
                        )}
                        {cameraError && <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{cameraError}</div>}
                        {(cameraMode === 'streaming' || cameraMode === 'capturing') && (
                          <div className="relative rounded-xl overflow-hidden bg-black">
                            {captureFlash && <div className="absolute inset-0 bg-white z-20 animate-pulse" />}
                            <video ref={videoRef} className="w-full aspect-video object-cover" playsInline muted style={facingMode === 'user' ? { transform: 'scaleX(-1)' } : {}} />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
                              <div className="flex items-center justify-center gap-4">
                                <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors" onClick={switchCamera} title="Cambiar cámara"><SwitchCamera className="h-5 w-5 text-white" /></button>
                                <button className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform" style={{ backgroundColor: sStepData?.color || '#3b82f6' }} onClick={capturePhoto}><div className="w-12 h-12 rounded-full bg-white" /></button>
                                <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/30 transition-colors" onClick={stopStream} title="Cerrar cámara"><VideoOff className="h-5 w-5 text-white" /></button>
                              </div>
                            </div>
                            <div className="absolute top-3 left-3 flex items-center gap-2">
                              <div className="flex items-center gap-1.5 bg-red-500/80 backdrop-blur px-2 py-1 rounded-full"><div className="w-2 h-2 bg-white rounded-full animate-pulse" /><span className="text-xs text-white font-medium">EN VIVO</span></div>
                              <span className="text-xs text-white/80 bg-black/40 backdrop-blur px-2 py-1 rounded-full">{facingMode === 'user' ? 'Frontal' : 'Trasera'}</span>
                            </div>
                          </div>
                        )}
                        <canvas ref={canvasRef} className="hidden" />
                        {cameraError && <Button variant="outline" size="sm" onClick={startCamera} className="w-full"><Video className="h-4 w-4 mr-2" />Reintentar conexión con cámara</Button>}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'upload' && (
                  <div>
                    <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileSelect} />
                    <button className="w-full border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-muted/30 transition-colors" onClick={() => fileInputRef.current?.click()}>
                      <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ backgroundColor: `${sStepData?.color}20` }}><Upload className="h-7 w-7" style={{ color: sStepData?.color }} /></div>
                      <p className="text-sm font-semibold">Seleccionar fotos de la galería</p>
                      <p className="text-xs text-muted-foreground">Soporta JPG, PNG, GIF — Se comprimen automáticamente al subir</p>
                    </button>
                  </div>
                )}
              </CardContent>
            </Card>

            {photos.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Fotos capturadas</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{photos.length} foto{photos.length !== 1 ? 's' : ''}</span>
                    {uploadingCount > 0 && <span className="text-xs text-blue-500 flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Subiendo {uploadingCount}...</span>}
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden border-2 border-muted bg-muted">
                        <img src={photo.preview} alt={`Antes ${index + 1}`} className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: sStepData?.color }}>{index + 1}</div>
                      <div className="absolute top-1.5 right-1.5">
                        {photo.uploading ? <div className="w-5 h-5 rounded-full bg-blue-500/80 flex items-center justify-center"><Loader2 className="h-3 w-3 text-white animate-spin" /></div>
                        : photo.uploaded ? <div className="w-5 h-5 rounded-full bg-green-500/80 flex items-center justify-center"><CheckCircle className="h-3 w-3 text-white" /></div> : null}
                      </div>
                      <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-full">{formatBytes(photo.estimatedSize)}</div>
                      <button className="absolute -top-2 -right-2 w-7 h-7 bg-destructive text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600" onClick={() => removePhoto(index)} title="Eliminar foto"><X className="h-3.5 w-3.5" /></button>
                    </div>
                  ))}
                  <button className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-1 hover:border-primary/50 hover:bg-muted/20 transition-colors" onClick={() => { if (isMobile) { cameraInputRef.current?.click(); } else { setActiveTab('camera'); if (cameraMode === 'idle') startCamera(); } }}>
                    <Camera className="h-6 w-6 text-muted-foreground/50" />
                    <span className="text-[10px] text-muted-foreground/70 font-medium">Añadir</span>
                  </button>
                </div>
              </div>
            )}

            {photos.length === 0 && (
              <div className="text-center py-4 text-muted-foreground">
                <ImageIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay fotos del ANTES aún</p>
                <p className="text-xs mt-1">Usa la cámara o sube fotos de tu galería</p>
              </div>
            )}

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• Mínimo {MIN_PHOTOS} fotos del estado ANTES de la zona</p>
              <p>• Las fotos se comprimen automáticamente para ahorrar espacio</p>
              <p>• Incluya diferentes ángulos y perspectivas de la zona</p>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSubmit} disabled={!canSubmit || isSubmitting || isReadOnly} style={canSubmit && !isReadOnly ? { backgroundColor: sStepData?.color } : undefined} className="gap-2">
                {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" />Guardando...</> : <><CheckCircle className="h-4 w-4" />Guardar Fotos ANTES ({photos.length} foto{photos.length !== 1 ? 's' : ''})</>}
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
