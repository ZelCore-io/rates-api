import type {Config} from 'jest';

export default async (): Promise<Config> => {
  return {
    testEnvironment: 'node',
    transform: {
      '^.+.tsx?$': ['ts-jest', {}],
    },
  };
}
