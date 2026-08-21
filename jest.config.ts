import type { Config } from 'jest';

export default async (): Promise<Config> => ({
  testEnvironment: 'node',
  transform: {
    '^.+.tsx?$': ['ts-jest', {}],
  },
  rootDir: './tests',
});
