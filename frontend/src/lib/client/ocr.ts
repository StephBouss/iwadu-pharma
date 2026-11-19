// Lecture du texte d'une photo DANS le téléphone, sans IA ni service
// extérieur : Tesseract (logiciel libre), langue française. Le moteur et la
// langue sont servis par le site (public/tesseract, copiés par
// scripts/copy-tesseract.mjs), téléchargés au premier usage puis gardés en
// cache par le navigateur. Chargé seulement quand un patient fait lire une
// photo : la page d'accueil n'en paie pas le poids.

export interface DeviceReading {
  text: string;
  durationMs: number;
}

export async function readTextOnDevice(
  image: HTMLCanvasElement,
  onProgress?: (ratio: number) => void,
): Promise<DeviceReading> {
  const started = performance.now();
  const { createWorker, OEM, PSM } = await import('tesseract.js');
  const worker = await createWorker('fra', OEM.LSTM_ONLY, {
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract',
    langPath: '/tesseract/lang',
    workerBlobURL: false,
    logger: (m) => {
      if (m.status === 'recognizing text') onProgress?.(m.progress);
    },
  });
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: '1',
    });
    const { data } = await worker.recognize(image);
    return { text: data.text ?? '', durationMs: Math.round(performance.now() - started) };
  } finally {
    await worker.terminate();
  }
}
