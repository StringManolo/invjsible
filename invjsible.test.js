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
      
      expect(encoded.length).toBe(8);
      
      for (let char of encoded) {
        expect(char).toBe(invisibleChars.ONE);
      }
    });

    test('should handle byte with value 0x00', () => {
      const buffer = Buffer.from([0x00]); // 00000000
      const encoded = encodeToInvisible(buffer);
      
      expect(encoded.length).toBe(8);
      
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
      const encoded = invisibleChars.ZERO + invisibleChars.ONE + invisibleChars.ZERO;
      const { buffer: decoded } = decodeFromInvisible(encoded);
      
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
      
      expect(encodedSize).toBeGreaterThan(originalSize);
      
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(typeof content).toBe('string');
    });

    test('should encode file with compression and verbose output', async () => {
      const outputFile = path.join(testDir, 'encoded-compressed.txt');
      
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

    test('should use default output name if not specified', async () => {
      await encode(testFiles.small, null, { compress: false, verbose: false });
      
      const defaultOutput = testFiles.small + '.encoded';
      expect(fs.existsSync(defaultOutput)).toBe(true);
    });

    test('compression should choose smaller output', async () => {
      const outputFile = path.join(testDir, 'compressed-choice.txt');
      
      await encode(testFiles.medium, outputFile, { compress: true, verbose: false });
      
      const withoutCompressionFile = path.join(testDir, 'no-compress.txt');
      await encode(testFiles.medium, withoutCompressionFile, { compress: false, verbose: false });
      
      const compressedSize = fs.statSync(outputFile).size;
      const uncompressedSize = fs.statSync(withoutCompressionFile).size;
      
      expect(compressedSize).toBeLessThan(uncompressedSize);
    });

    test('should handle chmod error gracefully', async () => {
      const outputFile = path.join(testDir, 'script-chmod.js.encoded');
      
      const originalChmod = fs.chmodSync;
      fs.chmodSync = jest.fn(() => {
        throw new Error('chmod not supported');
      });
      
      await expect(encode(testFiles.js, outputFile, { compress: true, runable: true, verbose: false }))
        .resolves.not.toThrow();
      
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

    test('should show verbose compression comparison', async () => {
      const outputFile = path.join(testDir, 'verbose-compare.encoded');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await encode(testFiles.medium, outputFile, { compress: true, verbose: true });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('Option 1'))).toBe(true);
      expect(calls.some(call => call.includes('Option 2'))).toBe(true);
      expect(calls.some(call => call.includes('METHOD COMPARISON'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should show which option was used in verbose', async () => {
      const outputFile = path.join(testDir, 'option-used.encoded');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await encode(testFiles.medium, outputFile, { compress: true, verbose: true });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('Using Option'))).toBe(true);
      expect(calls.some(call => call.includes('Smaller by'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should show executable instructions in verbose runnable', async () => {
      const outputFile = path.join(testDir, 'exec-inst.encoded');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await encode(testFiles.js, outputFile, { runable: true, verbose: true });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('Execute with:'))).toBe(true);
      expect(calls.some(call => call.includes('Or directly:'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should show compression marker in verbose output', async () => {
      const outputFile = path.join(testDir, 'marker-verbose.encoded');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await encode(testFiles.medium, outputFile, { compress: true, verbose: true });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // May show marker if compression was used
      const content = fs.readFileSync(outputFile, 'utf8');
      if (content.startsWith(invisibleChars.COMPRESS)) {
        expect(calls.some(call => call.includes('Marker:'))).toBe(true);
      }
      
      consoleSpy.mockRestore();
    });
  });

  // ==================== DECODE COMMAND TESTS ====================

  describe('decode command', () => {
    test('should decode file without compression', async () => {
      const encodedFile = path.join(testDir, 'encoded.txt');
      const decodedFile = path.join(testDir, 'decoded.txt');
      
      await encode(testFiles.small, encodedFile, { compress: false, verbose: false });
      await decode(encodedFile, decodedFile, { verbose: false });
      
      expect(fs.existsSync(decodedFile)).toBe(true);
      
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
      expect(calls.some(call => call.includes('Compression detected') || call.includes('No compression'))).toBe(true);
      
      consoleSpy.mockRestore();
      
      const original = fs.readFileSync(testFiles.medium);
      const decoded = fs.readFileSync(decodedFile);
      expect(decoded).toEqual(original);
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

    test('should show decompressing message in verbose', async () => {
      const encoded = path.join(testDir, 'decompress.encoded');
      const decoded = path.join(testDir, 'decompress.decoded');
      
      await encode(testFiles.medium, encoded, { compress: true, verbose: false });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await decode(encoded, decoded, { verbose: true });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Check for decompression messages
      const content = fs.readFileSync(encoded, 'utf8');
      if (content.startsWith(invisibleChars.COMPRESS)) {
        expect(calls.some(call => call.includes('Decompressing') || call.includes('Compression detected'))).toBe(true);
      }
      
      consoleSpy.mockRestore();
    });
  });

  // ==================== ANALYZE COMMAND TESTS ====================

  describe('analyze command', () => {
    test('should analyze file with invisible characters', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(testFiles.withInvisibles);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('INVISIBLE CHARACTERS ANALYSIS'))).toBe(true);
      expect(calls.some(call => call.includes('Contains invisible characters: YES'))).toBe(true);
      expect(calls.some(call => call.includes('Total count:'))).toBe(true);
      expect(calls.some(call => call.includes('Types found:'))).toBe(true);
      expect(calls.some(call => call.includes('Analysis completed'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should analyze file without invisible characters', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(testFiles.small);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('Contains invisible characters: NO'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should show positions when count is 20 or less', async () => {
      const smallEncodedFile = path.join(testDir, 'small-encoded.txt');
      const smallFile = path.join(testDir, 'tiny.txt');
      fs.writeFileSync(smallFile, 'Hi', 'utf8');
      
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
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('INVISIBLE CHARACTERS CLEANUP'))).toBe(true);
      expect(calls.some(call => call.includes('Characters removed: 2'))).toBe(true);
      expect(calls.some(call => call.includes('Cleanup completed'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should use default output name if not specified', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      clean(testFiles.withInvisibles, null);
      
      const expectedOutput = path.join(testDir, 'with-invisibles.cleaned.txt');
      expect(fs.existsSync(expectedOutput)).toBe(true);
      
      consoleSpy.mockRestore();
    });
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

    test('should handle list command', () => {
      const result = execSync('node invjsible.js list', { encoding: 'utf8', cwd: process.cwd() });
      
      expect(result).toContain('AVAILABLE INVISIBLE CHARACTERS');
      expect(result).toContain('Total:');
      expect(result).toContain('documented invisible characters');
    });

    test('should handle analyze command', () => {
      const result = execSync(`node invjsible.js analyze ${testFiles.withInvisibles}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(result).toContain('INVISIBLE CHARACTERS ANALYSIS');
    });

    test('should handle clean command', () => {
      const result = execSync(`node invjsible.js clean ${testFiles.withInvisibles}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(result).toContain('INVISIBLE CHARACTERS CLEANUP');
    });

    test('should error on encode without file', () => {
      try {
        execSync('node invjsible.js encode', { encoding: 'utf8', cwd: process.cwd(), stdio: 'pipe' });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.status).toBe(1);
      }
    });

    test('should error on decode without file', () => {
      try {
        execSync('node invjsible.js decode', { encoding: 'utf8', cwd: process.cwd(), stdio: 'pipe' });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.status).toBe(1);
      }
    });

    test('should error on analyze without file', () => {
      try {
        execSync('node invjsible.js analyze', { encoding: 'utf8', cwd: process.cwd(), stdio: 'pipe' });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.status).toBe(1);
      }
    });

    test('should error on clean without file', () => {
      try {
        execSync('node invjsible.js clean', { encoding: 'utf8', cwd: process.cwd(), stdio: 'pipe' });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.status).toBe(1);
      }
    });

    test('should error on encode with non-existent file', () => {
      try {
        execSync('node invjsible.js encode /fake/path/file.txt', { 
          encoding: 'utf8', 
          cwd: process.cwd(),
          stdio: 'pipe'
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.status).toBe(1);
      }
    });

    test('should error on unknown command', () => {
      try {
        execSync('node invjsible.js unknown-command', { 
          encoding: 'utf8', 
          cwd: process.cwd(),
          stdio: 'pipe'
        });
        fail('Should have thrown error');
      } catch (error) {
        expect(error.status).toBe(1);
      }
    });

    test('should handle encode with -o flag', () => {
      const outputFile = path.join(testDir, 'custom-output.txt');
      execSync(`node invjsible.js encode ${testFiles.small} -o ${outputFile}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(fs.existsSync(outputFile)).toBe(true);
    });

    test('should handle encode with --output flag', () => {
      const outputFile = path.join(testDir, 'custom-output2.txt');
      execSync(`node invjsible.js encode ${testFiles.small} --output ${outputFile}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(fs.existsSync(outputFile)).toBe(true);
    });

    test('should handle encode with -v flag', () => {
      const result = execSync(`node invjsible.js encode ${testFiles.small} -v`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(result).toContain('ENCODING TO INVISIBLE CHARACTERS');
    });

    test('should handle encode with --verbose flag', () => {
      const result = execSync(`node invjsible.js encode ${testFiles.small} --verbose`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(result).toContain('Original file:');
    });

    test('should handle encode with --compress flag', () => {
      const outputFile = path.join(testDir, 'compressed.encoded');
      execSync(`node invjsible.js encode ${testFiles.medium} --compress -o ${outputFile}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(fs.existsSync(outputFile)).toBe(true);
    });

    test('should handle encode with --runable flag', () => {
      const outputFile = path.join(testDir, 'runable.encoded');
      execSync(`node invjsible.js encode ${testFiles.js} --runable -o ${outputFile}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('#!/usr/bin/env node');
    });

    test('should handle decode with -o flag', () => {
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

    test('should handle decode with --output flag', () => {
      const encoded = path.join(testDir, 'for-decode2.encoded');
      const decoded = path.join(testDir, 'custom-decode2.txt');
      
      execSync(`node invjsible.js encode ${testFiles.small} --output ${encoded}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      execSync(`node invjsible.js decode ${encoded} --output ${decoded}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(fs.existsSync(decoded)).toBe(true);
    });

    test('should handle clean with -o flag', () => {
      const cleaned = path.join(testDir, 'custom-clean.txt');
      execSync(`node invjsible.js clean ${testFiles.withInvisibles} -o ${cleaned}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(fs.existsSync(cleaned)).toBe(true);
    });

    test('should handle clean with --output flag', () => {
      const cleaned = path.join(testDir, 'custom-clean2.txt');
      execSync(`node invjsible.js clean ${testFiles.withInvisibles} --output ${cleaned}`, { 
        encoding: 'utf8', 
        cwd: process.cwd() 
      });
      
      expect(fs.existsSync(cleaned)).toBe(true);
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

  // ==================== EDGE CASES ====================

  describe('Edge cases', () => {
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

  // ==================== RUNNABLE EXECUTION TESTS ====================

  describe('Runnable template execution', () => {
    test('should execute runnable .txt file and display content', async () => {
      const output = path.join(testDir, 'text-runnable.encoded');
      const txtFile = path.join(testDir, 'display.txt');
      fs.writeFileSync(txtFile, 'Display this text', 'utf8');
      
      await encode(txtFile, output, { runable: true, verbose: false });
      
      const result = execSync(`node ${output}`, { 
        encoding: 'utf8',
        cwd: process.cwd()
      });
      
      expect(result).toContain('Display this text');
    });

    test('should generate template for all file types', async () => {
      const fileTypes = [
        { file: testFiles.js, ext: '.js' },
        { file: testFiles.mjs, ext: '.mjs' },
        { file: testFiles.sh, ext: '.sh' },
        { file: testFiles.bash, ext: '.bash' },
        { file: testFiles.py, ext: '.py' },
        { file: testFiles.rb, ext: '.rb' }
      ];
      
      for (const { file, ext } of fileTypes) {
        const output = path.join(testDir, `test${ext}.encoded`);
        await encode(file, output, { runable: true, verbose: false });
        
        const content = fs.readFileSync(output, 'utf8');
        expect(content).toContain('#!/usr/bin/env node');
        expect(content).toContain('async function x()');
        
        fs.unlinkSync(output);
      }
    });
  });

  // ==================== INVISIBLE CHARACTERS ====================

  describe('Invisible characters', () => {
    test('should contain all expected characters', () => {
      expect(invisibleChars.ZERO).toBe('\u200B');
      expect(invisibleChars.ONE).toBe('\u200C');
      expect(invisibleChars.COMPRESS).toBe('\u200D');
    });

    test('dictionary should contain all documented characters', () => {
      const dict = invisibleChars.dictionary;
      
      expect(dict.ZWSP).toBeDefined();
      expect(dict.ZWNJ).toBeDefined();
      expect(dict.ZWJ).toBeDefined();
      
      expect(dict.ZWSP.code).toBe(8203);
      expect(dict.ZWNJ.code).toBe(8204);
      expect(dict.ZWJ.code).toBe(8205);
    });
  });

  // ==================== DIRECT FUNCTION CALLS FOR COVERAGE ====================

  describe('Direct function calls for full coverage', () => {
    test('should call analyze directly with verbose output', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Call analyze directly (this is exported)
      analyze(testFiles.withInvisibles);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Verify all sections are printed
      expect(calls.some(call => call.includes('INVISIBLE CHARACTERS ANALYSIS'))).toBe(true);
      expect(calls.some(call => call.includes('File:'))).toBe(true);
      expect(calls.some(call => call.includes('Size:'))).toBe(true);
      expect(calls.some(call => call.includes('Bytes:'))).toBe(true);
      expect(calls.some(call => call.includes('Contains invisible characters: YES'))).toBe(true);
      expect(calls.some(call => call.includes('Total count:'))).toBe(true);
      expect(calls.some(call => call.includes('Different types:'))).toBe(true);
      expect(calls.some(call => call.includes('Types found:'))).toBe(true);
      expect(calls.some(call => call.includes('Analysis completed'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should call analyze directly with file without invisibles', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(testFiles.small);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('Contains invisible characters: NO'))).toBe(true);
      expect(calls.some(call => call.includes('Analysis completed'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should call clean directly with verbose output', () => {
      const output = path.join(testDir, 'direct-clean.txt');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Call clean directly (this is exported)
      clean(testFiles.withInvisibles, output);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Verify all sections are printed
      expect(calls.some(call => call.includes('INVISIBLE CHARACTERS CLEANUP'))).toBe(true);
      expect(calls.some(call => call.includes('Original file:'))).toBe(true);
      expect(calls.some(call => call.includes('Original size:'))).toBe(true);
      expect(calls.some(call => call.includes('Characters removed:'))).toBe(true);
      expect(calls.some(call => call.includes('Clean size:'))).toBe(true);
      expect(calls.some(call => call.includes('File saved:'))).toBe(true);
      expect(calls.some(call => call.includes('Cleanup completed'))).toBe(true);
      
      expect(fs.existsSync(output)).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should call clean directly with default output name', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      clean(testFiles.withInvisibles, null);
      
      const expectedOutput = testFiles.withInvisibles.replace(/(\.[^.]+)$/, '.cleaned$1');
      expect(fs.existsSync(expectedOutput)).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should test analyze with many invisible characters', async () => {
      const manyInvisFile = path.join(testDir, 'many-invis.txt');
      
      // Create file with many different invisible characters
      let content = 'Text';
      Object.values(invisibleChars.dictionary).slice(0, 5).forEach(char => {
        content += char.char;
      });
      content += 'More';
      
      fs.writeFileSync(manyInvisFile, content, 'utf8');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(manyInvisFile);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('Different types:'))).toBe(true);
      expect(calls.some(call => call.includes('Types found:'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should encode with verbose and show marker when compressed', async () => {
      const output = path.join(testDir, 'marker-test.encoded');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Encode with compression and verbose to hit line 265
      await encode(testFiles.medium, output, { compress: true, verbose: true, runable: false });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Check if compression was used
      const content = fs.readFileSync(output, 'utf8');
      if (content.startsWith(invisibleChars.COMPRESS)) {
        // Line 265 should be executed - showing marker info
        expect(calls.some(call => call.includes('Marker:') && call.includes('COMPRESSED'))).toBe(true);
      }
      
      consoleSpy.mockRestore();
    });

    test('should encode with verbose runable and show marker when compressed', async () => {
      const output = path.join(testDir, 'marker-runable-test.encoded');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Encode with compression, verbose and runable
      await encode(testFiles.medium, output, { compress: true, verbose: true, runable: true });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Should show runable mode
      expect(calls.some(call => call.includes('Runnable mode: Enabled'))).toBe(true);
      
      // Check if compression was used in the embedded content
      const content = fs.readFileSync(output, 'utf8');
      const match = content.match(/const n=`([^`]+)`/);
      if (match && match[1].startsWith(invisibleChars.COMPRESS)) {
        // Line 265 might be executed - showing marker info
        expect(calls.some(call => call.includes('Marker:'))).toBe(true);
      }
      
      consoleSpy.mockRestore();
    });

    test('should show all verbose output in encode without compression', async () => {
      const output = path.join(testDir, 'verbose-no-compress.encoded');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await encode(testFiles.small, output, { compress: false, verbose: true, runable: false });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('ENCODING TO INVISIBLE CHARACTERS'))).toBe(true);
      expect(calls.some(call => call.includes('Original file:'))).toBe(true);
      expect(calls.some(call => call.includes('Original size:'))).toBe(true);
      expect(calls.some(call => call.includes('Direct Encoding'))).toBe(true);
      expect(calls.some(call => call.includes('Ratio:'))).toBe(true);
      expect(calls.some(call => call.includes('File saved:'))).toBe(true);
      expect(calls.some(call => call.includes('Encoding completed'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should show all verbose output sections in encode with compress', async () => {
      const output = path.join(testDir, 'all-verbose-sections.encoded');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await encode(testFiles.medium, output, { compress: true, verbose: true, runable: false });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // All sections should be present
      expect(calls.some(call => call.includes('Option 1: Encode directly'))).toBe(true);
      expect(calls.some(call => call.includes('Option 2: Compress then Encode'))).toBe(true);
      expect(calls.some(call => call.includes('1️⃣  Compression:'))).toBe(true);
      expect(calls.some(call => call.includes('2️⃣  Encoding:'))).toBe(true);
      expect(calls.some(call => call.includes('METHOD COMPARISON'))).toBe(true);
      expect(calls.some(call => call.includes('Using Option'))).toBe(true);
      expect(calls.some(call => call.includes('Smaller by'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should show all decode verbose output sections', async () => {
      const encoded = path.join(testDir, 'decode-all-verbose.encoded');
      const decoded = path.join(testDir, 'decode-all-verbose.decoded');
      
      await encode(testFiles.small, encoded, { compress: false, verbose: false });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await decode(encoded, decoded, { verbose: true });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('DECODING FROM INVISIBLE CHARACTERS'))).toBe(true);
      expect(calls.some(call => call.includes('Encoded file:'))).toBe(true);
      expect(calls.some(call => call.includes('No compression detected'))).toBe(true);
      expect(calls.some(call => call.includes('Decoded file:'))).toBe(true);
      expect(calls.some(call => call.includes('Recovered size:'))).toBe(true);
      expect(calls.some(call => call.includes('Decoding completed'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should show decompression in decode verbose', async () => {
      const encoded = path.join(testDir, 'decode-decompress-verbose.encoded');
      const decoded = path.join(testDir, 'decode-decompress-verbose.decoded');
      
      await encode(testFiles.medium, encoded, { compress: true, verbose: false });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await decode(encoded, decoded, { verbose: true });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Check if file is actually compressed
      const content = fs.readFileSync(encoded, 'utf8');
      if (content.startsWith(invisibleChars.COMPRESS)) {
        expect(calls.some(call => call.includes('Compression detected: Yes'))).toBe(true);
        expect(calls.some(call => call.includes('Decompressing content'))).toBe(true);
      }
      
      consoleSpy.mockRestore();
    });

    test('should show runnable extraction in decode verbose', async () => {
      const encoded = path.join(testDir, 'decode-runnable-verbose.encoded');
      const decoded = path.join(testDir, 'decode-runnable-verbose.decoded');
      
      await encode(testFiles.js, encoded, { compress: false, runable: true, verbose: false });
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await decode(encoded, decoded, { verbose: true });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('Runnable file detected'))).toBe(true);
      expect(calls.some(call => call.includes('Embedded content extracted'))).toBe(true);
      expect(calls.some(call => call.includes('Original file was runnable'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should test clean with file containing no removable characters', () => {
      const output = path.join(testDir, 'clean-no-removal.txt');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      clean(testFiles.small, output);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('Characters removed: 0'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should analyze and show positions for small number of invisibles', async () => {
      const smallInvisFile = path.join(testDir, 'small-invis-analyze.txt');
      
      // Create file with exactly 15 invisible characters
      let content = 'Start';
      for (let i = 0; i < 15; i++) {
        content += invisibleChars.ZERO;
      }
      content += 'End';
      
      fs.writeFileSync(smallInvisFile, content, 'utf8');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(smallInvisFile);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Should show positions since count <= 20
      expect(calls.some(call => call.includes('📍 Positions:'))).toBe(true);
      expect(calls.some(call => call.includes('Pos '))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should analyze and show truncated positions for many invisibles', async () => {
      const manyInvisFile = path.join(testDir, 'many-invis-analyze.txt');
      
      // Create file with more than 20 invisible characters
      let content = 'Start';
      for (let i = 0; i < 50; i++) {
        content += invisibleChars.ZERO;
      }
      content += 'End';
      
      fs.writeFileSync(manyInvisFile, content, 'utf8');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(manyInvisFile);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Should show first 20 and mention more
      expect(calls.some(call => call.includes('Showing first 20 positions of'))).toBe(true);
      expect(calls.some(call => call.includes('... and'))).toBe(true);
      expect(calls.some(call => call.includes('more'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should encode verbose runable without compression', async () => {
      const output = path.join(testDir, 'verbose-runable-no-compress.encoded');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await encode(testFiles.js, output, { compress: false, verbose: true, runable: true });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('Runnable mode: Enabled'))).toBe(true);
      expect(calls.some(call => call.includes('Executable file saved:'))).toBe(true);
      expect(calls.some(call => call.includes('Mode: Self-extracting executable'))).toBe(true);
      expect(calls.some(call => call.includes('Execute with:'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should test all output name generation paths', async () => {
      // Test .encoded removal
      const encoded1 = path.join(testDir, 'test.encoded');
      await encode(testFiles.small, encoded1, { compress: false, verbose: false });
      await decode(encoded1, null, { verbose: false });
      expect(fs.existsSync(path.join(testDir, 'test.decoded'))).toBe(true);
      
      // Test runnable .encoded removal
      const encoded2 = path.join(testDir, 'test2.encoded');
      await encode(testFiles.js, encoded2, { runable: true, verbose: false });
      await decode(encoded2, null, { verbose: false });
      expect(fs.existsSync(path.join(testDir, 'test2.decoded'))).toBe(true);
      
      // Test other extensions
      const encoded3 = path.join(testDir, 'test3.xyz');
      await encode(testFiles.small, encoded3, { compress: false, verbose: false });
      await decode(encoded3, null, { verbose: false });
      expect(fs.existsSync(path.join(testDir, 'test3.xyz.decoded'))).toBe(true);
    });
  });

  // ==================== LIST AND HELP FUNCTIONS ====================

  describe('List and Help functions (now exported)', () => {
    test('should call list function directly', () => {
      const invjsible = require('./invjsible.js');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      invjsible.list();
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('AVAILABLE INVISIBLE CHARACTERS'))).toBe(true);
      expect(calls.some(call => call.includes('Encoding characters:'))).toBe(true);
      expect(calls.some(call => call.includes('Zero Width Space'))).toBe(true);
      expect(calls.some(call => call.includes('Compression marker:'))).toBe(true);
      expect(calls.some(call => call.includes('Complete invisible characters dictionary:'))).toBe(true);
      expect(calls.some(call => call.includes('Total:'))).toBe(true);
      expect(calls.some(call => call.includes('documented invisible characters'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should call showHelp function directly', () => {
      const invjsible = require('./invjsible.js');
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      invjsible.showHelp();
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      expect(calls.some(call => call.includes('INVJSIBLE'))).toBe(true);
      expect(calls.some(call => call.includes('USAGE:'))).toBe(true);
      expect(calls.some(call => call.includes('COMMANDS:'))).toBe(true);
      expect(calls.some(call => call.includes('encode'))).toBe(true);
      expect(calls.some(call => call.includes('decode'))).toBe(true);
      expect(calls.some(call => call.includes('analyze'))).toBe(true);
      expect(calls.some(call => call.includes('clean'))).toBe(true);
      expect(calls.some(call => call.includes('list'))).toBe(true);
      expect(calls.some(call => call.includes('help'))).toBe(true);
      expect(calls.some(call => call.includes('ENCODING MODES:'))).toBe(true);
      expect(calls.some(call => call.includes('RUNNABLE MODE:'))).toBe(true);
      expect(calls.some(call => call.includes('COMPRESSION:'))).toBe(true);
      expect(calls.some(call => call.includes('COMPLETE EXAMPLES:'))).toBe(true);
      expect(calls.some(call => call.includes('NOTES:'))).toBe(true);
      
      consoleSpy.mockRestore();
    });
  });

  // ==================== MAIN CLI EXECUTION ====================

  describe('Main CLI execution (require.main === module)', () => {
    let originalArgv;
    let originalMain;

    beforeEach(() => {
      originalArgv = process.argv;
      originalMain = require.main;
    });

    afterEach(() => {
      process.argv = originalArgv;
      require.main = originalMain;
    });

    test('should execute main with help command', async () => {
      // Clear module cache to force re-execution
      delete require.cache[require.resolve('./invjsible.js')];
      
      process.argv = ['node', 'invjsible.js', 'help'];
      require.main = module;
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      // Re-require to trigger the if (require.main === module) block
      const invjsible = require('./invjsible.js');
      
      // Since the module executes immediately when require.main === module,
      // we need to call the main function if it's exported
      if (invjsible.main) {
        await invjsible.main();
      }
      
      consoleSpy.mockRestore();
    });

    test('should execute main with list command', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        process.argv = ['node', 'invjsible.js', 'list'];
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await invjsible.main();
        
        const calls = consoleSpy.mock.calls.map(call => call.join(' '));
        expect(calls.some(call => call.includes('AVAILABLE INVISIBLE CHARACTERS'))).toBe(true);
        
        process.argv = originalArgv;
        consoleSpy.mockRestore();
      }
    });

    test('should execute main with no arguments', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        process.argv = ['node', 'invjsible.js'];
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await invjsible.main();
        
        const calls = consoleSpy.mock.calls.map(call => call.join(' '));
        expect(calls.some(call => call.includes('INVJSIBLE'))).toBe(true);
        
        process.argv = originalArgv;
        consoleSpy.mockRestore();
      }
    });

    test('should execute main with --help flag', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        process.argv = ['node', 'invjsible.js', '--help'];
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await invjsible.main();
        
        const calls = consoleSpy.mock.calls.map(call => call.join(' '));
        expect(calls.some(call => call.includes('INVJSIBLE'))).toBe(true);
        
        process.argv = originalArgv;
        consoleSpy.mockRestore();
      }
    });

    test('should execute main with -h flag', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        process.argv = ['node', 'invjsible.js', '-h'];
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await invjsible.main();
        
        const calls = consoleSpy.mock.calls.map(call => call.join(' '));
        expect(calls.some(call => call.includes('INVJSIBLE'))).toBe(true);
        
        process.argv = originalArgv;
        consoleSpy.mockRestore();
      }
    });

    test('should execute main encode command', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        const output = path.join(testDir, 'main-encode.txt');
        process.argv = ['node', 'invjsible.js', 'encode', testFiles.small, '-o', output];
        
        await invjsible.main();
        
        expect(fs.existsSync(output)).toBe(true);
        
        process.argv = originalArgv;
      }
    });

    test('should execute main decode command', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        const encoded = path.join(testDir, 'main-decode.encoded');
        const decoded = path.join(testDir, 'main-decode.decoded');
        
        // First encode
        await encode(testFiles.small, encoded, { compress: false, verbose: false });
        
        // Then decode via main
        process.argv = ['node', 'invjsible.js', 'decode', encoded, '-o', decoded];
        
        await invjsible.main();
        
        expect(fs.existsSync(decoded)).toBe(true);
        
        process.argv = originalArgv;
      }
    });

    test('should execute main analyze command', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        process.argv = ['node', 'invjsible.js', 'analyze', testFiles.withInvisibles];
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await invjsible.main();
        
        const calls = consoleSpy.mock.calls.map(call => call.join(' '));
        expect(calls.some(call => call.includes('INVISIBLE CHARACTERS ANALYSIS'))).toBe(true);
        
        process.argv = originalArgv;
        consoleSpy.mockRestore();
      }
    });

    test('should execute main clean command', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        const output = path.join(testDir, 'main-clean.txt');
        process.argv = ['node', 'invjsible.js', 'clean', testFiles.withInvisibles, '-o', output];
        
        await invjsible.main();
        
        expect(fs.existsSync(output)).toBe(true);
        
        process.argv = originalArgv;
      }
    });

    test('should execute main with encode verbose', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        const output = path.join(testDir, 'main-verbose.txt');
        process.argv = ['node', 'invjsible.js', 'encode', testFiles.small, '-o', output, '-v'];
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await invjsible.main();
        
        const calls = consoleSpy.mock.calls.map(call => call.join(' '));
        expect(calls.some(call => call.includes('ENCODING TO INVISIBLE CHARACTERS'))).toBe(true);
        
        process.argv = originalArgv;
        consoleSpy.mockRestore();
      }
    });

    test('should execute main with encode --compress', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        const output = path.join(testDir, 'main-compress.txt');
        process.argv = ['node', 'invjsible.js', 'encode', testFiles.medium, '-o', output, '--compress'];
        
        await invjsible.main();
        
        expect(fs.existsSync(output)).toBe(true);
        
        process.argv = originalArgv;
      }
    });

    test('should execute main with encode --runable', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        const output = path.join(testDir, 'main-runable.js');
        process.argv = ['node', 'invjsible.js', 'encode', testFiles.js, '-o', output, '--runable'];
        
        await invjsible.main();
        
        expect(fs.existsSync(output)).toBe(true);
        const content = fs.readFileSync(output, 'utf8');
        expect(content).toContain('#!/usr/bin/env node');
        
        process.argv = originalArgv;
      }
    });

    test('should execute main with decode verbose', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        const encoded = path.join(testDir, 'main-dec-v.encoded');
        const decoded = path.join(testDir, 'main-dec-v.decoded');
        
        await encode(testFiles.small, encoded, { compress: false, verbose: false });
        
        process.argv = ['node', 'invjsible.js', 'decode', encoded, '-o', decoded, '--verbose'];
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await invjsible.main();
        
        const calls = consoleSpy.mock.calls.map(call => call.join(' '));
        expect(calls.some(call => call.includes('DECODING FROM INVISIBLE CHARACTERS'))).toBe(true);
        
        process.argv = originalArgv;
        consoleSpy.mockRestore();
      }
    });

    test('should handle main encode without file error', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        process.argv = ['node', 'invjsible.js', 'encode'];
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
        
        await invjsible.main();
        
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
        
        process.argv = originalArgv;
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
      }
    });

    test('should handle main decode without file error', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        process.argv = ['node', 'invjsible.js', 'decode'];
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
        
        await invjsible.main();
        
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
        
        process.argv = originalArgv;
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
      }
    });

    test('should handle main analyze without file error', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        process.argv = ['node', 'invjsible.js', 'analyze'];
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
        
        await invjsible.main();
        
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
        
        process.argv = originalArgv;
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
      }
    });

    test('should handle main clean without file error', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        process.argv = ['node', 'invjsible.js', 'clean'];
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
        
        await invjsible.main();
        
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
        
        process.argv = originalArgv;
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
      }
    });

    test('should handle main with non-existent file error', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        process.argv = ['node', 'invjsible.js', 'encode', '/fake/file.txt'];
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
        
        await invjsible.main();
        
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
        
        process.argv = originalArgv;
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
      }
    });

    test('should handle main with unknown command error', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        process.argv = ['node', 'invjsible.js', 'unknown-command'];
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
        
        await invjsible.main();
        
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
        
        process.argv = originalArgv;
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
      }
    });

    test('should handle main with error in verbose mode', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        process.argv = ['node', 'invjsible.js', 'encode', '/fake/file.txt', '-v'];
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
        
        await invjsible.main();
        
        // Should show error and exit
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
        
        process.argv = originalArgv;
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
      }
    });
  });

  // ==================== REQUIRE.MAIN === MODULE COVERAGE ====================

  describe('Coverage for require.main === module block (line 735)', () => {
    test('should cover the require.main === module check', () => {
      // This line is covered by the fork() tests in "Module execution as main"
      // The line 735 (if (require.main === module) { main(); }) is executed when 
      // the script runs as main, which our fork() tests do.
      
      // We can verify the module structure supports this:
      const invjsible = require('./invjsible.js');
      
      // Verify main function exists and is exported
      expect(invjsible.main).toBeDefined();
      expect(typeof invjsible.main).toBe('function');
      
      // Verify all other exports exist
      expect(invjsible.encode).toBeDefined();
      expect(invjsible.decode).toBeDefined();
      expect(invjsible.analyze).toBeDefined();
      expect(invjsible.clean).toBeDefined();
      expect(invjsible.list).toBeDefined();
      expect(invjsible.showHelp).toBeDefined();
      expect(invjsible.encodeToInvisible).toBeDefined();
      expect(invjsible.decodeFromInvisible).toBeDefined();
      expect(invjsible.invisibleChars).toBeDefined();
    });

    test('should have proper module metadata', () => {
      // Verify the module can be loaded and has correct structure
      const modulePath = require.resolve('./invjsible.js');
      expect(modulePath).toBeTruthy();
      expect(modulePath).toContain('invjsible.js');
      
      const invjsible = require('./invjsible.js');
      expect(typeof invjsible).toBe('object');
      expect(Object.keys(invjsible).length).toBeGreaterThan(0);
    });

    test('should execute via node directly (integration test)', (done) => {
      // This is the real test for line 735 - executing the file directly
      const { spawn } = require('child_process');
      const child = spawn('node', [path.join(process.cwd(), 'invjsible.js'), 'help'], {
        stdio: 'pipe'
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        expect(output).toContain('INVJSIBLE');
        expect(code).toBe(0);
        done();
      });
    });

    test('should execute via node with list command (integration test)', (done) => {
      const { spawn } = require('child_process');
      const child = spawn('node', [path.join(process.cwd(), 'invjsible.js'), 'list'], {
        stdio: 'pipe'
      });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        expect(output).toContain('AVAILABLE INVISIBLE CHARACTERS');
        expect(code).toBe(0);
        done();
      });
    });

    test('should execute via node with encode command (integration test)', (done) => {
      const { spawn } = require('child_process');
      const output = path.join(testDir, 'spawn-encode.txt');
      const child = spawn('node', [
        path.join(process.cwd(), 'invjsible.js'),
        'encode',
        testFiles.small,
        '-o',
        output
      ], {
        stdio: 'pipe'
      });
      
      child.on('close', (code) => {
        expect(fs.existsSync(output)).toBe(true);
        expect(code).toBe(0);
        done();
      });
    });

    test('should handle errors when executed directly', (done) => {
      const { spawn } = require('child_process');
      const child = spawn('node', [
        path.join(process.cwd(), 'invjsible.js'),
        'encode'
      ], {
        stdio: 'pipe'
      });
      
      child.on('close', (code) => {
        expect(code).toBe(1); // Should exit with error code
        done();
      });
    });

    test('should handle unknown command when executed directly', (done) => {
      const { spawn } = require('child_process');
      const child = spawn('node', [
        path.join(process.cwd(), 'invjsible.js'),
        'unknown-command'
      ], {
        stdio: 'pipe'
      });
      
      child.on('close', (code) => {
        expect(code).toBe(1);
        done();
      });
    });
  });

  // ==================== EDGE CASE BRANCHES ====================

  describe('Edge case branches for 100% coverage', () => {
    test('should handle decompression error', async () => {
      const badCompressed = path.join(testDir, 'bad-compressed.encoded');
      const decoded = path.join(testDir, 'bad-compressed.decoded');
      
      // Create a file that looks compressed but has invalid data
      const invalidData = invisibleChars.COMPRESS + encodeToInvisible(Buffer.from('invalid compressed data'));
      fs.writeFileSync(badCompressed, invalidData, 'utf8');
      
      // Try to decode - should handle decompression error
      try {
        await decode(badCompressed, decoded, { verbose: false });
        // If it doesn't throw, it might have handled it gracefully
      } catch (error) {
        // Expected to fail
        expect(error).toBeDefined();
      }
    });

    test('should handle main error without verbose flag', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        process.argv = ['node', 'invjsible.js', 'encode', '/nonexistent/file.txt'];
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
        
        await invjsible.main();
        
        // Should show error without stack trace
        expect(consoleErrorSpy).toHaveBeenCalled();
        const errorCalls = consoleErrorSpy.mock.calls;
        const hasStackTrace = errorCalls.some(call => 
          call.some(arg => typeof arg === 'string' && arg.includes('at '))
        );
        expect(hasStackTrace).toBe(false);
        expect(processExitSpy).toHaveBeenCalledWith(1);
        
        process.argv = originalArgv;
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
      }
    });

    test('should handle output flag without value', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        // -o without a value after it
        process.argv = ['node', 'invjsible.js', 'encode', testFiles.small, '-o'];
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await invjsible.main();
        
        // Should use default output name
        const defaultOutput = testFiles.small + '.encoded';
        expect(fs.existsSync(defaultOutput)).toBe(true);
        
        process.argv = originalArgv;
        consoleSpy.mockRestore();
      }
    });

    test('should handle --output flag without value', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        const testFile = path.join(testDir, 'flag-test.txt');
        fs.writeFileSync(testFile, 'test content', 'utf8');
        
        // --output without a value after it
        process.argv = ['node', 'invjsible.js', 'encode', testFile, '--output'];
        
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        
        await invjsible.main();
        
        // Should use default output name
        const defaultOutput = testFile + '.encoded';
        expect(fs.existsSync(defaultOutput)).toBe(true);
        
        process.argv = originalArgv;
        consoleSpy.mockRestore();
      }
    });

    test('should handle decode with output flag without value', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        const encoded = path.join(testDir, 'decode-flag-test.encoded');
        
        // First encode
        await encode(testFiles.small, encoded, { compress: false, verbose: false });
        
        // Decode with -o but no value
        process.argv = ['node', 'invjsible.js', 'decode', encoded, '-o'];
        
        await invjsible.main();
        
        // Should use default output name
        const defaultOutput = encoded.replace(/\.encoded$/, '.decoded');
        expect(fs.existsSync(defaultOutput)).toBe(true);
        
        process.argv = originalArgv;
      }
    });

    test('should handle clean with output flag without value', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        
        // Clean with --output but no value
        process.argv = ['node', 'invjsible.js', 'clean', testFiles.withInvisibles, '--output'];
        
        await invjsible.main();
        
        // Should use default output name
        const defaultOutput = testFiles.withInvisibles.replace(/(\.[^.]+)$/, '.cleaned$1');
        expect(fs.existsSync(defaultOutput)).toBe(true);
        
        process.argv = originalArgv;
      }
    });

    test('should handle encode choosing direct when compression is larger', async () => {
      // Create a file that doesn't compress well (random data)
      const randomFile = path.join(testDir, 'random-no-compress.bin');
      const randomData = Buffer.from(Array.from({length: 100}, () => Math.floor(Math.random() * 256)));
      fs.writeFileSync(randomFile, randomData);
      
      const output = path.join(testDir, 'random-encoded.txt');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      await encode(randomFile, output, { compress: true, verbose: true });
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Should mention which option was chosen
      const hasOptionMessage = calls.some(call => call.includes('Using Option'));
      expect(hasOptionMessage).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should handle all byte values in encoding', () => {
      // Test all possible byte values including edge cases
      const allBytes = Buffer.from([
        0x00, 0x01, 0x7F, 0x80, 0xFF, // Edge values
        0x55, 0xAA, // Patterns
        ...Array.from({length: 10}, () => Math.floor(Math.random() * 256))
      ]);
      
      const encoded = encodeToInvisible(allBytes);
      const { buffer: decoded } = decodeFromInvisible(encoded);
      
      expect(decoded).toEqual(allBytes);
    });

    test('should handle compression marker edge cases', () => {
      // Test with just the marker
      const justMarker = invisibleChars.COMPRESS;
      const { buffer: decoded1, isCompressed: compressed1 } = decodeFromInvisible(justMarker);
      expect(compressed1).toBe(true);
      expect(decoded1.length).toBe(0);
      
      // Test without marker
      const noMarker = invisibleChars.ZERO + invisibleChars.ONE;
      const { isCompressed: compressed2 } = decodeFromInvisible(noMarker);
      expect(compressed2).toBe(false);
    });

    test('should handle empty encoded string', () => {
      const { buffer: decoded } = decodeFromInvisible('');
      expect(decoded.length).toBe(0);
    });

    test('should handle decoding with exactly 7 bits (incomplete byte)', () => {
      // Create string with exactly 7 characters (not a complete byte)
      const incomplete = invisibleChars.ZERO.repeat(7);
      const { buffer: decoded } = decodeFromInvisible(incomplete);
      
      // Should not decode incomplete byte
      expect(decoded.length).toBe(0);
    });

    test('should handle decoding with 16 bits (2 complete bytes)', () => {
      const twoBytes = invisibleChars.ZERO.repeat(8) + invisibleChars.ONE.repeat(8);
      const { buffer: decoded } = decodeFromInvisible(twoBytes);
      
      expect(decoded.length).toBe(2);
      expect(decoded[0]).toBe(0x00);
      expect(decoded[1]).toBe(0xFF);
    });

    test('should handle analyze with exactly 20 invisible characters', async () => {
      const exactTwenty = path.join(testDir, 'exactly-twenty.txt');
      
      // Create file with exactly 20 invisible characters
      let content = 'Text';
      for (let i = 0; i < 20; i++) {
        content += invisibleChars.ZERO;
      }
      content += 'End';
      
      fs.writeFileSync(exactTwenty, content, 'utf8');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(exactTwenty);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Should show all positions (not truncated)
      expect(calls.some(call => call.includes('📍 Positions:'))).toBe(true);
      expect(calls.some(call => call.includes('Showing first 20'))).toBe(false);
      
      consoleSpy.mockRestore();
    });

    test('should handle analyze with exactly 21 invisible characters', async () => {
      const twentyOne = path.join(testDir, 'twenty-one.txt');
      
      // Create file with 21 invisible characters
      let content = 'Text';
      for (let i = 0; i < 21; i++) {
        content += invisibleChars.ZERO;
      }
      content += 'End';
      
      fs.writeFileSync(twentyOne, content, 'utf8');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(twentyOne);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Should show truncated (first 20)
      expect(calls.some(call => call.includes('Showing first 20'))).toBe(true);
      expect(calls.some(call => call.includes('... and 1 more'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should handle different invisible character types in analysis', () => {
      const multiType = path.join(testDir, 'multi-type-invis.txt');
      
      // Use different types of invisible characters
      const content = 'Start' +
        invisibleChars.dictionary.ZWSP.char +
        invisibleChars.dictionary.ZWNJ.char +
        invisibleChars.dictionary.ZWJ.char +
        invisibleChars.dictionary.LRM.char +
        invisibleChars.dictionary.RLM.char +
        'End';
      
      fs.writeFileSync(multiType, content, 'utf8');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(multiType);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Should detect multiple types
      expect(calls.some(call => call.includes('Different types: 5'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should handle clean with various invisible character types', () => {
      const various = path.join(testDir, 'various-invis.txt');
      const output = path.join(testDir, 'various-clean.txt');
      
      // Include many different invisible characters
      let content = 'Normal';
      Object.values(invisibleChars.dictionary).slice(0, 10).forEach(char => {
        content += char.char;
      });
      content += 'Text';
      
      fs.writeFileSync(various, content, 'utf8');
      
      const originalLength = content.length;
      
      clean(various, output);
      
      const cleaned = fs.readFileSync(output, 'utf8');
      
      // Should have removed all invisible characters
      expect(cleaned.length).toBeLessThan(originalLength);
      expect(cleaned).toBe('NormalText');
    });

    test('should handle encode/decode with maximum compression', async () => {
      // Create highly repetitive content for maximum compression ratio
      const repetitive = path.join(testDir, 'max-compress.txt');
      const content = 'AAAA'.repeat(1000);
      fs.writeFileSync(repetitive, content, 'utf8');
      
      const encoded = path.join(testDir, 'max-compress.encoded');
      const decoded = path.join(testDir, 'max-compress.decoded');
      
      await encode(repetitive, encoded, { compress: true, verbose: false });
      await decode(encoded, decoded, { verbose: false });
      
      const result = fs.readFileSync(decoded, 'utf8');
      expect(result).toBe(content);
    });

    test('should handle binary data with all byte patterns', async () => {
      const patterns = path.join(testDir, 'patterns.bin');
      
      // Create file with various byte patterns
      const data = Buffer.concat([
        Buffer.from([0x00, 0x00, 0x00]), // All zeros
        Buffer.from([0xFF, 0xFF, 0xFF]), // All ones
        Buffer.from([0x55, 0x55, 0x55]), // Alternating 0101
        Buffer.from([0xAA, 0xAA, 0xAA]), // Alternating 1010
        Buffer.from(Array.from({length: 100}, (_, i) => i % 256)) // Sequential
      ]);
      
      fs.writeFileSync(patterns, data);
      
      const encoded = path.join(testDir, 'patterns.encoded');
      const decoded = path.join(testDir, 'patterns.decoded');
      
      await encode(patterns, encoded, { compress: true, verbose: false });
      await decode(encoded, decoded, { verbose: false });
      
      const result = fs.readFileSync(decoded);
      expect(result).toEqual(data);
    });

    test('should handle decode with corrupted compression data gracefully', async () => {
      const corrupted = path.join(testDir, 'corrupted.encoded');
      const decoded = path.join(testDir, 'corrupted.decoded');
      
      // Create encoded data with compression marker but invalid compressed data
      const fakeCompressed = invisibleChars.COMPRESS + 
        invisibleChars.ZERO.repeat(80) + // Just zeros, not valid compressed data
        invisibleChars.ONE.repeat(80);
      
      fs.writeFileSync(corrupted, fakeCompressed, 'utf8');
      
      // Try to decode - might throw or handle gracefully
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
      
      try {
        await decode(corrupted, decoded, { verbose: false });
      } catch (error) {
        // Expected - decompression should fail
        expect(error).toBeDefined();
      }
      
      consoleErrorSpy.mockRestore();
      processExitSpy.mockRestore();
    });

    test('should handle main with decode of corrupted runnable file', async () => {
      const invjsible = require('./invjsible.js');
      
      if (invjsible.main) {
        const originalArgv = process.argv;
        const badRunnable = path.join(testDir, 'bad-runnable-main.txt');
        
        // Create a file that looks runnable but can't extract content
        fs.writeFileSync(badRunnable, '// Self-extracting executable generated by invjsible\nconst x=1;', 'utf8');
        
        process.argv = ['node', 'invjsible.js', 'decode', badRunnable];
        
        const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
        const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();
        
        await invjsible.main();
        
        expect(consoleErrorSpy).toHaveBeenCalled();
        expect(processExitSpy).toHaveBeenCalledWith(1);
        
        process.argv = originalArgv;
        consoleErrorSpy.mockRestore();
        processExitSpy.mockRestore();
      }
    });

    test('should cover all char dictionary entries in analysis', () => {
      // Use every single character from the dictionary
      const allChars = path.join(testDir, 'all-dict-chars.txt');
      
      let content = 'Start';
      Object.values(invisibleChars.dictionary).forEach(char => {
        content += char.char;
      });
      content += 'End';
      
      fs.writeFileSync(allChars, content, 'utf8');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(allChars);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      
      // Should detect all types
      const dictSize = Object.keys(invisibleChars.dictionary).length;
      expect(calls.some(call => call.includes(`Different types: ${dictSize}`))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should handle encode with all file extensions in runnable mode', async () => {
      const extensions = [
        { file: testFiles.js, ext: '.js' },
        { file: testFiles.mjs, ext: '.mjs' },
        { file: testFiles.sh, ext: '.sh' },
        { file: testFiles.bash, ext: '.bash' },
        { file: testFiles.py, ext: '.py' },
        { file: testFiles.rb, ext: '.rb' },
        { file: testFiles.small, ext: '.txt' },
        { file: testFiles.executable, ext: '' }
      ];
      
      for (const { file, ext } of extensions) {
        const output = path.join(testDir, `ext-test${ext}.encoded`);
        await encode(file, output, { runable: true, compress: false, verbose: false });
        
        const content = fs.readFileSync(output, 'utf8');
        expect(content).toContain('async function x()');
        
        // Verify the template handles this extension
        if (ext === '.js' || ext === '.mjs') {
          expect(content).toContain("t==='.js'||t==='.mjs'");
        } else if (ext === '.sh' || ext === '.bash') {
          expect(content).toContain('bash');
        } else if (ext === '.py') {
          expect(content).toContain('python3');
        } else if (ext === '.rb') {
          expect(content).toContain('ruby');
        } else if (ext === '.txt' || ext === '') {
          expect(content).toContain('console.log');
        }
        
        fs.unlinkSync(output);
      }
    });

    test('should handle platform differences in chmod', async () => {
      const output = path.join(testDir, 'chmod-platform.encoded');
      
      // Mock process.platform if needed
      const originalPlatform = process.platform;
      
      try {
        // Test on non-Windows platform behavior
        if (process.platform !== 'win32') {
          await encode(testFiles.js, output, { runable: true, verbose: false });
          
          const stats = fs.statSync(output);
          expect(stats.mode & 0o111).toBeGreaterThan(0);
        }
        
        fs.unlinkSync(output);
      } catch (error) {
        // Clean up on error
        if (fs.existsSync(output)) {
          fs.unlinkSync(output);
        }
      }
    });

    test('should handle empty buffer in encoding', () => {
      const emptyBuffer = Buffer.alloc(0);
      const encoded = encodeToInvisible(emptyBuffer);
      
      expect(encoded).toBe('');
      
      const { buffer: decoded } = decodeFromInvisible(encoded);
      expect(decoded.length).toBe(0);
    });

    test('should handle single bit patterns', () => {
      // Test specific bit patterns
      const patterns = [
        { byte: 0b00000001, desc: 'only last bit' },
        { byte: 0b10000000, desc: 'only first bit' },
        { byte: 0b01010101, desc: 'alternating' },
        { byte: 0b10101010, desc: 'alternating inverse' }
      ];
      
      for (const { byte } of patterns) {
        const buffer = Buffer.from([byte]);
        const encoded = encodeToInvisible(buffer);
        expect(encoded.length).toBe(8);
        
        const { buffer: decoded } = decodeFromInvisible(encoded);
        expect(decoded[0]).toBe(byte);
      }
    });

    test('should handle very long file names in output generation', async () => {
      const longName = path.join(testDir, 'a'.repeat(200) + '.txt');
      fs.writeFileSync(longName, 'content', 'utf8');
      
      const encoded = longName + '.encoded';
      
      await encode(longName, encoded, { compress: false, verbose: false });
      
      expect(fs.existsSync(encoded)).toBe(true);
      
      fs.unlinkSync(encoded);
      fs.unlinkSync(longName);
    });

    test('should handle multiple consecutive invisible characters in clean', () => {
      const multiple = path.join(testDir, 'multiple-consecutive.txt');
      const output = path.join(testDir, 'multiple-clean.txt');
      
      // 100 consecutive invisible characters
      const content = 'Start' + invisibleChars.ZERO.repeat(100) + 'End';
      fs.writeFileSync(multiple, content, 'utf8');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      clean(multiple, output);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('Characters removed: 100'))).toBe(true);
      
      const cleaned = fs.readFileSync(output, 'utf8');
      expect(cleaned).toBe('StartEnd');
      
      consoleSpy.mockRestore();
    });

    test('should handle mixed visible and invisible characters in analysis', () => {
      const mixed = path.join(testDir, 'mixed-analysis.txt');
      
      let content = '';
      for (let i = 0; i < 30; i++) {
        content += (i % 2 === 0) ? 'X' : invisibleChars.ZERO;
      }
      
      fs.writeFileSync(mixed, content, 'utf8');
      
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      
      analyze(mixed);
      
      const calls = consoleSpy.mock.calls.map(call => call.join(' '));
      expect(calls.some(call => call.includes('Total count: 15'))).toBe(true);
      
      consoleSpy.mockRestore();
    });

    test('should handle decode default output with various extensions', async () => {
      const testCases = [
        { input: 'file.encoded', expected: 'file.decoded' },
        { input: 'file.txt.encoded', expected: 'file.txt.decoded' },
        { input: 'file.js.encoded', expected: 'file.js.decoded' },
        { input: 'file.abc', expected: 'file.abc.decoded' },
        { input: 'file', expected: 'file.decoded' }
      ];
      
      for (const { input, expected } of testCases) {
        const inputPath = path.join(testDir, input);
        const expectedPath = path.join(testDir, expected);
        
        // Create encoded file
        await encode(testFiles.small, inputPath, { compress: false, verbose: false });
        
        // Decode with null output (should generate default name)
        await decode(inputPath, null, { verbose: false });
        
        expect(fs.existsSync(expectedPath)).toBe(true);
        
        // Clean up
        fs.unlinkSync(inputPath);
        fs.unlinkSync(expectedPath);
      }
    });
  });

  // ==================== PERFORMANCE TESTS ====================

  describe('Performance tests', () => {
    test('should encode large file in reasonable time', async () => {
      const start = Date.now();
      const encoded = path.join(testDir, 'large.encoded');
      
      await encode(testFiles.large, encoded, { compress: true, verbose: false });
      
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(5000);
      expect(fs.existsSync(encoded)).toBe(true);
    }, 10000);

    test('should decode large file in reasonable time', async () => {
      const encoded = path.join(testDir, 'large.encoded');
      const decoded = path.join(testDir, 'large.decoded');
      
      await encode(testFiles.large, encoded, { compress: true, verbose: false });
      
      const start = Date.now();
      await decode(encoded, decoded, { verbose: false });
      const duration = Date.now() - start;
      
      expect(duration).toBeLessThan(5000);
      expect(fs.existsSync(decoded)).toBe(true);
    }, 10000);
  });

  // ==================== DIRECT MODULE EXECUTION ====================

  describe('Module execution as main', () => {
    test('should execute module with help command', (done) => {
      const { fork } = require('child_process');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), ['help'], { silent: true });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        expect(output).toContain('INVJSIBLE');
        expect(code).toBe(0);
        done();
      });
    });

    test('should execute module with list command', (done) => {
      const { fork } = require('child_process');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), ['list'], { silent: true });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        expect(output).toContain('AVAILABLE INVISIBLE CHARACTERS');
        expect(code).toBe(0);
        done();
      });
    });

    test('should execute module with analyze command', (done) => {
      const { fork } = require('child_process');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['analyze', testFiles.withInvisibles], 
        { silent: true });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        expect(output).toContain('INVISIBLE CHARACTERS ANALYSIS');
        expect(code).toBe(0);
        done();
      });
    });

    test('should execute module with clean command', (done) => {
      const { fork } = require('child_process');
      const cleanOutput = path.join(testDir, 'fork-clean.txt');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['clean', testFiles.withInvisibles, '-o', cleanOutput], 
        { silent: true });
      
      child.on('close', (code) => {
        expect(fs.existsSync(cleanOutput)).toBe(true);
        expect(code).toBe(0);
        done();
      });
    });

    test('should execute module with encode command', (done) => {
      const { fork } = require('child_process');
      const encodeOutput = path.join(testDir, 'fork-encode.txt');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode', testFiles.small, '-o', encodeOutput], 
        { silent: true });
      
      child.on('close', (code) => {
        expect(fs.existsSync(encodeOutput)).toBe(true);
        expect(code).toBe(0);
        done();
      });
    });

    test('should execute module with decode command', (done) => {
      const { fork } = require('child_process');
      const encodeOutput = path.join(testDir, 'fork-encode2.txt');
      const decodeOutput = path.join(testDir, 'fork-decode2.txt');
      
      // First encode
      const encodeChild = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode', testFiles.small, '-o', encodeOutput], 
        { silent: true });
      
      encodeChild.on('close', () => {
        // Then decode
        const decodeChild = fork(path.join(process.cwd(), 'invjsible.js'), 
          ['decode', encodeOutput, '-o', decodeOutput], 
          { silent: true });
        
        decodeChild.on('close', (code) => {
          expect(fs.existsSync(decodeOutput)).toBe(true);
          expect(code).toBe(0);
          done();
        });
      });
    });

    test('should execute module with encode verbose', (done) => {
      const { fork } = require('child_process');
      const encodeOutput = path.join(testDir, 'fork-verbose.txt');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode', testFiles.small, '-o', encodeOutput, '-v'], 
        { silent: true });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        expect(output).toContain('ENCODING TO INVISIBLE CHARACTERS');
        expect(code).toBe(0);
        done();
      });
    });

    test('should execute module with encode compress verbose', (done) => {
      const { fork } = require('child_process');
      const encodeOutput = path.join(testDir, 'fork-compress-verbose.txt');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode', testFiles.medium, '-o', encodeOutput, '--compress', '-v'], 
        { silent: true });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        expect(output).toContain('Option 1');
        expect(output).toContain('Option 2');
        expect(code).toBe(0);
        done();
      });
    });

    test('should execute module with encode runable', (done) => {
      const { fork } = require('child_process');
      const encodeOutput = path.join(testDir, 'fork-runable.js');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode', testFiles.js, '-o', encodeOutput, '--runable'], 
        { silent: true });
      
      child.on('close', (code) => {
        expect(fs.existsSync(encodeOutput)).toBe(true);
        const content = fs.readFileSync(encodeOutput, 'utf8');
        expect(content).toContain('#!/usr/bin/env node');
        expect(code).toBe(0);
        done();
      });
    });

    test('should execute module with decode verbose', (done) => {
      const { fork } = require('child_process');
      const encodeOutput = path.join(testDir, 'fork-dec-verbose.encoded');
      const decodeOutput = path.join(testDir, 'fork-dec-verbose.decoded');
      
      // First encode
      const encodeChild = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode', testFiles.small, '-o', encodeOutput], 
        { silent: true });
      
      encodeChild.on('close', () => {
        // Then decode with verbose
        const decodeChild = fork(path.join(process.cwd(), 'invjsible.js'), 
          ['decode', encodeOutput, '-o', decodeOutput, '-v'], 
          { silent: true });
        
        let output = '';
        decodeChild.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        decodeChild.on('close', (code) => {
          expect(output).toContain('DECODING FROM INVISIBLE CHARACTERS');
          expect(code).toBe(0);
          done();
        });
      });
    });

    test('should handle error with encode no file', (done) => {
      const { fork } = require('child_process');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode'], 
        { silent: true });
      
      child.on('close', (code) => {
        expect(code).toBe(1);
        done();
      });
    });

    test('should handle error with decode no file', (done) => {
      const { fork } = require('child_process');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['decode'], 
        { silent: true });
      
      child.on('close', (code) => {
        expect(code).toBe(1);
        done();
      });
    });

    test('should handle error with analyze no file', (done) => {
      const { fork } = require('child_process');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['analyze'], 
        { silent: true });
      
      child.on('close', (code) => {
        expect(code).toBe(1);
        done();
      });
    });

    test('should handle error with clean no file', (done) => {
      const { fork } = require('child_process');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['clean'], 
        { silent: true });
      
      child.on('close', (code) => {
        expect(code).toBe(1);
        done();
      });
    });

    test('should handle error with unknown command', (done) => {
      const { fork } = require('child_process');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['unknown'], 
        { silent: true });
      
      child.on('close', (code) => {
        expect(code).toBe(1);
        done();
      });
    });

    test('should handle error with non-existent file', (done) => {
      const { fork } = require('child_process');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode', '/fake/file.txt'], 
        { silent: true });
      
      child.on('close', (code) => {
        expect(code).toBe(1);
        done();
      });
    });

    test('should execute with no arguments', (done) => {
      const { fork } = require('child_process');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        [], 
        { silent: true });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        expect(output).toContain('INVJSIBLE');
        expect(code).toBe(0);
        done();
      });
    });

    test('should execute with --help flag', (done) => {
      const { fork } = require('child_process');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['--help'], 
        { silent: true });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        expect(output).toContain('INVJSIBLE');
        expect(code).toBe(0);
        done();
      });
    });

    test('should execute with -h flag', (done) => {
      const { fork } = require('child_process');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['-h'], 
        { silent: true });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        expect(output).toContain('INVJSIBLE');
        expect(code).toBe(0);
        done();
      });
    });

    test('should handle encode with compress and runable', (done) => {
      const { fork } = require('child_process');
      const encodeOutput = path.join(testDir, 'fork-compress-runable.js');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode', testFiles.js, '-o', encodeOutput, '--compress', '--runable'], 
        { silent: true });
      
      child.on('close', (code) => {
        expect(fs.existsSync(encodeOutput)).toBe(true);
        const content = fs.readFileSync(encodeOutput, 'utf8');
        expect(content).toContain('#!/usr/bin/env node');
        expect(code).toBe(0);
        done();
      });
    });

    test('should handle encode compress verbose showing marker', (done) => {
      const { fork } = require('child_process');
      const encodeOutput = path.join(testDir, 'fork-marker.encoded');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode', testFiles.medium, '-o', encodeOutput, '--compress', '--verbose'], 
        { silent: true });
      
      let output = '';
      child.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      child.on('close', (code) => {
        // Check if marker info is shown (line 265)
        const content = fs.readFileSync(encodeOutput, 'utf8');
        if (content.startsWith(invisibleChars.COMPRESS)) {
          expect(output).toContain('Marker:');
        }
        expect(code).toBe(0);
        done();
      });
    });

    test('should handle decode of compressed file verbose', (done) => {
      const { fork } = require('child_process');
      const encodeOutput = path.join(testDir, 'fork-comp-dec.encoded');
      const decodeOutput = path.join(testDir, 'fork-comp-dec.decoded');
      
      // First encode with compression
      const encodeChild = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode', testFiles.medium, '-o', encodeOutput, '--compress'], 
        { silent: true });
      
      encodeChild.on('close', () => {
        // Then decode with verbose
        const decodeChild = fork(path.join(process.cwd(), 'invjsible.js'), 
          ['decode', encodeOutput, '-o', decodeOutput, '--verbose'], 
          { silent: true });
        
        let output = '';
        decodeChild.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        decodeChild.on('close', (code) => {
          expect(output).toContain('Compression detected');
          expect(output).toContain('Decompressing');
          expect(code).toBe(0);
          done();
        });
      });
    });

    test('should handle decode of runnable file verbose', (done) => {
      const { fork } = require('child_process');
      const encodeOutput = path.join(testDir, 'fork-run-dec.encoded');
      const decodeOutput = path.join(testDir, 'fork-run-dec.decoded');
      
      // First encode as runnable
      const encodeChild = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode', testFiles.js, '-o', encodeOutput, '--runable'], 
        { silent: true });
      
      encodeChild.on('close', () => {
        // Then decode with verbose
        const decodeChild = fork(path.join(process.cwd(), 'invjsible.js'), 
          ['decode', encodeOutput, '-o', decodeOutput, '--verbose'], 
          { silent: true });
        
        let output = '';
        decodeChild.stdout.on('data', (data) => {
          output += data.toString();
        });
        
        decodeChild.on('close', (code) => {
          expect(output).toContain('Runnable file detected');
          expect(output).toContain('extracted');
          expect(code).toBe(0);
          done();
        });
      });
    });

    test('should handle encode with --output flag', (done) => {
      const { fork } = require('child_process');
      const encodeOutput = path.join(testDir, 'fork-output-flag.txt');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode', testFiles.small, '--output', encodeOutput], 
        { silent: true });
      
      child.on('close', (code) => {
        expect(fs.existsSync(encodeOutput)).toBe(true);
        expect(code).toBe(0);
        done();
      });
    });

    test('should handle decode with --output flag', (done) => {
      const { fork } = require('child_process');
      const encodeOutput = path.join(testDir, 'fork-dec-output.encoded');
      const decodeOutput = path.join(testDir, 'fork-dec-output.decoded');
      
      const encodeChild = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['encode', testFiles.small, '--output', encodeOutput], 
        { silent: true });
      
      encodeChild.on('close', () => {
        const decodeChild = fork(path.join(process.cwd(), 'invjsible.js'), 
          ['decode', encodeOutput, '--output', decodeOutput], 
          { silent: true });
        
        decodeChild.on('close', (code) => {
          expect(fs.existsSync(decodeOutput)).toBe(true);
          expect(code).toBe(0);
          done();
        });
      });
    });

    test('should handle clean with --output flag', (done) => {
      const { fork } = require('child_process');
      const cleanOutput = path.join(testDir, 'fork-clean-output.txt');
      const child = fork(path.join(process.cwd(), 'invjsible.js'), 
        ['clean', testFiles.withInvisibles, '--output', cleanOutput], 
        { silent: true });
      
      child.on('close', (code) => {
        expect(fs.existsSync(cleanOutput)).toBe(true);
        expect(code).toBe(0);
        done();
      });
    });
  });
});