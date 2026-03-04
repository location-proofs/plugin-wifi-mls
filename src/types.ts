
/**
 * WiFi reading resolved via Mozilla Location Service.
 */
export interface WifiReading {
  source: 'wifi';
  lat: number;
  lon: number;
  accuracyMeters: number;
  timestamp: number;
  /** Number of APs used for resolution */
  apCount: number;
}

export interface AccessPoint {
  macAddress: string;
  signalStrength: number;
}

export interface WifiMlsPluginOptions {
  /** Per-step timeout in milliseconds (default: 8000) */
  timeoutMs?: number;
  /** Deterministic private key for signing. If omitted, generates a random wallet. */
  privateKey?: string;
  /** Duration of temporal footprint in seconds (default: 60) */
  durationSeconds?: number;
}
