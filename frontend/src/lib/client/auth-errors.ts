import { ApiError } from '@/lib/api';

// Codes d'erreur stables des routes d'authentification → phrases en
// français. On compare le code, jamais le message anglais du serveur.

const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'E-mail ou mot de passe incorrect.',
  LOCKED_OUT: 'Trop de tentatives. Réessayez dans quelques minutes.',
  EMAIL_NOT_VERIFIED: 'Confirmez d’abord votre adresse e-mail avec le code reçu.',
  ACCOUNT_SUSPENDED: 'Ce compte est suspendu. Contactez-nous.',
  PASSWORD_BANNED: 'Ce mot de passe est trop courant. Choisissez-en un autre.',
  PASSWORD_TOO_SHORT: 'Mot de passe trop court.',
  PASSWORD_PWNED: 'Ce mot de passe a fuité sur Internet. Choisissez-en un autre.',
  VERIFICATION_CODE_INVALID: 'Code incorrect. Vérifiez-le et réessayez.',
  VERIFICATION_CODE_EXPIRED: 'Ce code a expiré. Demandez-en un nouveau.',
  VALIDATION_FAILED: 'Vérifiez les champs du formulaire.',
  RATE_LIMITED: 'Trop de tentatives. Patientez un peu.',
  TOO_MANY_REQUESTS: 'Trop de tentatives. Patientez un peu.',
  RATE_LIMIT_UNAVAILABLE: 'Service momentanément indisponible. Réessayez.',
  'Invalid CSRF token': 'La page a expiré. Rechargez-la, puis réessayez.',
};

export function authErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.code && MESSAGES[err.code]) return MESSAGES[err.code]!;
    if (err.status === 429) return MESSAGES.TOO_MANY_REQUESTS!;
    if (err.status === 0) return 'Pas de connexion. Vérifiez votre réseau, puis réessayez.';
  }
  return 'Une erreur est survenue. Réessayez.';
}

/** Retour après connexion : chemin interne uniquement (jamais un autre site). */
export function safeNext(next: string | null | undefined, fallback = '/compte'): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\'))
    return fallback;
  return next;
}
