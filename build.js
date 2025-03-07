import { build } from 'esbuild';

import fs from 'fs';
import { nodeExternalsPlugin } from 'esbuild-node-externals'

async function runBuild() {
  try {
    await build({
      entryPoints: ['./index.ts'], // Replace with your CLI entry point
      bundle: true,
      platform: 'node',
      target: 'node20', // Target Node.js version
      outfile: 'dist/cli.js', // Output as CommonJS
      format: 'esm', // Output as ESM
      minify: true,
      banner: {
        js: '#!/usr/bin/env node\n', // Needed for CLI executables
      },
      plugins: [
        // Optional: exclude some dependencies from bundling
        nodeExternalsPlugin({
          // Bundle Polkadot packages to resolve version conflicts
          allowList: ['@polkadot']
        })
      ],
      // Handle NodeJS native modules
      external: ['crypto', 'fs', 'path', 'os', 'util'],
      // Needed for some polkadot packages
      define: {
        'process.env.NODE_ENV': '"production"',
        'global': 'global',
      },
      // Troubleshooting option
      logLevel: 'info',
    });

    // In your build.js
    // Copy the wrapper file to dist
    fs.copyFileSync('cli-with-suppress.js', 'dist/cli-with-suppress.js');
    // Make it executable (Unix systems)
    if (process.platform !== 'win32') {
      fs.chmodSync('dist/cli-with-suppress.js', '755');
    }

    console.log('Build completed successfully!');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}


runBuild();