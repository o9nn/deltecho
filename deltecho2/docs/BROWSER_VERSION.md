# Delta Chat Desktop Browser Version

This is the browser version of Delta Chat Desktop. It runs as a web application with a Node.js backend and can be accessed through any modern web browser.

## Features

- Web-based Delta Chat client
- HTTPS server with authentication
- Multi-language support
- Experimental technology for development and testing

## Quick Start

### Prerequisites

- Node.js 20.x or later
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. **Download and extract** the browser package
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Set up authentication**:
   ```bash
   # Option 1: Environment variable
   WEB_PASSWORD="your_secure_password" npm start
   
   # Option 2: Create .env file
   cp .env.example .env
   # Edit .env and set WEB_PASSWORD=your_secure_password
   ```

4. **Start the server**:
   ```bash
   npm start
   ```

5. **Open in browser**: https://localhost:3000

### Certificate Setup

The browser version requires HTTPS for security. By default, it uses self-signed certificates. You'll need to:

1. **Accept the certificate** in your browser (click "Advanced" → "Proceed to localhost")
2. **For production**: Replace with valid certificates in the \`data/certificate\` directory

### Development Mode

For development/testing without authentication:
```bash
NODE_ENV=test npm start
```

## Configuration

### Environment Variables

- \`WEB_PASSWORD\`: Required password for web access
- \`NODE_ENV\`: Set to "test" to skip authentication  
- \`PORT\`: Server port (default: 3000)
- \`DC_ACCOUNTS_DIR\`: Directory for Delta Chat accounts

### File Structure

```
browser-dist/
├── dist/                 # Built application files
│   ├── server.js        # Main server
│   ├── main.html        # Web interface
│   └── ...              # Assets and resources
├── package.json         # Runtime dependencies
├── start.js            # Startup script
├── .env.example        # Configuration template
└── README.md           # This file
```

## Limitations

⚠️ **This is experimental software** intended for development and testing.

### Known Issues

- Image cropper doesn't work with temporary files
- No system tray integration
- No native notifications when browser tab is closed
- Some features may not work as expected

### Missing Features

- Stickers
- WebXDC apps
- HTML email rendering
- File drag-and-drop
- Native desktop integration

## Building from Source

To build the browser version from the main repository:

```bash
git clone https://github.com/deltachat/deltachat-desktop.git
cd deltachat-desktop
npm install -g pnpm
pnpm install
pnpm build:browser:robust
pnpm package:browser
```

## Troubleshooting

### Common Issues

1. **"Connection was reset" error**: Make sure to use https:// not http://
2. **Certificate warnings**: Normal for self-signed certificates, click "Advanced" → "Proceed"
3. **Port already in use**: Change the PORT environment variable
4. **Build errors**: Ensure Node.js 20+ is installed

### Getting Help

- [Main Repository](https://github.com/deltachat/deltachat-desktop)
- [Documentation](https://github.com/deltachat/deltachat-desktop/tree/main/docs)
- [Issue Tracker](https://github.com/deltachat/deltachat-desktop/issues)

## License

GPL-3.0-or-later - See LICENSE file for details.

## Contributing

This browser version is part of the larger Delta Chat Desktop project. Please see the main repository for contribution guidelines.