import nextConfig from 'eslint-config-next'
import prettierConfig from 'eslint-config-prettier'

// Flat ESLint config (ESLint v9+)
const config = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'audio/**',
    ],
  },
  ...nextConfig,
  {
    name: 'prettier-overrides',
    rules: {
      ...prettierConfig.rules,
    },
  },
]

export default config
