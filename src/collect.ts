
/**
 * WiFi-based location collector
 *
 * Scans for nearby WiFi access points using native OS tools:
 *   Linux:  nmcli (NetworkManager CLI)
 *   macOS:  airport utility (Apple80211 private framework)
 *
 * AP data (BSSID + signal strength) is resolved to coordinates via the
 * Mozilla Location Service (MLS) — an open, free geolocation API.
 * Typical accuracy: 20-200 meters depending on AP density.
 *
 * NOTE: MLS may be deprecated. This plugin demonstrates the WiFi geolocation
 * pattern. Future plugins could target Google Geolocation API, Unwired Labs, etc.
 */

import { execFile } from 'child_process';
import { promisify } from 'util';
import type { RawSignals } from '@decentralized-geo/astral-sdk/plugins';
import type { WifiReading, AccessPoint } from './types';

const execFileAsync = promisify(execFile);

const MLS_ENDPOINT = 'https://location.services.mozilla.com/v1/geolocate?key=geoclue';

const AIRPORT_BIN =
  '/System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport';

/**
 * Collect WiFi-based location via AP scan + MLS resolution.
 * Throws if no APs found or MLS resolution fails.
 */
export async function collectWifi(timeoutMs = 8000): Promise<RawSignals> {
  const reading = await readWifi(timeoutMs);

  if (!reading) {
    throw new Error(
      'wifi-mls: no WiFi location available. ' +
        'Ensure nmcli (Linux) or airport (macOS) is available and WiFi APs are in range.'
    );
  }

  return {
    plugin: 'wifi-mls',
    timestamp: reading.timestamp,
    data: reading as unknown as Record<string, unknown>,
  };
}

// ---------------------------------------------------------------------------
// Platform-specific AP scanning
// ---------------------------------------------------------------------------

export async function scanLinux(timeoutMs: number): Promise<AccessPoint[]> {
  const { stdout } = await execFileAsync(
    'nmcli',
    ['-t', '-f', 'BSSID,SIGNAL', 'dev', 'wifi', 'list'],
    { timeout: timeoutMs }
  );

  return stdout
    .trim()
    .split('\n')
    .flatMap(line => {
      const parts = line.split(':');
      if (parts.length < 7) return [];
      const signal = parseInt(parts[parts.length - 1], 10);
      const mac = parts.slice(0, 6).join(':').replace(/\\/g, '');
      if (isNaN(signal) || !mac) return [];
      // MLS expects dBm; nmcli reports 0-100 signal quality
      const dBm = signal / 2 - 100;
      return [{ macAddress: mac, signalStrength: dBm }];
    });
}

export async function scanMacos(timeoutMs: number): Promise<AccessPoint[]> {
  const { stdout } = await execFileAsync(AIRPORT_BIN, ['-s'], { timeout: timeoutMs });

  return stdout
    .trim()
    .split('\n')
    .slice(1) // skip header
    .flatMap(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 3) return [];
      const mac = parts[1];
      const rssi = parseInt(parts[2], 10);
      if (!mac || isNaN(rssi)) return [];
      return [{ macAddress: mac, signalStrength: rssi }];
    });
}

// ---------------------------------------------------------------------------
// MLS resolution
// ---------------------------------------------------------------------------

export async function resolveViaMLS(
  aps: AccessPoint[],
  timeoutMs: number
): Promise<{ lat: number; lon: number; accuracy: number } | null> {
  if (aps.length === 0) return null;

  const body = JSON.stringify({ wifiAccessPoints: aps.slice(0, 20) });

  const res = await fetch(MLS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    location?: { lat: number; lng: number };
    accuracy?: number;
  };
  if (!data.location) return null;

  return {
    lat: data.location.lat,
    lon: data.location.lng,
    accuracy: data.accuracy ?? 200,
  };
}

// ---------------------------------------------------------------------------
// Public collector
// ---------------------------------------------------------------------------

export async function readWifi(timeoutMs = 8000): Promise<WifiReading | null> {
  let aps: AccessPoint[] = [];

  try {
    if (process.platform === 'linux') {
      aps = await scanLinux(timeoutMs);
    } else if (process.platform === 'darwin') {
      aps = await scanMacos(timeoutMs);
    } else {
      return null;
    }
  } catch {
    return null;
  }

  if (aps.length === 0) return null;

  const resolved = await resolveViaMLS(aps, timeoutMs);
  if (!resolved) return null;

  return {
    source: 'wifi',
    lat: resolved.lat,
    lon: resolved.lon,
    accuracyMeters: resolved.accuracy,
    timestamp: Math.floor(Date.now() / 1000),
    apCount: aps.length,
  };
}
