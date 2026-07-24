/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/rules/**/*.test.ts"],
  testTimeout: 30000,
  // ts-jest override : Next.js utilise ESNext/bundler, Jest a besoin de CommonJS
  transform: {
    "^.+\\.ts$": [
      "ts-jest",
      {
        tsconfig: {
          module: "CommonJS",
          moduleResolution: "node",
          esModuleInterop: true,
          strict: true,
        },
      },
    ],
  },
  // Permet à ts-jest de transpiler les packages Firebase (ESM dans node_modules)
  transformIgnorePatterns: ["/node_modules/(?!(@firebase|firebase)/)"],
  setupFilesAfterEnv: ["<rootDir>/tests/rules/setup.ts"],
};
