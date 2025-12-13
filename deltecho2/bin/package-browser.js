#!/usr/bin/env node

/**
 * Package script for Delta Chat Desktop Browser Version
 * Creates a distributable package with all necessary files
 */

import { execSync, execFileSync } from 'child_process';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { readFile, writeFile, mkdir, copyFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

async function copyDirectory(src, dest) {
  if (!existsSync(dest)) {
    await mkdir(dest, { recursive: true });
  }
  
  const items = await readdir(src);
  for (const item of items) {
    const srcPath = join(src, item);
    const destPath = join(dest, item);
    const stats = await stat(srcPath);
    
    if (stats.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await copyFile(srcPath, destPath);
    }
  }
}

async function createPackage() {
  console.log('📦 Creating Delta Chat Desktop Browser Package...');
  
  const distDir = resolve(rootDir, 'browser-dist');
  
  // Clean and create distribution directory
  try {
    execFileSync('rm', ['-rf', distDir], { stdio: 'ignore' });
  } catch (error) {
    // Directory might not exist
  }
  
  await mkdir(distDir, { recursive: true });
  
  // Build the browser version first
  console.log('🔨 Building browser version...');
  execSync('pnpm build:browser:robust', {
    stdio: 'inherit',
    cwd: rootDir
  });
  
  // Copy built files
  console.log('📁 Copying browser build files...');
  const browserDistPath = resolve(rootDir, 'packages/target-browser/dist');
  await copyDirectory(browserDistPath, join(distDir, 'dist'));
  
  // Copy necessary documentation
  console.log('📖 Copying documentation...');
  await copyFile(
    resolve(rootDir, 'docs/BROWSER_VERSION.md'),
    join(distDir, 'README.md')
  );
  
  await copyFile(
    resolve(rootDir, 'packages/target-browser/Readme.md'),
    join(distDir, 'TECHNICAL_README.md')
  );
  
  await copyFile(
    resolve(rootDir, 'packages/target-browser/.env.example'),
    join(distDir, '.env.example')
  );
  
  // Copy package.json for runtime dependencies
  console.log('📦 Creating package.json...');
  const originalPkg = JSON.parse(await readFile(
    resolve(rootDir, 'packages/target-browser/package.json'),
    'utf8'
  ));
  
  const packageJson = {
    name: 'deltachat-desktop-browser',
    version: originalPkg.version,
    description: 'Delta Chat Desktop Browser Version',
    main: 'dist/server.js',
    type: 'module',
    scripts: {
      start: 'node dist/server.js',
      'start:dev': 'NODE_ENV=test node dist/server.js'
    },
    dependencies: {
      '@deltachat/jsonrpc-client': originalPkg.dependencies['@deltachat/jsonrpc-client'],
      '@deltachat/stdio-rpc-server': originalPkg.dependencies['@deltachat/stdio-rpc-server'],
      'express': originalPkg.dependencies['express'],
      'express-session': originalPkg.dependencies['express-session'],
      'node-localstorage': originalPkg.dependencies['node-localstorage'],
      'resolve-path': originalPkg.dependencies['resolve-path'],
      'ws': originalPkg.dependencies['ws']
    },
    engines: {
      node: '^20'
    },
    license: 'GPL-3.0-or-later'
  };
  
  await writeFile(
    join(distDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Create startup script
  console.log('🚀 Creating startup script...');
  const startScript = `#!/usr/bin/env node

/**
 * Delta Chat Desktop Browser Version
 * 
 * Quick start:
 * 1. Set WEB_PASSWORD environment variable or create .env file
 * 2. Run: node start.js
 * 3. Open https://localhost:3000 in your browser
 */

import { spawn } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function main() {
  console.log('🌐 Starting Delta Chat Desktop Browser Version...');
  console.log('📖 Documentation: README.md');
  console.log('⚙️  Configuration: .env.example');
  console.log('');
  
  if (!process.env.WEB_PASSWORD && !process.env.NODE_ENV) {
    console.log('⚠️  Warning: No WEB_PASSWORD set. Create .env file or set environment variable.');
    console.log('   Example: WEB_PASSWORD="your_password" node start.js');
    console.log('');
  }
  
  const server = spawn('node', ['dist/server.js'], {
    stdio: 'inherit',
    cwd: __dirname
  });
  
  server.on('close', (code) => {
    console.log(\`Server exited with code \${code}\`);
  });
  
  process.on('SIGINT', () => {
    console.log('\\nStopping server...');
    server.kill('SIGINT');
  });
}

main();
`;
  
  await writeFile(join(distDir, 'start.js'), startScript);
  execFileSync('chmod', ['+x', join(distDir, 'start.js')], { stdio: 'ignore' });
  
  console.log('\n✅ Browser package created successfully!');
  console.log(`📁 Package location: ${distDir}`);
  console.log('');
  console.log('🚀 To run the package:');
  console.log(`   cd ${distDir}`);
  console.log('   npm install');
  console.log('   WEB_PASSWORD="your_password" npm start');
  console.log('');
  console.log('🌐 Then open https://localhost:3000 in your browser');
  
  return distDir;
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createPackage().catch(console.error);
}

export { createPackage };