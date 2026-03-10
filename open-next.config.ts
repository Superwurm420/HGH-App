import { defineCloudflareConfig } from '@opennextjs/cloudflare';

const baseConfig = defineCloudflareConfig();

const config = {
  ...baseConfig,
  buildCommand: 'npm run build:next',
};

export default config;
