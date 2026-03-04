
const mockExecFile = jest.fn();
jest.mock('child_process', () => ({
  execFile: mockExecFile,
}));
jest.mock('util', () => ({
  promisify: () => mockExecFile,
}));

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

import { scanLinux, scanMacos, resolveViaMLS, readWifi } from '../collect';

const originalPlatform = process.platform;

function setPlatform(platform: string) {
  Object.defineProperty(process, 'platform', { value: platform });
}

describe('wifi-mls collector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    setPlatform(originalPlatform);
  });

  describe('scanLinux', () => {
    it('parses nmcli output into access points', async () => {
      mockExecFile.mockResolvedValueOnce({
        stdout: 'AA\\:BB\\:CC\\:DD\\:EE\\:FF:75\n11\\:22\\:33\\:44\\:55\\:66:50\n',
      });

      const aps = await scanLinux(8000);
      expect(aps).toHaveLength(2);
      expect(aps[0].macAddress).toBe('AA:BB:CC:DD:EE:FF');
      // 75/2 - 100 = -62.5
      expect(aps[0].signalStrength).toBe(-62.5);
    });
  });

  describe('scanMacos', () => {
    it('parses airport -s output', async () => {
      mockExecFile.mockResolvedValueOnce({
        stdout: [
          '                            SSID BSSID             RSSI CHANNEL HT CC SECURITY',
          '                     MyNetwork aa:bb:cc:dd:ee:ff  -55  6       Y  -- WPA2(PSK/AES/AES)',
        ].join('\n'),
      });

      const aps = await scanMacos(8000);
      expect(aps).toHaveLength(1);
      expect(aps[0].macAddress).toBe('aa:bb:cc:dd:ee:ff');
      expect(aps[0].signalStrength).toBe(-55);
    });
  });

  describe('resolveViaMLS', () => {
    it('returns coordinates from MLS response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          location: { lat: 40.7484, lng: -73.9857 },
          accuracy: 100,
        }),
      });

      const result = await resolveViaMLS(
        [{ macAddress: 'aa:bb:cc:dd:ee:ff', signalStrength: -55 }],
        8000
      );
      expect(result).not.toBeNull();
      expect(result!.lat).toBe(40.7484);
      expect(result!.lon).toBe(-73.9857);
      expect(result!.accuracy).toBe(100);
    });

    it('returns null for empty AP list', async () => {
      const result = await resolveViaMLS([], 8000);
      expect(result).toBeNull();
    });

    it('returns null on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false });
      const result = await resolveViaMLS(
        [{ macAddress: 'aa:bb:cc:dd:ee:ff', signalStrength: -55 }],
        8000
      );
      expect(result).toBeNull();
    });
  });

  describe('readWifi', () => {
    it('returns null on unsupported platform', async () => {
      setPlatform('win32');
      const result = await readWifi();
      expect(result).toBeNull();
      setPlatform(originalPlatform);
    });
  });
});
