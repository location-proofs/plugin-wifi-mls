# @location-proofs/plugin-wifi-mls

WiFi AP scan + Mozilla Location Service proof plugin for [Astral Protocol](https://astral.global).

Scans nearby WiFi access points and resolves coordinates via the [Mozilla Location Service](https://location.services.mozilla.com/) (MLS) API.

> **Note:** MLS may be deprecated. This plugin demonstrates the WiFi geolocation pattern. Future plugins could target Google Geolocation API, Unwired Labs, or similar services.

## Requirements

- Node.js 18+
- Linux with `nmcli` or macOS with `airport` utility
- Network access to MLS endpoint

## Install

```bash
npm install @location-proofs/plugin-wifi-mls @decentralized-geo/astral-sdk ethers
```

## Usage

```typescript
import { AstralSDK } from '@decentralized-geo/astral-sdk';
import { WifiMlsPlugin } from '@location-proofs/plugin-wifi-mls';

const sdk = new AstralSDK({ chainId: 11155111 });
sdk.plugins.register(new WifiMlsPlugin({ privateKey: '0x...' }));

const signals = await sdk.stamps.collect({ plugins: ['wifi-mls'] });
```

### Standalone (without SDK)

```typescript
import { collectWifi, createStampFromSignals, signStamp, verifyWifiMlsStamp } from '@location-proofs/plugin-wifi-mls';
import { ethers } from 'ethers';

const signals = await collectWifi(8000);
const unsigned = createStampFromSignals(signals, '0.1.0', 60);
const wallet = new ethers.Wallet('0x...');
const stamp = await signStamp(unsigned, wallet);
const result = await verifyWifiMlsStamp(stamp);
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `privateKey` | random | Hex-encoded ECDSA private key for signing |
| `timeoutMs` | 8000 | Per-step timeout in milliseconds |
| `durationSeconds` | 60 | Temporal footprint duration |

## Signals collected

| Field | Description |
|-------|-------------|
| `source` | Always `'wifi'` |
| `accuracyMeters` | MLS-reported accuracy |
| `apCount` | Number of APs used for resolution |

## Verification

The `verify` function checks:

1. **Structure** — lpVersion `0.2`, plugin name, required fields
2. **Signatures** — ECDSA recovery matches declared signer, using canonical (sorted-key) serialization
3. **Signals** — coordinate bounds, accuracy > 0, AP count > 0
