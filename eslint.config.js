const typescriptParser = require('@typescript-eslint/parser');
const typescriptPlugin = require('@typescript-eslint/eslint-plugin');
const reactPlugin = require('eslint-plugin-react');
const reactNativePlugin = require('eslint-plugin-react-native');

module.exports = [
  {
    // Global ignores
    ignores: [
      'node_modules/**',
      '.expo/**',
      '.expo-shared/**',
      'dist/**',
      'build/**',
      'web-build/**',
      '.vercel/**',
      '*.generated.*',
      'src/types/database.types.ts',
      '*.config.js',
      'babel.config.js',
      'metro.config.js',
      'supabase/**',
      '**/__tests__/**',
      '**/*.test.ts',
      '**/*.test.tsx',
    ],
  },
  {
    // Main configuration for TypeScript/React files
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: 'readonly',
        JSX: 'readonly',
        console: 'readonly',
        process: 'readonly',
        __DEV__: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescriptPlugin,
      'react': reactPlugin,
      'react-native': reactNativePlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      // React rules
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'error',
      'react-native/no-raw-text': 'off',

      // TypeScript rules
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

      // Design System Enforcement
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/#[0-9a-fA-F]{3,6}$/]',
          message: '❌ Hardcoded hex colors not allowed. Use colors.* tokens (e.g., colors.brand.DEFAULT)',
        },
        {
          selector: 'Literal[value=/^rgba?\\(/]',
          message: '❌ Hardcoded RGB colors not allowed. Use colors.* tokens',
        },
      ],
    },
  },
  {
    // Allow raw values in UI primitives and theme files
    files: ['src/ui/**/*.{ts,tsx}', 'src/styles/**/*.ts'],
    rules: {
      'react-native/no-color-literals': 'off',
      'no-restricted-syntax': 'off',
    },
  },
];
