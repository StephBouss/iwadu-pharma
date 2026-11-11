'use client';

// Fichier déposé sur l'accueil (ordinateur) : gardé le temps d'ouvrir la page
// « Votre ordonnance », dans la mémoire de l'onglet seulement. Il n'est
// jamais envoyé tel quel : il sera recadré puis allégé avant la lecture.

const KEY = 'iwadu:fichier-depose';
const MAX_BYTES = 8 * 1024 * 1024;

export async function keepPendingFile(file: File): Promise<boolean> {
  if (file.size > MAX_BYTES) return false;
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ name: file.name, type: file.type, data }));
    return true;
  } catch {
    return false;
  }
}

export async function takePendingFile(): Promise<File | null> {
  let raw: string | null = null;
  try {
    raw = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const { name, type, data } = JSON.parse(raw) as { name: string; type: string; data: string };
    const blob = await (await fetch(data)).blob();
    return new File([blob], name, { type });
  } catch {
    return null;
  }
}
