// invjsible.test.js - Complete Test Coverage
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

// Import functions from main module
const {
  encode,
  decode,
  analyze,
  clean,
  encodeToInvisible,
  decodeFromInvisible,
  invisibleChars
} = require('./invjsible.js');

describe('invjsible CLI Tool', () => {
  let testDir;
  let testFiles = {};

  // Create temporary directory and test files
  beforeEach(() => {
    testDir = path.join(os.tmpdir(), `invjsible-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });

    // Create test files with different contents
    testFiles = {
      small: path.join(testDir, 'small.txt'),
      medium: path.join(testDir, 'medium.txt'),
      large: path.join(testDir, 'large.txt'),
      js: path.join(testDir, 'script.js'),
      mjs: path.join(testDir, 'script.mjs'),
      sh: path.join(testDir, 'script.sh'),
      bash: path.join(testDir, 'script.bash'),
      py: path.join(testDir, 'script.py'),
      rb: path.join(testDir, 'script.rb'),
      binary: path.join(testDir, 'binary.bin'),
      executable: path.join(testDir, 'exec'),
      withInvisibles: path.join(testDir, 'with-invisibles.txt')
    };

    // Small file
    fs.writeFileSync(testFiles.small, 'Hello World!', 'utf8');

    // Medium file (repetitive for compression testing)
    const mediumContent = 'Lorem ipsum dolor sit amet, '.repeat(100);
    fs.writeFileSync(testFiles.medium, mediumContent, 'utf8');

    // Large file
    const largeContent = 'The quick brown fox jumps over the lazy dog. '.repeat(1000);
    fs.writeFileSync(testFiles.large, largeContent, 'utf8');

    // JavaScript script
    fs.writeFileSync(testFiles.js, 'console.log("Hello from JS");', 'utf8');

    // MJS script
    fs.writeFileSync(testFiles.mjs, 'console.log("Hello from MJS");', 'utf8');

    // Shell script
    fs.writeFileSync(testFiles.sh, '#!/bin/bash\necho "Hello from Shell"', 'utf8');

    // Bash script
    fs.writeFileSync(testFiles.bash, '#!/bin/bash\necho "Hello from Bash"', 'utf8');

    // Python script
    fs.writeFileSync(testFiles.py, 'print("Hello from Python")', 'utf8');

    // Ruby script
    fs.writeFileSync(testFiles.rb, 'puts "Hello from Ruby"', 'utf8');

    // Binary file
    const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFD, 0xFC]);
    fs.writeFileSync(testFiles.binary, binaryData);

    // Executable without extension
    fs.writeFileSync(testFiles.executable, '#!/bin/bash\necho "Executable"', 'utf8');

    // File with invisibles
    const withInvisibles = `Normal text${invisibleChars.ZERO}${invisibleChars.ONE}More text`;
    fs.writeFileSync(testFiles.withInvisibles, withInvisibles, 'utf8');
  });

  // Clean up after each test
  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ==================== BASIC FUNCTION TESTS ====================

  describe('encodeToInvisible / decodeFromInvisible', () => {
    test('should encode and decode simple text correctly', () => {
      const original = 'Hello World!';
      const buffer = Buffer.from(original, 'utf8');
      
      const encoded = encodeToInvisible(buffer);
      expect(encoded).toBeTruthy();
      expect(encoded.length).toBeGreaterThan(0);
      
      const { buffer: decoded } = decodeFromInvisible(encoded);
      expect(decoded.toString('utf8')).toBe(original);
    });

    test('should encode and decode binary data correctly', () => {
      const binaryData = Buffer.from([0x00, 0x01, 0xFF, 0xFE, 0x7F, 0x80]);
      
      const encoded = encodeToInvisible(binaryData);
      const { buffer: decoded } = decodeFromInvisible(encoded);
      
      expect(decoded).toEqual(binaryData);
    });

    test('should encode each byte into 8 invisible characters', () => {
      const buffer = Buffer.from([0xFF]); // 11111111
      const encoded = encodeToInvisible(buffer);
      
      // Should generate exactly 8 invisible characters
      expect(encoded.length).toBe(8);
      
      // All should be the ONE character
      for (let char of encoded) {
        expect(char).toBe(invisibleChars.ONE);
      }
    });

    test('should handle byte with value 0x00', () => {
      const buffer = Buffer.from([0x00]); // 00000000
      const encoded = encodeToInvisible(buffer);
      
      expect(encoded.length).toBe(8);
      
      // All should be ZERO character
      for (let char of encoded) {
        expect(char).toBe(invisibleChars.ZERO);
      }
    });

    test('should detect compression marker', () => {
      const encoded = invisibleChars.COMPRESS + 'test';
      const { isCompressed } = decodeFromInvisible(encoded);
      
      expect(isCompressed).toBe(true);
    });

    test('should not detect compression when marker absent', () => {
      const encoded = invisibleChars.ZERO + invisibleChars.ONE;
      const { isCompressed } = decodeFromInvisible(encoded);
      
      expect(isCompressed).toBe(false);
    });

    test('should handle incomplete byte at end', () => {
      // Create encoded string with incomplete byte (less than 8 bits)
      const encoded = invisibleChars.ZERO + invisibleChars.ONE + invisibleChars.ZERO;
      const { buffer: decoded } = decodeFromInvisible(encoded);
      
      // Should only decode complete bytes
      expect(decoded.length).toBe(0);
    });
  });

  // ==================== ENCODE COMMAND TESTS ====================

  describe('encode command', () => {
    test('should encode file without compression', async () => {
      const outputFile = path.join(testDir, 'encoded.txt');
      
      await encode(testFiles.small, outputFile, { compress: false, verbose: false });
      
      expect(fs.existsSync(outputFile)).toBe(true);
      
      const originalSize = fs.statSync(testFiles.small).size;
      const encodedSize = fs.statSync(outputFile).size;
      
      // Encoded file should be larger (each byte = 8 invisible characters)
      expect(encodedSize).toBeGreaterThan(originalSize);
      
      // Should be text file
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(typeof content).toBe('string');
    });

    test('should encode file with compression and verbose output', async () => {
      const outputFile = path.join(testDir, 'encoded-compressed.txt');
      
      // Capture console output
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await encode(testFiles.medium, outputFile, { compress: true, verbose: true });
      
      expect(fs.existsSync(outputFile)).toBe(true);
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    test('should generate runnable executable file', async () => {
      const outputFile = path.join(testDir, 'script.js.encoded');
      
      await encode(testFiles.js, outputFile, { compress: true, runable: true, verbose: false });
      
      expect(fs.existsSync(outputFile)).toBe(true);
      
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('#!/usr/bin/env node');
      expect(content).toContain('// Self-extracting executable generated by invjsible');
      expect(content).toContain('async function x()');
      
      // Verify execution permissions on Unix systems
      if (process.platform !== 'win32') {
        const stats = fs.statSync(outputFile);
        expect(stats.mode & 0o111).toBeGreaterThan(0);
      }
    });

    test('should generate runnable file with verbose output', async () => {
      const outputFile = path.join(testDir, 'script-verbose.js.encoded');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await encode(testFiles.js, outputFile, { compress: true, runable: true, verbose: true });
      
      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('Runnable mode: Enabled'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should encode different file types', async () => {
      const files = [testFiles.js, testFiles.mjs, testFiles.sh, testFiles.bash, 
                     testFiles.py, testFiles.rb, testFiles.binary, testFiles.executable];
      
      for (const file of files) {
        const outputFile = file + '.encoded';
        await encode(file, outputFile, { compress: false, verbose: false });
        
        expect(fs.existsSync(outputFile)).toBe(true);
        
        // All outputs should be text (invisible characters)
        const content = fs.readFileSync(outputFile, 'utf8');
        expect(typeof content).toBe('string');
        
        // Clean up
        fs.unlinkSync(outputFile);
      }
    });

    test('should use default output name if not specified', async () => {
      await encode(testFiles.small, null, { compress: false, verbose: false });
      
      const defaultOutput = testFiles.small + '.encoded';
      expect(fs.existsSync(defaultOutput)).toBe(true);
    });

    test('compression should choose smaller output', async () => {
      const outputFile = path.join(testDir, 'compressed-choice.txt');
      
      // Use repetitive content that compresses well
      await encode(testFiles.medium, outputFile, { compress: true, verbose: false });
      
      const encodedContent = fs.readFileSync(outputFile, 'utf8');
      const withoutCompressionFile = path.join(testDir, 'no-compress.txt');
      await encode(testFiles.medium, withoutCompressionFile, { compress: false, verbose: false });
      
      const compressedSize = fs.statSync(outputFile).size;
      const uncompressedSize = fs.statSync(withoutCompressionFile).size;
      
      // Compressed version should be smaller for repetitive content
      expect(compressedSize).toBeLessThan(uncompressedSize);
    });

    test('should choose direct encoding when it is smaller', async () => {
      // Create file with random data that doesn't compress well
      const randomFile = path.join(testDir, 'random.bin');
      const randomData = Buffer.from(Array.from({length: 50}, () => Math.floor(Math.random() * 256)));
      fs.writeFileSync(randomFile, randomData);
      
      const outputFile = path.join(testDir, 'random.encoded');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await encode(randomFile, outputFile, { compress: true, verbose: true });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Should mention which option was used
      expect(calls.some(call => call.includes('Option'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should handle chmod error on Windows gracefully', async () => {
      const outputFile = path.join(testDir, 'script-chmod.js.encoded');
      
      // Mock chmod to throw error
      const originalChmod = fs.chmodSync;
      fs.chmodSync = jest.fn(() => {
        throw new Error('chmod not supported');
      });
      
      // Should not throw
      await expect(encode(testFiles.js, outputFile, { compress: true, runable: true, verbose: false }))
        .resolves.not.toThrow();
      
      // Restore
      fs.chmodSync = originalChmod;
    });

    test('should display non-verbose output for normal encoding', async () => {
      const outputFile = path.join(testDir, 'normal.encoded');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await encode(testFiles.small, outputFile, { compress: false, verbose: false });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Encoded:'));
      
      consoleSpy.mockRestore();
    });

    test('should display non-verbose output for runnable encoding', async () => {
      const outputFile = path.join(testDir, 'normal-run.encoded');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await encode(testFiles.js, outputFile, { compress: false, verbose: false, runable: true });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('✅ Executable file:'));
      
      consoleSpy.mockRestore();
    });
  });

  // ==================== DECODE COMMAND TESTS ====================

  describe('decode command', () => {
    test('should decode file without compression', async () => {
      const encodedFile = path.join(testDir, 'encoded.txt');
      const decodedFile = path.join(testDir, 'decoded.txt');
      
      // Encode first
      await encode(testFiles.small, encodedFile, { compress: false, verbose: false });
      
      // Decode
      await decode(encodedFile, decodedFile, { verbose: false });
      
      expect(fs.existsSync(decodedFile)).toBe(true);
      
      // Verify content is identical
      const original = fs.readFileSync(testFiles.small);
      const decoded = fs.readFileSync(decodedFile);
      expect(decoded).toEqual(original);
    });

    test('should decode file with compression and verbose output', async () => {
      const encodedFile = path.join(testDir, 'encoded-compressed.txt');
      const decodedFile = path.join(testDir, 'decoded-compressed.txt');
      
      await encode(testFiles.medium, encodedFile, { compress: true, verbose: false });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await decode(encodedFile, decodedFile, { verbose: true });
      
      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('Compression detected'))).toBe(true);
      
      consoleSpy.mockRestore();
      
      const original = fs.readFileSync(testFiles.medium);
      const decoded = fs.readFileSync(decodedFile);
      expect(decoded).toEqual(original);
    });

    test('should decode file without compression and verbose output', async () => {
      const encodedFile = path.join(testDir, 'encoded-no-compress.txt');
      const decodedFile = path.join(testDir, 'decoded-no-compress.txt');
      
      await encode(testFiles.small, encodedFile, { compress: false, verbose: false });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await decode(encodedFile, decodedFile, { verbose: true });
      
      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('No compression detected'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should decode runnable file with verbose output', async () => {
      const runnableFile = path.join(testDir, 'script.js.encoded');
      const decodedFile = path.join(testDir, 'script.decoded.js');
      
      await encode(testFiles.js, runnableFile, { compress: true, runable: true, verbose: false });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await decode(runnableFile, decodedFile, { verbose: true });
      
      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('Runnable file detected'))).toBe(true);
      expect(calls.some(call => call.includes('Original file was runnable'))).toBe(true);
      
      consoleSpy.mockRestore();
      
      const original = fs.readFileSync(testFiles.js);
      const decoded = fs.readFileSync(decodedFile);
      expect(decoded).toEqual(original);
    });

    test('should handle runnable file with invalid format', async () => {
      const badFile = path.join(testDir, 'bad-runnable.txt');
      fs.writeFileSync(badFile, '// Self-extracting executable generated by invjsible\nconst n=invalid', 'utf8');
      
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
      
      await decode(badFile, null, { verbose: false });
      
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Could not extract content'));
      expect(processExitSpy).toHaveBeenCalledWith(1);
      
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    test('should decode binary files correctly', async () => {
      const encodedFile = path.join(testDir, 'binary.encoded');
      const decodedFile = path.join(testDir, 'binary.decoded');
      
      await encode(testFiles.binary, encodedFile, { compress: false, verbose: false });
      await decode(encodedFile, decodedFile, { verbose: false });
      
      const original = fs.readFileSync(testFiles.binary);
      const decoded = fs.readFileSync(decodedFile);
      expect(decoded).toEqual(original);
    });

    test('should generate correct default output name for .encoded files', async () => {
      const encodedFile = path.join(testDir, 'test.encoded');
      
      await encode(testFiles.small, encodedFile, { compress: false, verbose: false });
      await decode(encodedFile, null, { verbose: false });
      
      const expectedOutput = path.join(testDir, 'test.decoded');
      expect(fs.existsSync(expectedOutput)).toBe(true);
    });

    test('should generate correct default output name for runnable files', async () => {
      const runnableFile = path.join(testDir, 'script.encoded');
      
      await encode(testFiles.js, runnableFile, { compress: false, runable: true, verbose: false });
      await decode(runnableFile, null, { verbose: false });
      
      const expectedOutput = path.join(testDir, 'script.decoded');
      expect(fs.existsSync(expectedOutput)).toBe(true);
    });

    test('should generate correct default output name for other files', async () => {
      const encodedFile = path.join(testDir, 'data.txt');
      
      await encode(testFiles.small, encodedFile, { compress: false, verbose: false });
      await decode(encodedFile, null, { verbose: false });
      
      const expectedOutput = path.join(testDir, 'data.txt.decoded');
      expect(fs.existsSync(expectedOutput)).toBe(true);
    });
  });

  // ==================== ANALYZE COMMAND TESTS ====================

  describe('analyze command', () => {
    test('should detect invisible characters', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(testFiles.withInvisibles);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('Contains invisible characters: YES'))).toBe(true);
      expect(calls.some(call => call.includes('Types found:'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should detect no invisible characters in plain file', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(testFiles.small);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('Contains invisible characters: NO'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should show positions when count is 20 or less', async () => {
      const smallEncodedFile = path.join(testDir, 'small-encoded.txt');
      const smallFile = path.join(testDir, 'tiny.txt');
      fs.writeFileSync(smallFile, 'Hi', 'utf8'); // Very small file
      
      await encode(smallFile, smallEncodedFile, { compress: false, verbose: false });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(smallEncodedFile);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('📍 Positions:'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should show first 20 positions when count exceeds 20', async () => {
      const largeEncodedFile = path.join(testDir, 'large-encoded.txt');
      
      await encode(testFiles.medium, largeEncodedFile, { compress: false, verbose: false });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(largeEncodedFile);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('Showing first 20 positions'))).toBe(true);
      expect(calls.some(call => call.includes('... and'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should detect all types of invisible characters in dictionary', () => {
      const multiInvisibleFile = path.join(testDir, 'multi-invisible.txt');
      const content = `Text${invisibleChars.dictionary.ZWSP.char}${invisibleChars.dictionary.ZWNJ.char}${invisibleChars.dictionary.ZWJ.char}More`;
      fs.writeFileSync(multiInvisibleFile, content, 'utf8');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(multiInvisibleFile);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('Different types: 3'))).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  // ==================== CLEAN COMMAND TESTS ====================

  describe('clean command', () => {
    test('should remove invisible characters', () => {
      const outputFile = path.join(testDir, 'cleaned.txt');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      clean(testFiles.withInvisibles, outputFile);
      
      expect(fs.existsSync(outputFile)).toBe(true);
      
      const cleaned = fs.readFileSync(outputFile, 'utf8');
      expect(cleaned).not.toContain(invisibleChars.ZERO);
      expect(cleaned).not.toContain(invisibleChars.ONE);
      expect(cleaned).toBe('Normal textMore text');
      
      expect(consoleSpy).toHaveBeenCalled();
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('Characters removed: 2'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should use default output name if not specified', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      clean(testFiles.withInvisibles, null);
      
      const expectedOutput = path.join(testDir, 'with-invisibles.cleaned.txt');
      expect(fs.existsSync(expectedOutput)).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should handle file with no invisible characters', () => {
      const outputFile = path.join(testDir, 'clean-plain.txt');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      clean(testFiles.small, outputFile);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('Characters removed: 0'))).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  // ==================== LIST COMMAND TESTS ====================

  describe('list command', () => {
    test('should display all invisible characters', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Import list function
      const invjsible = require('./invjsible.js');
      
      // Mock require.main to access unexported list function
      const originalMain = require.main;
      require.main = module;
      
      // Execute list through CLI simulation
      const { execSync } = require('child_process');
      const result = execSync('node invjsible.js list', { encoding: 'utf8' });
      
      expect(result).toContain('AVAILABLE INVISIBLE CHARACTERS');
      expect(result).toContain('Encoding characters:');
      expect(result).toContain('Zero Width Space');
      expect(result).toContain('Complete invisible characters dictionary:');
      
      require.main = originalMain;
      consoleSpy.mockRestore();
    });
  });

  // ==================== INTEGRATION TESTS ====================

  describe('Integration tests - encode/decode roundtrip', () => {
    test('roundtrip without compression should preserve exact content', async () => {
      const files = [testFiles.small, testFiles.medium, testFiles.js, testFiles.binary];
      
      for (const file of files) {
        const encoded = file + '.encoded';
        const decoded = file + '.decoded';
        
        await encode(file, encoded, { compress: false, verbose: false });
        await decode(encoded, decoded, { verbose: false });
        
        const original = fs.readFileSync(file);
        const result = fs.readFileSync(decoded);
        
        expect(result).toEqual(original);
        
        // Clean up
        fs.unlinkSync(encoded);
        fs.unlinkSync(decoded);
      }
    });

    test('roundtrip with compression should preserve exact content', async () => {
      const files = [testFiles.small, testFiles.medium, testFiles.large];
      
      for (const file of files) {
        const encoded = file + '.compressed.encoded';
        const decoded = file + '.compressed.decoded';
        
        await encode(file, encoded, { compress: true, verbose: false });
        await decode(encoded, decoded, { verbose: false });
        
        const original = fs.readFileSync(file);
        const result = fs.readFileSync(decoded);
        
        expect(result).toEqual(original);
        
        // Clean up
        fs.unlinkSync(encoded);
        fs.unlinkSync(decoded);
      }
    });

    test('roundtrip runnable mode should preserve content', async () => {
      const encoded = path.join(testDir, 'runable.encoded');
      const decoded = path.join(testDir, 'runable.decoded');
      
      await encode(testFiles.js, encoded, { compress: true, runable: true, verbose: false });
      await decode(encoded, decoded, { verbose: false });
      
      const original = fs.readFileSync(testFiles.js);
      const result = fs.readFileSync(decoded);
      
      expect(result).toEqual(original);
    });
  });

  // ==================== COMPRESSION TESTS ====================

  describe('Compression efficiency', () => {
    test('compression should reduce size of repetitive content', async () => {
      const withoutCompression = path.join(testDir, 'no-compress.encoded');
      const withCompression = path.join(testDir, 'compress.encoded');
      
      await encode(testFiles.medium, withoutCompression, { compress: false, verbose: false });
      await encode(testFiles.medium, withCompression, { compress: true, verbose: false });
      
      const sizeWithout = fs.statSync(withoutCompression).size;
      const sizeWith = fs.statSync(withCompression).size;
      
      // With compression should be significantly smaller
      expect(sizeWith).toBeLessThan(sizeWithout * 0.8);
    });

    test('should maintain integrity with different file sizes', async () => {
      const sizes = [
        { file: testFiles.small, name: 'small' },
        { file: testFiles.medium, name: 'medium' },
        { file: testFiles.large, name: 'large' }
      ];
      
      for (const { file, name } of sizes) {
        const encoded = path.join(testDir, `${name}.encoded`);
        const decoded = path.join(testDir, `${name}.decoded`);
        
        await encode(file, encoded, { compress: true, verbose: false });
        await decode(encoded, decoded, { verbose: false });
        
        const original = fs.readFileSync(file);
        const result = fs.readFileSync(decoded);
        
        expect(result).toEqual(original);
        
        fs.unlinkSync(encoded);
        fs.unlinkSync(decoded);
      }
    });

    test('all output should be text (invisible characters)', async () => {
      const files = [testFiles.small, testFiles.medium, testFiles.binary];
      
      for (const file of files) {
        const encoded = file + '.test.encoded';
        
        // Test without compression
        await encode(file, encoded, { compress: false, verbose: false });
        let content = fs.readFileSync(encoded, 'utf8');
        expect(typeof content).toBe('string');
        fs.unlinkSync(encoded);
        
        // Test with compression
        await encode(file, encoded, { compress: true, verbose: false });
        content = fs.readFileSync(encoded, 'utf8');
        expect(typeof content).toBe('string');
        fs.unlinkSync(encoded);
      }
    });
  });

  // ==================== INVISIBLE CHARACTERS TESTS ====================

  describe('Invisible characters', () => {
    test('should contain all expected characters', () => {
      expect(invisibleChars.ZERO).toBe('\u200B');
      expect(invisibleChars.ONE).toBe('\u200C');
      expect(invisibleChars.COMPRESS).toBe('\u200D');
    });

    test('characters should be truly invisible (non-printable)', () => {
      const chars = [
        invisibleChars.ZERO,
        invisibleChars.ONE,
        invisibleChars.COMPRESS
      ];
      
      for (const char of chars) {
        // Invisible characters should have no visual representation
        expect(char.trim()).toBe(char);
        expect(char.length).toBe(1);
        
        // Should be special Unicode characters
        const code = char.charCodeAt(0);
        expect(code).toBeGreaterThan(8000);
      }
    });

    test('dictionary should contain all documented characters', () => {
      const dict = invisibleChars.dictionary;
      
      expect(dict.ZWSP).toBeDefined();
      expect(dict.ZWNJ).toBeDefined();
      expect(dict.ZWJ).toBeDefined();
      expect(dict.ZWNBSP).toBeDefined();
      expect(dict.LRM).toBeDefined();
      expect(dict.RLM).toBeDefined();
      
      expect(dict.ZWSP.code).toBe(8203);
      expect(dict.ZWNJ.code).toBe(8204);
      expect(dict.ZWJ.code).toBe(8205);
    });
  });

  // ==================== ERROR HANDLING TESTS ====================

  describe('Error handling', () => {
    test('should fail gracefully with non-existent file', async () => {
      const fakeFile = path.join(testDir, 'does-not-exist.txt');
      const output = path.join(testDir, 'output.txt');
      
      await expect(encode(fakeFile, output, { compress: false, verbose: false }))
        .rejects.toThrow();
    });

    test('should handle empty files', async () => {
      const emptyFile = path.join(testDir, 'empty.txt');
      fs.writeFileSync(emptyFile, '', 'utf8');
      
      const encoded = path.join(testDir, 'empty.encoded');
      const decoded = path.join(testDir, 'empty.decoded');
      
      await encode(emptyFile, encoded, { compress: false, verbose: false });
      await decode(encoded, decoded, { verbose: false });
      
      const result = fs.readFileSync(decoded, 'utf8');
      expect(result).toBe('');
    });

    test('should handle special characters and Unicode', async () => {
      const specialFile = path.join(testDir, 'special.txt');
      const specialContent = '😀🎉✨ Emojis and ácçénts ñoño 中文';
      fs.writeFileSync(specialFile, specialContent, 'utf8');
      
      const encoded = path.join(testDir, 'special.encoded');
      const decoded = path.join(testDir, 'special.decoded');
      
      await encode(specialFile, encoded, { compress: true, verbose: false });
      await decode(encoded, decoded, { verbose: false });
      
      const result = fs.readFileSync(decoded, 'utf8');
      expect(result).toBe(specialContent);
    });
  });

  // ==================== PERFORMANCE TESTS ====================

  describe('Performance tests', () => {
    test('should encode large file in reasonable time', async () => {
      const start = Date.now();
      const encoded = path.join(testDir, 'large.encoded');
      
      await encode(testFiles.large, encoded, { compress: true, verbose: false });
      
      const duration = Date.now() - start;
      
      // Should not take more than 5 seconds
      expect(duration).toBeLessThan(5000);
      expect(fs.existsSync(encoded)).toBe(true);
    }, 10000); // timeout 10s

    test('should decode large file in reasonable time', async () => {
      const encoded = path.join(testDir, 'large.encoded');
      const decoded = path.join(testDir, 'large.decoded');
      
      await encode(testFiles.large, encoded, { compress: true, verbose: false });
      
      const start = Date.now();
      await decode(encoded, decoded, { verbose: false });
      const duration = Date.now() - start;
      
      // Should not take more than 5 seconds
      expect(duration).toBeLessThan(5000);
      expect(fs.existsSync(decoded)).toBe(true);
    }, 10000);
  });

  // ==================== CLI TESTS ====================

  describe('CLI command execution', () => {
    test('should handle help command', () => {
      const result = execSync('node invjsible.js help', { encoding: 'utf8', cwd: process.cwd() });
      
      expect(result).toContain('INVJSIBLE');
      expect(result).toContain('USAGE:');
      expect(result).toContain('encode');
      expect(result).toContain('decode');
    });

    test('should handle --help flag', () => {
      const result = execSync('node invjsible.js --help', { encoding: 'utf8', cwd: process.cwd() });
      
      expect(result).toContain('INVJSIBLE');
    });

    test('should handle -h flag', () => {
      const result = execSync('node invjsible.js -h', { encoding: 'utf8', cwd: process.cwd() });
      
      expect(result).toContain('INVJSIBLE');
    });

    test('should show help when no arguments provided', () => {
      const result = execSync('node invjsible.js', { encoding: 'utf8', cwd: process.cwd() });
      
      expect(result).toContain('INVJSIBLE');
    });

    test('should handle encode command with -v flag', () => {
      const result = execSync(`node invjsible.js encode ${testFiles.small} -v`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(result).toContain('ENCODING TO INVISIBLE CHARACTERS');
    });

    test('should handle encode command with --verbose flag', () => {
      const result = execSync(`node invjsible.js encode ${testFiles.small} --verbose`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(result).toContain('Original file:');
    });

    test('should handle encode command with -o flag', () => {
      const outputFile = path.join(testDir, 'custom-output.txt');
      execSync(`node invjsible.js encode ${testFiles.small} -o ${outputFile}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(fs.existsSync(outputFile)).toBe(true);
    });

    test('should handle encode command with --output flag', () => {
      const outputFile = path.join(testDir, 'custom-output2.txt');
      execSync(`node invjsible.js encode ${testFiles.small} --output ${outputFile}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(fs.existsSync(outputFile)).toBe(true);
    });

    test('should handle decode command with -o flag', () => {
      const encoded = path.join(testDir, 'for-decode.encoded');
      const decoded = path.join(testDir, 'custom-decode.txt');
      
      execSync(`node invjsible.js encode ${testFiles.small} -o ${encoded}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      execSync(`node invjsible.js decode ${encoded} -o ${decoded}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(fs.existsSync(decoded)).toBe(true);
    });

    test('should handle clean command with -o flag', () => {
      const cleaned = path.join(testDir, 'custom-clean.txt');
      execSync(`node invjsible.js clean ${testFiles.withInvisibles} -o ${cleaned}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(fs.existsSync(cleaned)).toBe(true);
    });

    test('should error on encode without file', () => {
      try {
        execSync('node invjsible.js encode', { encoding: 'utf8', cwd: process.cwd() });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('You must specify a file');
      }
    });

    test('should error on decode without file', () => {
      try {
        execSync('node invjsible.js decode', { encoding: 'utf8', cwd: process.cwd() });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('You must specify a file');
      }
    });

    test('should error on analyze without file', () => {
      try {
        execSync('node invjsible.js analyze', { encoding: 'utf8', cwd: process.cwd() });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('You must specify a file');
      }
    });

    test('should error on clean without file', () => {
      try {
        execSync('node invjsible.js clean', { encoding: 'utf8', cwd: process.cwd() });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('You must specify a file');
      }
    });

    test('should error on encode with non-existent file', () => {
      try {
        execSync('node invjsible.js encode /fake/path/file.txt', { 
          encoding: 'utf8', 
          cwd: process.cwd() 
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('does not exist');
      }
    });

    test('should error on decode with non-existent file', () => {
      try {
        execSync('node invjsible.js decode /fake/path/file.txt', { 
          encoding: 'utf8', 
          cwd: process.cwd() 
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('does not exist');
      }
    });

    test('should error on unknown command', () => {
      try {
        execSync('node invjsible.js unknown-command', { 
          encoding: 'utf8', 
          cwd: process.cwd() 
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.message).toContain('Unknown command');
      }
    });

    test('should handle list command', () => {
      const result = execSync('node invjsible.js list', { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(result).toContain('AVAILABLE INVISIBLE CHARACTERS');
      expect(result).toContain('Total:');
    });
  });

  // ==================== RUNNABLE TEMPLATE TESTS ====================

  describe('Runnable template generation', () => {
    test('should generate template for .js files', async () => {
      const output = path.join(testDir, 'js-run.encoded');
      await encode(testFiles.js, output, { runable: true, verbose: false });
      
      const content = fs.readFileSync(output, 'utf8');
      expect(content).toContain('if(t===\'.js\'||t===\'.mjs\')require(f)');
    });

    test('should generate template for .mjs files', async () => {
      const output = path.join(testDir, 'mjs-run.encoded');
      await encode(testFiles.mjs, output, { runable: true, verbose: false });
      
      const content = fs.readFileSync(output, 'utf8');
      expect(content).toContain('.mjs');
    });

    test('should generate template for .sh files', async () => {
      const output = path.join(testDir, 'sh-run.encoded');
      await encode(testFiles.sh, output, { runable: true, verbose: false });
      
      const content = fs.readFileSync(output, 'utf8');
      expect(content).toContain('bash');
    });

    test('should generate template for .bash files', async () => {
      const output = path.join(testDir, 'bash-run.encoded');
      await encode(testFiles.bash, output, { runable: true, verbose: false });
      
      const content = fs.readFileSync(output, 'utf8');
      expect(content).toContain('bash');
    });

    test('should generate template for .py files', async () => {
      const output = path.join(testDir, 'py-run.encoded');
      await encode(testFiles.py, output, { runable: true, verbose: false });
      
      const content = fs.readFileSync(output, 'utf8');
      expect(content).toContain('python3');
    });

    test('should generate template for .rb files', async () => {
      const output = path.join(testDir, 'rb-run.encoded');
      await encode(testFiles.rb, output, { runable: true, verbose: false });
      
      const content = fs.readFileSync(output, 'utf8');
      expect(content).toContain('ruby');
    });

    test('should generate template for .txt files', async () => {
      const output = path.join(testDir, 'txt-run.encoded');
      await encode(testFiles.small, output, { runable: true, verbose: false });
      
      const content = fs.readFileSync(output, 'utf8');
      expect(content).toContain('console.log(d.toString');
    });

    test('should generate template for files without extension', async () => {
      const output = path.join(testDir, 'exec-run.encoded');
      await encode(testFiles.executable, output, { runable: true, verbose: false });
      
      const content = fs.readFileSync(output, 'utf8');
      expect(content).toContain('fs.chmodSync(f,\'755\')');
    });

    test('should include compression marker in template when compressed', async () => {
      const output = path.join(testDir, 'compressed-run.encoded');
      await encode(testFiles.medium, output, { runable: true, compress: true, verbose: false });
      
      const content = fs.readFileSync(output, 'utf8');
      expect(content).toContain('const n=`');
      
      // Extract the encoded content
      const match = content.match(/const n=`([^`]+)`/);
      if (match && match[1].startsWith(invisibleChars.COMPRESS)) {
        // Compression was used
        expect(match[1][0]).toBe(invisibleChars.COMPRESS);
      }
    });
  });

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
    test('should handle file with only invisible characters', async () => {
      const invisFile = path.join(testDir, 'only-invis.txt');
      fs.writeFileSync(invisFile, invisibleChars.ZERO.repeat(100), 'utf8');
      
      const encoded = path.join(testDir, 'only-invis.encoded');
      const decoded = path.join(testDir, 'only-invis.decoded');
      
      await encode(invisFile, encoded, { compress: false, verbose: false });
      await decode(encoded, decoded, { verbose: false });
      
      const original = fs.readFileSync(invisFile, 'utf8');
      const result = fs.readFileSync(decoded, 'utf8');
      expect(result).toBe(original);
    });

    test('should handle very small files (1 byte)', async () => {
      const tinyFile = path.join(testDir, 'tiny.txt');
      fs.writeFileSync(tinyFile, 'X', 'utf8');
      
      const encoded = path.join(testDir, 'tiny.encoded');
      const decoded = path.join(testDir, 'tiny.decoded');
      
      await encode(tinyFile, encoded, { compress: true, verbose: false });
      await decode(encoded, decoded, { verbose: false });
      
      const result = fs.readFileSync(decoded, 'utf8');
      expect(result).toBe('X');
    });

    test('should handle files with null bytes', async () => {
      const nullFile = path.join(testDir, 'null.bin');
      const nullData = Buffer.from([0x00, 0x00, 0x00, 0x01, 0x00]);
      fs.writeFileSync(nullFile, nullData);
      
      const encoded = path.join(testDir, 'null.encoded');
      const decoded = path.join(testDir, 'null.decoded');
      
      await encode(nullFile, encoded, { compress: false, verbose: false });
      await decode(encoded, decoded, { verbose: false });
      
      const result = fs.readFileSync(decoded);
      expect(result).toEqual(nullData);
    });

    test('should handle all possible byte values', async () => {
      const allBytesFile = path.join(testDir, 'all-bytes.bin');
      const allBytes = Buffer.from(Array.from({length: 256}, (_, i) => i));
      fs.writeFileSync(allBytesFile, allBytes);
      
      const encoded = path.join(testDir, 'all-bytes.encoded');
      const decoded = path.join(testDir, 'all-bytes.decoded');
      
      await encode(allBytesFile, encoded, { compress: false, verbose: false });
      await decode(encoded, decoded, { verbose: false });
      
      const result = fs.readFileSync(decoded);
      expect(result).toEqual(allBytes);
    });
  });
});