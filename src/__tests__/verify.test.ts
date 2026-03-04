
import { ethers } from 'ethers';
import type { LocationStamp } from '@decentralized-geo/astral-sdk/plugins';
import { verifyWifiMlsStamp } from '../verify';

const TEST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

async function makeSignedStamp(
  overrides: Partial<LocationStamp> = {}
): Promise<LocationStamp> {
  const wallet = new ethers.Wallet(TEST_KEY);

  const unsigned = {
    lpVersion: '0.2',
    locationType: 'geojson-point',
    location: { type: 'Point' as const, coordinates: [-73.9857, 40.7484] },
    srs: 'EPSG:4326',
    temporalFootprint: { start: 1700000000, end: 1700000060 },
    plugin: 'wifi-mls',
    pluginVersion: '0.1.0',
    signals: {
      source: 'wifi',
      lat: 40.7484,
      lon: -73.9857,
      accuracyMeters: 100,
      apCount: 5,
    },
    ...overrides,
  };

  const { signatures: _, ...unsignedClean } = unsigned as LocationStamp;
  void _;
  const message = JSON.stringify(unsignedClean);
  const sigValue = await wallet.signMessage(message);

  return {
    ...unsignedClean,
    signatures: overrides.signatures ?? [
      {
        signer: { scheme: 'eth-address', value: wallet.address },
        algorithm: 'secp256k1',
        value: sigValue,
        timestamp: 1700000000,
      },
    ],
  };
}

describe('wifi-mls verification', () => {
  it('validates a well-formed signed stamp', async () => {
    const stamp = await makeSignedStamp();
    const result = await verifyWifiMlsStamp(stamp);
    expect(result.valid).toBe(true);
  });

  it('rejects stamp with wrong plugin name', async () => {
    const stamp = await makeSignedStamp({ plugin: 'not-wifi' });
    const result = await verifyWifiMlsStamp(stamp);
    expect(result.structureValid).toBe(false);
  });

  it('rejects stamp with no signatures', async () => {
    const stamp = await makeSignedStamp({ signatures: [] });
    const result = await verifyWifiMlsStamp(stamp);
    expect(result.signaturesValid).toBe(false);
  });

  it('detects zero AP count', async () => {
    const stamp = await makeSignedStamp({
      signals: { lat: 40.7484, lon: -73.9857, accuracyMeters: 100, apCount: 0 },
    });
    const result = await verifyWifiMlsStamp(stamp);
    expect(result.signalsConsistent).toBe(false);
    expect(result.details.invalidApCount).toBe(0);
  });

  it('detects invalid accuracy', async () => {
    const stamp = await makeSignedStamp({
      signals: { lat: 40.7484, lon: -73.9857, accuracyMeters: -1, apCount: 5 },
    });
    const result = await verifyWifiMlsStamp(stamp);
    expect(result.signalsConsistent).toBe(false);
    expect(result.details.invalidAccuracy).toBe(-1);
  });
});
