'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api } from '@/lib/api';
import { nearest, type LatLng } from '@/lib/geo';

// Position du visiteur : GPS sur demande (« près de vous » = position
// actuelle), sinon le quartier choisi. Gardée dans ce navigateur seulement
// (30 min pour le GPS) ; jamais envoyée au serveur pour être stockée.

export interface DistrictOption {
  id: string;
  slug: string;
  name: string;
  lat: number;
  lng: number;
}

type Status = 'idle' | 'locating' | 'ready' | 'denied' | 'error';

interface Saved {
  lat: number;
  lng: number;
  label: string;
  districtId: string | null;
  source: 'gps' | 'district';
  at: number;
}

interface LocationValue {
  status: Status;
  position: LatLng | null;
  label: string | null;
  districtId: string | null;
  source: 'gps' | 'district' | null;
  districts: DistrictOption[];
  requestGps: () => void;
  chooseDistrict: (id: string) => void;
}

const STORAGE_KEY = 'iwadu-position';
const GPS_TTL_MS = 30 * 60 * 1000;
const LocationContext = createContext<LocationValue | null>(null);

function readSaved(): Saved | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Saved;
    if (s.source === 'gps' && Date.now() - s.at > GPS_TTL_MS) return null;
    return typeof s.lat === 'number' && typeof s.lng === 'number' ? s : null;
  } catch {
    return null;
  }
}

function save(s: Saved): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    // stockage indisponible (navigation privée) : la position vit en mémoire
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [districts, setDistricts] = useState<DistrictOption[]>([]);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    api<{ districts: DistrictOption[] }>('/api/districts')
      .then((r) => setDistricts(r.districts))
      .catch(() => setDistricts([]));
  }, []);

  const requestGps = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('denied');
      return;
    }
    setStatus('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const next: Saved = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          label: 'Près de votre position',
          districtId: null,
          source: 'gps',
          at: Date.now(),
        };
        setSaved(next);
        save(next);
        setStatus('ready');
      },
      (err) => setStatus(err.code === err.PERMISSION_DENIED ? 'denied' : 'error'),
      { enableHighAccuracy: false, timeout: 12_000, maximumAge: 5 * 60_000 },
    );
  }, []);

  useEffect(() => {
    const s = readSaved();
    if (s) {
      setSaved(s);
      setStatus('ready');
      return;
    }
    // Déjà autorisé : on localise sans redemander.
    navigator.permissions
      ?.query({ name: 'geolocation' })
      .then((p) => {
        if (p.state === 'granted') requestGps();
      })
      .catch(() => undefined);
  }, [requestGps]);

  const chooseDistrict = useCallback(
    (id: string) => {
      const d = districts.find((x) => x.id === id);
      if (!d) return;
      const next: Saved = {
        lat: d.lat,
        lng: d.lng,
        label: `Quartier : ${d.name}`,
        districtId: d.id,
        source: 'district',
        at: Date.now(),
      };
      setSaved(next);
      save(next);
      setStatus('ready');
    },
    [districts],
  );

  const value = useMemo<LocationValue>(() => {
    const position = saved ? { lat: saved.lat, lng: saved.lng } : null;
    const districtId =
      saved?.districtId ??
      (position && districts.length ? (nearest(position, districts)?.id ?? null) : null);
    return {
      status,
      position: status === 'ready' ? position : null,
      label: status === 'ready' ? (saved?.label ?? null) : null,
      districtId,
      source: saved?.source ?? null,
      districts,
      requestGps,
      chooseDistrict,
    };
  }, [saved, status, districts, requestGps, chooseDistrict]);

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
}

export function useLocation(): LocationValue {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation doit être utilisé dans <LocationProvider>');
  return ctx;
}
