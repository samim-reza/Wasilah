/**
 * Jest configuration.
 *
 * `jest-expo` provides the React Native preset. Most node_modules ship
 * untranspiled ESM, so the transform ignore pattern has to opt them back IN
 * rather than out — the default would leave `import` statements for Jest to
 * choke on.
 */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@app/(.*)$': '<rootDir>/src/app/$1',
    '^@modules/(.*)$': '<rootDir>/modules/$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|nativewind|react-native-css-interop|@shopify/flash-list)',
  ],
  testMatch: ['<rootDir>/tests/**/*.test.ts', '<rootDir>/tests/**/*.test.tsx'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.types.ts',
    '!src/lib/supabase/database.types.ts',
  ],
  coverageThreshold: {
    global: { branches: 50, functions: 50, lines: 55, statements: 55 },
    // The habit engine is the part users notice when it is wrong.
    './src/features/streak/utils/': { branches: 85, functions: 95, lines: 95, statements: 95 },
    './src/lib/datetime/': { branches: 80, functions: 90, lines: 90, statements: 90 },
  },
  clearMocks: true,
};
