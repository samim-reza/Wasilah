import { isValidCoordinates, needsRefresh, toCoarse } from '@/features/prayer/utils/coordinates';

describe('toCoarse', () => {
  it('rounds to roughly 11km, so a precise position is never retained', () => {
    const coarse = toCoarse(23.810331, 90.412521);
    expect(coarse).toEqual({ latitude: 23.8, longitude: 90.4 });
  });

  it('handles negative coordinates', () => {
    expect(toCoarse(-33.86882, 151.20929)).toEqual({ latitude: -33.9, longitude: 151.2 });
  });

  it('is idempotent', () => {
    const once = toCoarse(23.810331, 90.412521);
    expect(toCoarse(once.latitude, once.longitude)).toEqual(once);
  });
});

describe('isValidCoordinates', () => {
  it('rejects null and out-of-range values', () => {
    expect(isValidCoordinates(null)).toBe(false);
    expect(isValidCoordinates({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidCoordinates({ latitude: 0, longitude: 181 })).toBe(false);
    expect(isValidCoordinates({ latitude: Number.NaN, longitude: 0 })).toBe(false);
  });

  it('accepts a valid position', () => {
    expect(isValidCoordinates({ latitude: 23.8, longitude: 90.4 })).toBe(true);
  });
});

describe('needsRefresh', () => {
  it('always refreshes when nothing is stored', () => {
    expect(needsRefresh(null, { latitude: 23.8, longitude: 90.4 })).toBe(true);
  });

  it('ignores movement within the same city', () => {
    expect(
      needsRefresh({ latitude: 23.8, longitude: 90.4 }, { latitude: 23.9, longitude: 90.5 }),
    ).toBe(false);
  });

  it('refreshes after real travel', () => {
    expect(
      needsRefresh({ latitude: 23.8, longitude: 90.4 }, { latitude: 51.5, longitude: -0.1 }),
    ).toBe(true);
  });
});
