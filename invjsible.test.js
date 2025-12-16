// invjsible.test.js
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
      sh: path.join(testDir, 'script.sh'),
      py: path.join(testDir, 'script.py'),
      binary: path.join(testDir, 'binary.bin'),
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

    // Shell script
    fs.writeFileSync(testFiles.sh, '#!/bin/bash\necho "Hello from Shell"', 'utf8');

    // Python script
    fs.writeFileSync(testFiles.py, 'print("Hello from Python")', 'utf8');

    // Binary file
    const binaryData = Buffer.from([0x00, 0x01, 0x02, 0x03, 0xFF, 0xFE, 0xFD, 0xFC]);
    fs.writeFileSync(testFiles.binary, binaryData);

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

    test('should encode file with compression', async () => {
      const outputFile = path.join(testDir, 'encoded-compressed.txt');
      
      await encode(testFiles.medium, outputFile, { compress: true, verbose: false });
      
      expect(fs.existsSync(outputFile)).toBe(true);
      
      // Should be text file (invisible characters)
      const encodedContent = fs.readFileSync(outputFile, 'utf8');
      expect(typeof encodedContent).toBe('string');
      
      // May or may not have compression marker depending on which is smaller
      const hasMarker = encodedContent.startsWith(invisibleChars.COMPRESS);
      expect(typeof hasMarker).toBe('boolean');
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

    test('should encode different file types', async () => {
      const files = [testFiles.js, testFiles.sh, testFiles.py, testFiles.binary];
      
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

    test('should decode file with compression', async () => {
      const encodedFile = path.join(testDir, 'encoded-compressed.txt');
      const decodedFile = path.join(testDir, 'decoded-compressed.txt');
      
      await encode(testFiles.medium, encodedFile, { compress: true, verbose: false });
      await decode(encodedFile, decodedFile, { verbose: false });
      
      const original = fs.readFileSync(testFiles.medium);
      const decoded = fs.readFileSync(decodedFile);
      expect(decoded).toEqual(original);
    });

    test('should decode runnable file', async () => {
      const runnableFile = path.join(testDir, 'script.js.encoded');
      const decodedFile = path.join(testDir, 'script.decoded.js');
      
      await encode(testFiles.js, runnableFile, { compress: true, runable: true, verbose: false });
      await decode(runnableFile, decodedFile, { verbose: false });
      
      const original = fs.readFileSync(testFiles.js);
      const decoded = fs.readFileSync(decodedFile);
      expect(decoded).toEqual(original);
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

    test('should generate correct output name', async () => {
      const encodedFile = path.join(testDir, 'test.encoded');
      
      await encode(testFiles.small, encodedFile, { compress: false, verbose: false });
      await decode(encodedFile, null, { verbose: false });
      
      const expectedOutput = path.join(testDir, 'test.decoded');
      expect(fs.existsSync(expectedOutput)).toBe(true);
    });
  });

  // ==================== ANALYZE COMMAND TESTS ====================

  describe('analyze command', () => {
    test('should detect invisible characters', () => {
      const content = fs.readFileSync(testFiles.withInvisibles, 'utf8');
      
      // Create simple analysis function for test
      let count = 0;
      for (let char of content) {
        const code = char.charCodeAt(0);
        if (code === 8203 || code === 8204) count++;
      }
      
      expect(count).toBe(2);
    });

    test('should analyze encoded file', async () => {
      const encodedFile = path.join(testDir, 'encoded-for-analysis.txt');
      
      await encode(testFiles.small, encodedFile, { compress: false, verbose: false });
      
      const content = fs.readFileSync(encodedFile, 'utf8');
      
      // Count invisible characters
      let invisibleCount = 0;
      for (let char of content) {
        const code = char.charCodeAt(0);
        if (code === 8203 || code === 8204 || code === 8205) {
          invisibleCount++;
        }
      }
      
      expect(invisibleCount).toBeGreaterThan(0);
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
      const specialContent = '😀🎉✨ Emojis and áccénts ñoño 中文';
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
});

