import { describe, expect, it } from 'vitest';
import { directionsUrl, distanceMeters, isValidLatLng, nearest } from './geo';

describe('distanceMeters', () => {
  it('zéro pour le même point', () => {
    expect(distanceMeters({ lat: 0.39, lng: 9.45 }, { lat: 0.39, lng: 9.45 })).toBe(0);
  });

  it('un millième de degré de latitude ≈ 111 m', () => {
    expect(distanceMeters({ lat: 0.39, lng: 9.45 }, { lat: 0.391, lng: 9.45 })).toBe(111);
  });
});

describe('nearest', () => {
  it('renvoie le lieu le plus proche, ou null sans lieu', () => {
    const places = [
      { id: 'a', lat: 0.4, lng: 9.44 },
      { id: 'b', lat: 0.37, lng: 9.45 },
    ];
    expect(nearest({ lat: 0.372, lng: 9.451 }, places)?.id).toBe('b');
    expect(nearest({ lat: 0, lng: 0 }, [])).toBeNull();
  });
});

describe('isValidLatLng', () => {
  it('refuse ce qui n’est pas une position', () => {
    expect(isValidLatLng({ lat: 0.39, lng: 9.45 })).toBe(true);
    expect(isValidLatLng({ lat: 91, lng: 9.45 })).toBe(false);
    expect(isValidLatLng({ lat: '0.39', lng: 9.45 })).toBe(false);
    expect(isValidLatLng({ lat: Number.NaN, lng: 9.45 })).toBe(false);
  });
});

describe('directionsUrl', () => {
  it('pointe Google Maps vers la position', () => {
    expect(directionsUrl({ lat: 0.4, lng: 9.44 })).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=0.4,9.44',
    );
  });
});
