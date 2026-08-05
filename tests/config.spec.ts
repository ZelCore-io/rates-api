/**
 * Finding 5: bStocksEnabled must be overridable via env var (BSTOCKS_ENABLED)
 * without a code change + redeploy. Each test re-imports the config module
 * fresh (via jest.resetModules) so the env var is picked up at module-load
 * time, mirroring how the real process reads it once on startup.
 */
describe('config.bStocksEnabled env override', () => {
  const ORIGINAL_ENV = process.env.BSTOCKS_ENABLED;

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.BSTOCKS_ENABLED;
    } else {
      process.env.BSTOCKS_ENABLED = ORIGINAL_ENV;
    }
    jest.resetModules();
  });

  it('defaults to enabled when BSTOCKS_ENABLED is unset', async () => {
    delete process.env.BSTOCKS_ENABLED;
    jest.resetModules();
    const config = (await import('../config')).default;
    expect(config.bStocksEnabled).toBe(true);
  });

  it('disables via BSTOCKS_ENABLED=false without a code change', async () => {
    process.env.BSTOCKS_ENABLED = 'false';
    jest.resetModules();
    const config = (await import('../config')).default;
    expect(config.bStocksEnabled).toBe(false);
  });

  it('treats any other value (e.g. a typo) as enabled, matching the !== "false" contract', async () => {
    process.env.BSTOCKS_ENABLED = 'no';
    jest.resetModules();
    const config = (await import('../config')).default;
    expect(config.bStocksEnabled).toBe(true);
  });
});
