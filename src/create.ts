
import type { RawSignals, UnsignedLocationStamp } from '@decentralized-geo/astral-sdk/plugins';
import type { WifiReading } from './types';

/**
 * Build an UnsignedLocationStamp from collected WiFi MLS signals.
 */
export function createStampFromSignals(
  signals: RawSignals,
  pluginVersion: string,
  durationSeconds: number
): UnsignedLocationStamp {
  const reading = signals.data as unknown as WifiReading;
  const now = signals.timestamp;

  return {
    lpVersion: '0.2',
    locationType: 'geojson-point',
    location: {
      type: 'Point',
      coordinates: [reading.lon, reading.lat],
    },
    srs: 'EPSG:4326',
    temporalFootprint: {
      start: now,
      end: now + durationSeconds,
    },
    plugin: 'wifi-mls',
    pluginVersion,
    signals: {
      source: reading.source,
      accuracyMeters: reading.accuracyMeters,
      apCount: reading.apCount,
      lat: reading.lat,
      lon: reading.lon,
    },
  };
}
