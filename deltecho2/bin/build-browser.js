#!/usr/bin/env node

/**
 * Browser build script for Delta Chat Desktop
 * Builds the browser version with proper environment setup
 */

import { execSync } from 'child_process';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

function getBuildInfo() {
  try {
    // Try to get git commit hash, fallback to current timestamp
    const gitRef = execSync('git rev-parse HEAD', { 
      cwd: rootDir,
      encoding: 'utf8'
    }).trim();
    
    return {
      VERSION_INFO_GIT_REF: gitRef,
      BUILD_TIMESTAMP: Date.now().toString()
    };
  } catch (error) {
    console.warn('Could not determine git reference, using fallback');
    return {
      VERSION_INFO_GIT_REF: `build-${Date.now()}`,
      BUILD_TIMESTAMP: Date.now().toString()
    };
  }
}

function main() {
  console.log('Building Delta Chat Desktop Browser Version...');
  
  // Set up environment
  const buildInfo = getBuildInfo();
  Object.assign(process.env, buildInfo);
  
  try {
    // Run the browser build
    execSync('pnpm build:browser', {
      stdio: 'inherit',
      cwd: rootDir,
      env: process.env
    });
    
    console.log('\n✅ Browser build completed successfully!');
    console.log(`📁 Build output: ${resolve(rootDir, 'packages/target-browser/dist')}`);
    console.log(`🌐 Start server: pnpm start:webserver`);
    console.log(`📖 Documentation: packages/target-browser/Readme.md`);
    
  } catch (error) {
    console.error('\n❌ Browser build failed:', error.message);
    process.exit(1);
  }
}

main();