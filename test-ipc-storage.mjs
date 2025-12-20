#!/usr/bin/env node

/**
 * IPC Storage Test Script
 * 
 * This script tests the orchestrator's IPC storage system by:
 * 1. Connecting to the orchestrator IPC server
 * 2. Performing storage operations (set, get, keys, delete, clear)
 * 3. Verifying the results
 * 
 * Usage:
 *   # Start orchestrator first:
 *   cd deep-tree-echo-orchestrator && npm start
 *   
 *   # Then run this test:
 *   node test-ipc-storage.mjs
 */

import net from 'net';

const SOCKET_PATH = '/tmp/deep-tree-echo.sock';
const TEST_PREFIX = 'test';

class IPCClient {
  constructor(socketPath) {
    this.socketPath = socketPath;
    this.socket = null;
    this.connected = false;
    this.messageQueue = new Map();
    this.buffer = '';
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.socket = net.createConnection(this.socketPath);

      this.socket.on('connect', () => {
        this.connected = true;
        console.log('✓ Connected to orchestrator');
        resolve();
      });

      this.socket.on('data', (data) => {
        this.handleData(data);
      });

      this.socket.on('error', (error) => {
        console.error('✗ Socket error:', error.message);
        reject(error);
      });

      this.socket.on('close', () => {
        this.connected = false;
        console.log('✓ Disconnected from orchestrator');
      });

      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('Connection timeout'));
        }
      }, 5000);
    });
  }

  handleData(data) {
    this.buffer += data.toString();

    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (line.trim()) {
        try {
          const message = JSON.parse(line);
          this.handleMessage(message);
        } catch (error) {
          console.error('✗ Failed to parse message:', error.message);
        }
      }
    }
  }

  handleMessage(message) {
    const pending = this.messageQueue.get(message.id);
    if (pending) {
      clearTimeout(pending.timeout);
      this.messageQueue.delete(message.id);

      if (message.type === 'response_success') {
        pending.resolve(message.payload);
      } else if (message.type === 'response_error') {
        pending.reject(new Error(message.payload?.message || 'Request failed'));
      }
    }
  }

  async sendMessage(type, payload = {}, timeoutMs = 5000) {
    if (!this.connected || !this.socket) {
      throw new Error('Not connected');
    }

    const message = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      payload,
      timestamp: Date.now(),
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.messageQueue.delete(message.id);
        reject(new Error('Request timeout'));
      }, timeoutMs);

      this.messageQueue.set(message.id, { resolve, reject, timeout });

      const data = JSON.stringify(message) + '\n';
      this.socket.write(data);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.destroy();
    }
  }
}

// Test functions
async function testPing(client) {
  console.log('\n📍 Test: Ping');
  try {
    const response = await client.sendMessage('ping', {});
    console.log('✓ Ping successful:', response);
  } catch (error) {
    console.error('✗ Ping failed:', error.message);
  }
}

async function testStorageSet(client, key, value) {
  console.log(`\n📍 Test: Set "${key}" = "${value}"`);
  try {
    const response = await client.sendMessage('request_storage_set', {
      key: `${TEST_PREFIX}:${key}`,
      value
    });
    console.log('✓ Set successful:', response);
  } catch (error) {
    console.error('✗ Set failed:', error.message);
  }
}

async function testStorageGet(client, key) {
  console.log(`\n📍 Test: Get "${key}"`);
  try {
    const response = await client.sendMessage('request_storage_get', {
      key: `${TEST_PREFIX}:${key}`
    });
    console.log('✓ Get successful:', response);
    return response.value;
  } catch (error) {
    console.error('✗ Get failed:', error.message);
    return null;
  }
}

async function testStorageKeys(client) {
  console.log(`\n📍 Test: List keys with prefix "${TEST_PREFIX}"`);
  try {
    const response = await client.sendMessage('request_storage_keys', {
      prefix: TEST_PREFIX
    });
    console.log('✓ Keys retrieved:', response);
    return response.keys || [];
  } catch (error) {
    console.error('✗ Keys failed:', error.message);
    return [];
  }
}

async function testStorageDelete(client, key) {
  console.log(`\n📍 Test: Delete "${key}"`);
  try {
    const response = await client.sendMessage('request_storage_delete', {
      key: `${TEST_PREFIX}:${key}`
    });
    console.log('✓ Delete successful:', response);
  } catch (error) {
    console.error('✗ Delete failed:', error.message);
  }
}

async function testStorageClear(client) {
  console.log(`\n📍 Test: Clear all keys with prefix "${TEST_PREFIX}"`);
  try {
    const response = await client.sendMessage('request_storage_clear', {
      prefix: TEST_PREFIX
    });
    console.log('✓ Clear successful:', response);
  } catch (error) {
    console.error('✗ Clear failed:', error.message);
  }
}

// Main test sequence
async function runTests() {
  console.log('🚀 Starting IPC Storage Tests\n');
  console.log(`Connecting to: ${SOCKET_PATH}`);

  const client = new IPCClient(SOCKET_PATH);

  try {
    // Connect
    await client.connect();

    // Run tests
    await testPing(client);
    
    // Test storage operations
    await testStorageSet(client, 'name', 'Deep Tree Echo');
    await testStorageSet(client, 'version', '1.0.0');
    await testStorageSet(client, 'status', 'active');

    const name = await testStorageGet(client, 'name');
    console.log(`Retrieved value: "${name}"`);

    const keys = await testStorageKeys(client);
    console.log(`Total keys: ${keys.length}`);

    await testStorageDelete(client, 'status');

    const keysAfterDelete = await testStorageKeys(client);
    console.log(`Keys after delete: ${keysAfterDelete.length}`);

    await testStorageClear(client);

    const keysAfterClear = await testStorageKeys(client);
    console.log(`Keys after clear: ${keysAfterClear.length}`);

    console.log('\n✅ All tests completed');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nMake sure the orchestrator is running:');
    console.error('  cd deep-tree-echo-orchestrator');
    console.error('  npm start');
  } finally {
    client.disconnect();
  }
}

// Run the tests
runTests().catch(console.error);
