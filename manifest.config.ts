import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  name: 'Claude Web Shortcuts',
  description: pkg.description,
  version: pkg.version,
  permissions: ['storage'],
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  action: {
    default_title: 'Claude Web Shortcuts — edit shortcuts',
  },
  options_ui: {
    page: 'src/options/index.html',
    open_in_tab: true,
  },
  content_scripts: [
    {
      matches: ['https://claude.ai/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
});
