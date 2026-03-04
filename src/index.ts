
/**
 * WiFi MLS Location Proof Plugin
 *
 * Scans nearby WiFi APs and resolves coordinates via Mozilla Location Service.
 * Requires nmcli (Linux) or airport (macOS).
 *
 * NOTE: MLS may be deprecated. This plugin demonstrates the WiFi geolocation
 * pattern. Future plugins could target Google Geolocation API, Unwired Labs, etc.
 *
 * Usage:
 * ```typescript
 * import { WifiMlsPlugin } from '@location-proofs/plugin-wifi-mls';
 *
 * const plugin = new WifiMlsPlugin();
 * const sdk = new AstralSDK({ chainId: 11155111 });
 * sdk.plugins.register(plugin);
 * ```
 */

import { ethers } from 'ethers';
import type {
  LocationProofPlugin,
  Runtime,
  RawSignals,
  UnsignedLocationStamp,
  LocationStamp,
  StampSigner,
  StampVerificationResult,
  CollectOptions,
} from '@decentralized-geo/astral-sdk/plugins';
import type { WifiMlsPluginOptions } from './types';
import { collectWifi } from './collect';
import { createStampFromSignals } from './create';
import { signStamp } from './sign';
import { verifyWifiMlsStamp } from './verify';

export class WifiMlsPlugin implements LocationProofPlugin {
  readonly name = 'wifi-mls';
  readonly version = '0.1.0';
  readonly runtimes: Runtime[] = ['node'];
  readonly requiredCapabilities: string[] = [];
  readonly description =
    'WiFi AP scan + MLS plugin — scans nearby access points and resolves ' +
    'coordinates via Mozilla Location Service. Linux (nmcli) and macOS (airport).';

  private readonly timeoutMs: number;
  private readonly durationSeconds: number;
  private readonly wallet: ethers.Wallet | ethers.HDNodeWallet;

  constructor(options: WifiMlsPluginOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 8000;
    this.durationSeconds = options.durationSeconds ?? 60;
    this.wallet = options.privateKey
      ? new ethers.Wallet(options.privateKey)
      : ethers.Wallet.createRandom();
  }

  async collect(_options?: CollectOptions): Promise<RawSignals> {
    return collectWifi(this.timeoutMs);
  }

  async create(signals: RawSignals): Promise<UnsignedLocationStamp> {
    return createStampFromSignals(signals, this.version, this.durationSeconds);
  }

  async sign(stamp: UnsignedLocationStamp, signer?: StampSigner): Promise<LocationStamp> {
    return signStamp(stamp, this.wallet, signer);
  }

  async verify(stamp: LocationStamp): Promise<StampVerificationResult> {
    return verifyWifiMlsStamp(stamp);
  }
}

export type { WifiReading, AccessPoint, WifiMlsPluginOptions } from './types';
export { collectWifi, readWifi } from './collect';
export { createStampFromSignals } from './create';
export { signStamp } from './sign';
export { verifyWifiMlsStamp } from './verify';
export { canonicalize } from './canonicalize';
