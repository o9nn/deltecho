# Binary Generation Workflows

This document explains the GitHub workflows created for generating release binaries for both Electron and Tauri targets of the DeltaChat desktop application.

## Workflows Overview

### 1. Release Electron Binaries (`release-electron.yml`)

This workflow builds Electron binaries for all supported platforms.

**Triggers:**

- On release publication
- On version tags (v*.*.\*)
- Manual dispatch with version input

**Platforms:**

- Linux (AppImage)
- macOS (DMG, MAS)
- Windows (Setup, Portable)

**Artifacts:**

- `deltachat-desktop-{version}-linux.AppImage`
- `deltachat-desktop-{version}-macos.dmg`
- `deltachat-desktop-{version}-macos-mas.zip`
- `deltachat-desktop-{version}-windows-setup.exe`
- `deltachat-desktop-{version}-windows-portable.exe`

### 2. Release Tauri Binaries (`release-tauri.yml`)

This workflow builds Tauri binaries for multiple platforms and architectures.

**Triggers:**

- On release publication
- On version tags (v*.*.\*)
- Manual dispatch with version input

**Platform Matrix:**

- macOS (Intel x86_64, Apple Silicon arm64)
- Linux (x86_64)
- Windows (x86_64)

**Artifacts:**

- Platform-specific binaries with architecture and version info
- Naming format: `{app-name}-{platform}-{arch}-tauri-{version}.{ext}`

### 3. Release All Binaries (`release-all.yml`)

This combined workflow builds both Electron and Tauri binaries in parallel.

**Triggers:**

- On release publication
- On version tags (v*.*.\*)
- Manual dispatch with options to build Electron, Tauri, or both

**Features:**

- Parallel building of both targets
- Automatic artifact collection and release upload
- Selective building options for manual runs

## Usage

### Automatic Release

1. Create a new release on GitHub with a version tag (e.g., `v1.58.2`)
2. The workflows will automatically trigger and build binaries
3. Built artifacts will be attached to the release

### Manual Build

1. Go to Actions tab in GitHub
2. Select the desired workflow
3. Click "Run workflow"
4. Specify the version and options
5. Download artifacts from the workflow run

## Configuration

### Environment Variables

The workflows use the following environment variables:

- `VERSION_INFO_GIT_REF`: Git reference for version info (automatically set)
- `NODE_ENV`: Set to "production" for production builds
- `GITHUB_TOKEN`: Used for uploading release artifacts (automatically provided)

### Build Commands

**Electron:**

```bash
pnpm build4production
pnpm run pack:generate_config
pnpm run pack:patch-node-modules
electron-builder --publish never [platform-specific-args]
```

**Tauri:**

```bash
pnpm build4production
tauri-action with platform-specific args
```

## Dependencies

### System Dependencies

**Linux:**

- libwebkit2gtk-4.1-dev
- libappindicator3-dev
- librsvg2-dev
- patchelf

**macOS:**

- dmg-license (for DMG packaging)
- Xcode command line tools

**Windows:**

- Windows SDK
- Visual Studio Build Tools

### Node.js Dependencies

- pnpm (package manager)
- Node.js 20.x
- All dependencies defined in package.json files

## Troubleshooting

### Common Issues

1. **Build failures**: Check that all dependencies are properly installed
2. **Missing artifacts**: Ensure the build completed successfully
3. **Version issues**: Verify that version tags follow semantic versioning (v*.*.\*)

### Debug Mode

To enable debug mode for electron-builder, the workflows set:

```bash
DEBUG=electron-builder
```

### Caching

The workflows use caching for:

- pnpm dependencies
- Rust dependencies (for Tauri)
- Electron binaries

## Maintenance

### Updating Workflows

1. Modify the workflow files in `.github/workflows/`
2. Test changes by running manual workflows
3. Update this documentation as needed

### Platform Support

To add or remove platforms:

1. Update the matrix strategy in the workflows
2. Add platform-specific build steps
3. Update artifact naming and collection logic

## Security

- Workflows use official GitHub actions
- Secrets are only used for uploading to releases
- Build artifacts are scanned by GitHub's security features
- Code signing can be added by configuring appropriate secrets
