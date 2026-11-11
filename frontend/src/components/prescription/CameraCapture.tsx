'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Message } from '@/components/ui/Message';
import { DEFAULT_BAND } from '@/lib/client/image';

// Prise de vue (maquette Banani « Capture Camera ») : l'appareil photo du
// téléphone en direct, avec une bande de visée au milieu de l'écran. Seule
// la zone de la bande est gardée. Sans accès à la caméra (refus, ancien
// navigateur), l'appareil photo du système s'ouvre à la place.

export function CameraCapture({
  autoStart,
  onCapture,
  onFile,
}: {
  autoStart: boolean;
  /** Photo prise : la vidéo figée et la zone de la bande. */
  onCapture: (canvas: HTMLCanvasElement) => void;
  /** Photo de l'appareil du système, ou fichier choisi. */
  onFile: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const systemCameraRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<'idle' | 'starting' | 'live' | 'unavailable'>('idle');

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState('unavailable');
      systemCameraRef.current?.click();
      return;
    }
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setState('live');
    } catch {
      setState('unavailable');
    }
  }, []);

  useEffect(() => {
    if (autoStart) void start();
    return stop;
  }, [autoStart, start, stop]);

  function shoot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')?.drawImage(video, 0, 0);
    stop();
    setState('idle');
    onCapture(canvas);
  }

  const band = DEFAULT_BAND;

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={systemCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = '';
        }}
      />

      <div className="relative aspect-3/4 w-full overflow-hidden rounded-[1.25rem] bg-ink sm:aspect-4/3">
        <video
          ref={videoRef}
          playsInline
          muted
          className={state === 'live' ? 'absolute inset-0 size-full object-cover' : 'hidden'}
        />
        {/* Grille de visée et bande : seule la bande est gardée. */}
        <svg aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-20">
          <defs>
            <pattern id="visee" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#6fdcc0" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#visee)" />
        </svg>
        <div
          aria-hidden
          className="pointer-events-none absolute rounded-field border-[3px] border-mint shadow-[0_0_0_100vmax_rgb(2_25_22/0.55)]"
          style={{
            left: `${band.x * 100}%`,
            top: `${band.y * 100}%`,
            width: `${band.w * 100}%`,
            height: `${band.h * 100}%`,
          }}
        />
        <p className="type-caption pointer-events-none absolute inset-x-4 top-4 text-center text-surface">
          Placez seulement la liste des médicaments dans le cadre
        </p>

        {state !== 'live' && (
          <div className="absolute inset-x-4 bottom-1/2 flex translate-y-1/2 flex-col items-center gap-3">
            <Button
              tone="dark"
              size="lg"
              loading={state === 'starting'}
              leadingIcon={<Camera aria-hidden />}
              onClick={() => void start()}
            >
              {state === 'starting' ? 'Ouverture de l’appareil photo…' : 'Ouvrir l’appareil photo'}
            </Button>
          </div>
        )}

        {state === 'live' && (
          <div className="absolute inset-x-0 bottom-0 flex h-24 items-center justify-between bg-linear-to-b from-transparent to-ink/60 px-8">
            <button
              type="button"
              onClick={() => {
                stop();
                setState('idle');
                fileRef.current?.click();
              }}
              aria-label="Importer un fichier"
              className="flex size-12 items-center justify-center rounded-field border border-surface/30 bg-surface/14 text-surface"
            >
              <ImagePlus aria-hidden className="size-5" />
            </button>
            <button
              type="button"
              onClick={shoot}
              aria-label="Prendre la photo"
              className="size-18 rounded-full border-4 border-surface/70 bg-mint focus-visible:outline-mint"
            />
            <span className="size-12" aria-hidden />
          </div>
        )}
      </div>

      {state === 'unavailable' && (
        <Message tone="info" title="L’appareil photo du site n’est pas accessible.">
          <button
            type="button"
            className="font-semibold text-action hover:underline"
            onClick={() => systemCameraRef.current?.click()}
          >
            Prendre la photo avec l’appareil du téléphone
          </button>
        </Message>
      )}

      <Button
        variant="ghost"
        fullWidth
        leadingIcon={<ImagePlus aria-hidden />}
        onClick={() => fileRef.current?.click()}
      >
        Importer un fichier (JPG, PNG, WebP ou PDF)
      </Button>
    </div>
  );
}
