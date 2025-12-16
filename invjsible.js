#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { promisify } = require('util');

const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

// ==================== INVISIBLE CHARACTERS ====================

const invisibleChars = {
  // Binary encoding characters
  ZERO: '\u200B',      // Zero Width Space = 0
  ONE: '\u200C',       // Zero Width Non-Joiner = 1

  // Compression marker (at file start)
  COMPRESS: '\u200D',  // ZWJ = Compressed before encoding
  // No marker = No compression

  // Complete invisible characters dictionary (for analysis)
  dictionary: {
    ZWSP: { char: '\u200B', code: 8203, unicode: '\\u200B', name: 'Zero Width Space' },
    ZWNJ: { char: '\u200C', code: 8204, unicode: '\\u200C', name: 'Zero Width Non-Joiner' },
    ZWJ: { char: '\u200D', code: 8205, unicode: '\\u200D', name: 'Zero Width Joiner' },
    ZWNBSP: { char: '\uFEFF', code: 65279, unicode: '\\uFEFF', name: 'Zero Width No-Break Space (BOM)' },
    LRM: { char: '\u200E', code: 8206, unicode: '\\u200E', name: 'Left-to-Right Mark' },
    RLM: { char: '\u200F', code: 8207, unicode: '\\u200F', name: 'Right-to-Left Mark' },
    LRE: { char: '\u202A', code: 8234, unicode: '\\u202A', name: 'Left-to-Right Embedding' },
    RLE: { char: '\u202B', code: 8235, unicode: '\\u202B', name: 'Right-to-Left Embedding' },
    PDF: { char: '\u202C', code: 8236, unicode: '\\u202C', name: 'Pop Directional Formatting' },
    LRO: { char: '\u202D', code: 8237, unicode: '\\u202D', name: 'Left-to-Right Override' },
    RLO: { char: '\u202E', code: 8238, unicode: '\\u202E', name: 'Right-to-Left Override' },
    LRI: { char: '\u2066', code: 8294, unicode: '\\u2066', name: 'Left-to-Right Isolate' },
    RLI: { char: '\u2067', code: 8295, unicode: '\\u2067', name: 'Right-to-Left Isolate' },
    FSI: { char: '\u2068', code: 8296, unicode: '\\u2068', name: 'First Strong Isolate' },
    PDI: { char: '\u2069', code: 8297, unicode: '\\u2069', name: 'Pop Directional Isolate' },
    NBSP: { char: '\u00A0', code: 160, unicode: '\\u00A0', name: 'No-Break Space' },
    WJ: { char: '\u2060', code: 8288, unicode: '\\u2060', name: 'Word Joiner' },
    ALM: { char: '\u061C', code: 1564, unicode: '\\u061C', name: 'Arabic Letter Mark' },
    MVS: { char: '\u180E', code: 6158, unicode: '\\u180E', name: 'Mongolian Vowel Separator' },
    SHY: { char: '\u00AD', code: 173, unicode: '\\u00AD', name: 'Soft Hyphen' },
    CGJ: { char: '\u034F', code: 847, unicode: '\\u034F', name: 'Combining Grapheme Joiner' }
  }
};

// Maximum Brotli compression options
const BROTLI_OPTIONS = {
  params: {
    [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_GENERIC,
    [zlib.constants.BROTLI_PARAM_QUALITY]: zlib.constants.BROTLI_MAX_QUALITY, // 11 = maximum compression
    [zlib.constants.BROTLI_PARAM_SIZE_HINT]: 0,
  }
};

// ==================== ENCODING FUNCTIONS ====================

function encodeToInvisible(buffer) {
  let result = '';
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    const binary = byte.toString(2).padStart(8, '0');
    for (const bit of binary) {
      result += bit === '0' ? invisibleChars.ZERO : invisibleChars.ONE;
    }
  }
  return result;
}

function decodeFromInvisible(encoded) {
  // Check and remove compression marker if exists
  let isCompressed = false;
  let cleanEncoded = encoded;

  if (encoded.startsWith(invisibleChars.COMPRESS)) {
    isCompressed = true;
    cleanEncoded = encoded.slice(1);
  }

  const bytes = [];
  for (let i = 0; i < cleanEncoded.length; i += 8) {
    let byte = '';
    for (let j = 0; j < 8 && i + j < cleanEncoded.length; j++) {
      const char = cleanEncoded[i + j];
      if (char === invisibleChars.ZERO) byte += '0';
      else if (char === invisibleChars.ONE) byte += '1';
    }
    if (byte.length === 8) {
      bytes.push(parseInt(byte, 2));
    }
  }

  return { buffer: Buffer.from(bytes), isCompressed };
}

// ==================== COMPRESSION FUNCTIONS ====================

async function compressBuffer(buffer) {
  return await brotliCompress(buffer, BROTLI_OPTIONS);
}

async function decompressBuffer(buffer) {
  return await brotliDecompress(buffer);
}

// ==================== ANALYSIS FUNCTIONS ====================

function analyzeInvisibles(text) {
  const result = {
    length: text.length,
    hasInvisibles: false,
    invisibleCount: 0,
    found: [],
    positions: []
  };

  for (let i = 0; i < text.length; i++) {
    const charCode = text.charCodeAt(i);
    const charInfo = Object.values(invisibleChars.dictionary).find(c => c.code === charCode);
    if (charInfo) {
      result.hasInvisibles = true;
      result.invisibleCount++;
      result.positions.push({
        position: i,
        char: charInfo.name,
        unicode: charInfo.unicode
      });
      if (!result.found.includes(charInfo.name)) {
        result.found.push(charInfo.name);
      }
    }
  }

  return result;
}

function removeInvisibles(text) {
  return text.replace(/[\u00AD\u034F\u061C\u070F\u115F\u1160\u17B4\u17B5\u180B-\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2064\u2066-\u206F\u3164\uFE00-\uFE0F\uFEFF\uFFA0\uFFF9-\uFFFC\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, '');
}

// ==================== RUNNABLE FILE TEMPLATE ====================

function generateRunnableTemplate(encodedContent, originalFileName) {
  return `#!/usr/bin/env node
// Self-extracting executable generated by invjsible
const fs=require('fs'),p=require('path'),z=require('zlib'),{promisify:u}=require('util'),{execSync:e,spawn:s}=require('child_process'),o=require('os'),b=u(z.brotliDecompress),c={Z:'​',O:'‌',C:'‍'};async function x(){try{const n=\`${encodedContent}\`,g=t=>{let r=[],i=0;for(;i<t.length;i+=8){let a='';for(let j=0;j<8&&i+j<t.length;j++)a+=t[i+j]===c.Z?'0':'1';a.length===8&&r.push(parseInt(a,2))}return Buffer.from(r)},d=n[0]===c.C?await b(g(n.slice(1))):g(n),t=p.extname('${originalFileName}').toLowerCase(),f=p.join(o.tmpdir(),\`i\${Date.now()}\${t}\`);fs.writeFileSync(f,d);try{if(t==='.js'||t==='.mjs')require(f);else if(t==='.sh'||t==='.bash')e(\`bash "\${f}"\`,{stdio:'inherit'});else if(t==='.py')e(\`python3 "\${f}"\`,{stdio:'inherit'});else if(t==='.rb')e(\`ruby "\${f}"\`,{stdio:'inherit'});else if(!t||t==='.txt')console.log(d.toString('utf8'));else{fs.chmodSync(f,'755');return void s(f,process.argv.slice(2),{stdio:'inherit'}).on('exit',c=>(fs.unlinkSync(f),process.exit(c)))}fs.unlinkSync(f)}catch(r){fs.unlinkSync(f),console.error('Execution error:',r.message),process.exit(1)}}catch(r){console.error('Extraction error:',r.message),process.exit(1)}}x();`;
}

// ==================== ENCODE ====================

async function encode(inputFile, outputFile, options = {}) {
  const { compress = false, verbose = false, runable = false } = options;

  if (!outputFile) {
    outputFile = inputFile + '.encoded';
  }

  if (verbose) {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           ENCODING TO INVISIBLE CHARACTERS                ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
  }

  // Read original file
  const originalBuffer = fs.readFileSync(inputFile);
  const originalSize = originalBuffer.length;
  const originalFileName = path.basename(inputFile);

  if (verbose) {
    console.log(`📄 Original file: ${inputFile}`);
    console.log(`📊 Original size: ${originalSize.toLocaleString()} bytes`);
    if (runable) console.log(`🏃 Runnable mode: Enabled`);
    console.log('');
  }

  let finalContent;
  let finalSize;
  let methodUsed;

  if (compress) {
    // Calculate without compression
    const encodedDirect = encodeToInvisible(originalBuffer);
    const directSize = Buffer.from(encodedDirect, 'utf8').length;

    // Calculate with compression
    const compressedBuffer = await compressBuffer(originalBuffer);
    const encodedCompressed = encodeToInvisible(compressedBuffer);
    const compressedSize = Buffer.from(encodedCompressed, 'utf8').length;

    if (verbose) {
      console.log('🔹 Option 1: Encode directly');
      console.log(`   Size: ${directSize.toLocaleString()} bytes`);
      console.log(`   Ratio: ${((directSize / originalSize) * 100).toFixed(2)}% of original\n`);

      console.log('🔹 Option 2: Compress then Encode');
      console.log(`   1️⃣  Compression: ${originalSize.toLocaleString()} → ${compressedBuffer.length.toLocaleString()} bytes`);
      console.log(`   2️⃣  Encoding: ${compressedBuffer.length.toLocaleString()} → ${compressedSize.toLocaleString()} bytes`);
      console.log(`   Ratio: ${((compressedSize / originalSize) * 100).toFixed(2)}% of original\n`);

      console.log('╔════════════════════════════════════════════════════════════╗');
      console.log('║                    METHOD COMPARISON                       ║');
      console.log('╚════════════════════════════════════════════════════════════╝\n');
    }

    // Choose the smaller one
    if (compressedSize < directSize) {
      if (verbose) {
        console.log(`✅ Using Option 2 (Compress → Encode) - Smaller by ${directSize - compressedSize} bytes\n`);
      }
      finalContent = invisibleChars.COMPRESS + encodedCompressed;
      finalSize = compressedSize;
      methodUsed = 'COMPRESSED';
    } else {
      if (verbose) {
        console.log(`✅ Using Option 1 (Direct Encode) - Smaller by ${compressedSize - directSize} bytes\n`);
      }
      finalContent = encodedDirect;
      finalSize = directSize;
      methodUsed = 'UNCOMPRESSED';
    }
  } else {
    // No compression - direct encoding
    const encodedDirect = encodeToInvisible(originalBuffer);
    finalSize = Buffer.from(encodedDirect, 'utf8').length;

    if (verbose) {
      console.log('🔹 Direct Encoding (no compression)');
      console.log(`   Size: ${finalSize.toLocaleString()} bytes`);
      console.log(`   Ratio: ${((finalSize / originalSize) * 100).toFixed(2)}% of original\n`);
    }

    finalContent = encodedDirect;
    methodUsed = 'UNCOMPRESSED';
  }

  // ==================== SAVE FILE ====================

  let savedSize;

  if (runable) {
    const runnableContent = generateRunnableTemplate(
      finalContent,
      originalFileName,
      methodUsed === 'COMPRESSED'
    );

    fs.writeFileSync(outputFile, runnableContent, 'utf8');

    // Make executable on Unix systems
    try {
      fs.chmodSync(outputFile, '755');
    } catch (_err) { // eslint-disable-line no-unused-vars
      // Ignore permission errors on Windows
    }

    savedSize = fs.statSync(outputFile).size;

    if (verbose) {
      console.log(`💾 Executable file saved: ${outputFile}`);
      console.log(`📊 Saved size: ${savedSize.toLocaleString()} bytes`);
      console.log(`🏃 Mode: Self-extracting executable`);
      if (methodUsed === 'COMPRESSED') {
        console.log(`🔐 Marker: COMPRESSED (U+${invisibleChars.COMPRESS.charCodeAt(0).toString(16).toUpperCase()})`);
      }
      console.log(`\n💡 Execute with: node ${outputFile}`);
      console.log(`   Or directly: ./${outputFile} (on Unix/Linux/Mac)`);
    } else {
      console.log(`✅ Executable file: ${inputFile} → ${outputFile} (${savedSize.toLocaleString()} bytes)`);
    }
  } else {
    // Normal mode (not runnable) - always text with invisible characters
    fs.writeFileSync(outputFile, finalContent, 'utf8');
    savedSize = fs.statSync(outputFile).size;

    if (verbose) {
      console.log(`💾 File saved: ${outputFile}`);
      console.log(`📊 Saved size: ${savedSize.toLocaleString()} bytes`);
      console.log(`📝 Output type: Text file (invisible characters)`);
      if (methodUsed === 'COMPRESSED') {
        console.log(`🔐 Marker: COMPRESSED (U+${invisibleChars.COMPRESS.charCodeAt(0).toString(16).toUpperCase()})`);
      }
    } else {
      console.log(`✅ Encoded: ${inputFile} → ${outputFile} (${savedSize.toLocaleString()} bytes, ${methodUsed})`);
    }
  }

  if (verbose) {
    console.log('\n✨ Encoding completed\n');
  }
}

// ==================== DECODE ====================

async function decode(inputFile, outputFile = null, options = {}) {
  const { verbose = false } = options;

  if (verbose) {
    console.log('\n╔════════════════════════════════════════════════════════════╗');
    console.log('║           DECODING FROM INVISIBLE CHARACTERS              ║');
    console.log('╚════════════════════════════════════════════════════════════╝\n');
    console.log(`📄 Encoded file: ${inputFile}`);
  }

  // Read file
  let encodedContent = fs.readFileSync(inputFile, 'utf8');
  let isRunnable = false;

  // Detect if it's a runnable file (contains the wrapper)
  if (encodedContent.includes('// Self-extracting executable generated by invjsible')) {
    if (verbose) console.log('🏃 Runnable file detected, extracting embedded content...');
    isRunnable = true;

    // Extract encoded content from minified template pattern "const n=`...`"
    const match = encodedContent.match(/const n=`([^`]+)`/s);
    if (match && match[1]) {
      encodedContent = match[1];
      if (verbose) console.log('✅ Embedded content extracted successfully');
    } else {
      console.error('❌ Error: Could not extract content from runnable file');
      process.exit(1);
    }
  }

  // Decode
  const { buffer: decodedBuffer, isCompressed } = decodeFromInvisible(encodedContent);

  if (verbose) {
    if (isCompressed) {
      console.log(`🔐 Compression detected: Yes (marker U+200D)`);
    } else {
      console.log('ℹ️  No compression detected');
    }
    if (isRunnable) {
      console.log('📦 Original file was runnable (content extracted)');
    }
  }

  // Decompress if necessary
  let finalBuffer = decodedBuffer;
  if (isCompressed) {
    if (verbose) console.log('🔓 Decompressing content...');
    finalBuffer = await decompressBuffer(decodedBuffer);
  }

  // Generate output name
  if (!outputFile) {
    if (inputFile.endsWith('.encoded')) {
      outputFile = inputFile.replace(/\.encoded$/, '.decoded');
    } else if (isRunnable) {
      outputFile = inputFile.replace(/\.encoded$/, '') + '.decoded';
    } else {
      outputFile = inputFile + '.decoded';
    }
  }

  fs.writeFileSync(outputFile, finalBuffer);

  if (verbose) {
    console.log(`\n✅ Decoded file: ${outputFile}`);
    console.log(`📊 Recovered size: ${finalBuffer.length.toLocaleString()} bytes`);
    console.log('\n✨ Decoding completed\n');
  } else {
    console.log(`✅ Decoded: ${inputFile} → ${outputFile} (${finalBuffer.length.toLocaleString()} bytes)`);
  }
}

// ==================== ANALYZE ====================

function analyze(inputFile) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              INVISIBLE CHARACTERS ANALYSIS                 ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const content = fs.readFileSync(inputFile, 'utf8');
  const analysis = analyzeInvisibles(content);

  console.log(`📄 File: ${inputFile}`);
  console.log(`📊 Size: ${content.length.toLocaleString()} characters`);
  console.log(`📊 Bytes: ${Buffer.from(content, 'utf8').length.toLocaleString()} bytes\n`);

  if (analysis.hasInvisibles) {
    console.log(`✅ Contains invisible characters: YES`);
    console.log(`📈 Total count: ${analysis.invisibleCount.toLocaleString()}`);
    console.log(`🔢 Different types: ${analysis.found.length}\n`);

    console.log('📋 Types found:');
    analysis.found.forEach((char, index) => {
      console.log(`   ${index + 1}. ${char}`);
    });

    if (analysis.positions.length <= 20) {
      console.log('\n📍 Positions:');
      analysis.positions.forEach(pos => {
        console.log(`   Pos ${pos.position}: ${pos.char} (${pos.unicode})`);
      });
    } else {
      console.log(`\n📍 Showing first 20 positions of ${analysis.positions.length}:`);
      analysis.positions.slice(0, 20).forEach(pos => {
        console.log(`   Pos ${pos.position}: ${pos.char} (${pos.unicode})`);
      });
      console.log(`   ... and ${analysis.positions.length - 20} more`);
    }
  } else {
    console.log(`❌ Contains invisible characters: NO`);
  }

  console.log('\n✨ Analysis completed\n');
}

// ==================== CLEAN ====================

function clean(inputFile, outputFile = null) {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              INVISIBLE CHARACTERS CLEANUP                  ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const content = fs.readFileSync(inputFile, 'utf8');
  const originalSize = content.length;
  const cleaned = removeInvisibles(content);
  const cleanedSize = cleaned.length;
  const removed = originalSize - cleanedSize;

  if (!outputFile) {
    outputFile = inputFile.replace(/(\.[^.]+)$/, '.cleaned$1');
  }

  fs.writeFileSync(outputFile, cleaned, 'utf8');

  console.log(`📄 Original file: ${inputFile}`);
  console.log(`📊 Original size: ${originalSize.toLocaleString()} characters`);
  console.log(`🧹 Characters removed: ${removed.toLocaleString()}`);
  console.log(`📊 Clean size: ${cleanedSize.toLocaleString()} characters`);
  console.log(`💾 File saved: ${outputFile}\n`);
  console.log('✨ Cleanup completed\n');
}

// ==================== LIST ====================

function list() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║           AVAILABLE INVISIBLE CHARACTERS                   ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('🔹 Encoding characters:');
  console.log(`   0: Zero Width Space (U+200B)`);
  console.log(`   1: Zero Width Non-Joiner (U+200C)`);
  console.log(`\n🔹 Compression marker:`);
  console.log(`   COMPRESSED: Zero Width Joiner (U+200D)`);

  console.log('\n🔹 Complete invisible characters dictionary:\n');

  const entries = Object.entries(invisibleChars.dictionary);
  entries.forEach(([key, value], index) => {
    const hex = `U+${value.code.toString(16).toUpperCase().padStart(4, '0')}`;
    console.log(`   ${(index + 1).toString().padStart(2)}. ${key.padEnd(8)} ${hex.padEnd(10)} ${value.name}`);
  });

  console.log(`\n📊 Total: ${entries.length} documented invisible characters\n`);
}

// ==================== HELP ====================

function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║        INVJSIBLE - Invisible Characters Encoder            ║
╚════════════════════════════════════════════════════════════╝

USAGE:
  node invjsible.js <command> [options]

COMMANDS:

  encode <file> [options]
    Encode a file using invisible characters

    Options:
      --compress        Compare compressed vs uncompressed, use smaller
      --runable         Generate self-extracting JavaScript executable
      -o, --output      Output file (default: <file>.encoded)
      -v, --verbose     Show detailed information

    Examples:
      # Pure invisible characters
      node invjsible.js encode message.txt
      
      # With compression (auto-selects best)
      node invjsible.js encode message.txt --compress
      
      # Self-extracting executable
      node invjsible.js encode script.js --compress --runable
      
      # Verbose mode
      node invjsible.js encode data.json --compress -v

  decode <file> [options]
    Decode a file with invisible characters

    Options:
      -o, --output      Output file (default: <file>.decoded)
      -v, --verbose     Show detailed information

    Examples:
      node invjsible.js decode message.txt.encoded
      node invjsible.js decode encoded.txt -o original.txt

  analyze <file>
    Analyze and show invisible characters in a file

    Example:
      node invjsible.js analyze document.txt

  clean <file> [options]
    Remove all invisible characters from a file

    Options:
      -o, --output      Output file (default: <file>.cleaned)

    Example:
      node invjsible.js clean document.txt

  list
    Show all available invisible characters

    Example:
      node invjsible.js list

  help
    Show this help

ENCODING MODES:

  Without --compress:
    Original → Encode → Invisible characters output
    
  With --compress:
    Compares two options and uses the smaller:
    1. Original → Encode
    2. Original → Compress → Encode
    
    Output is ALWAYS invisible characters (never binary)

RUNNABLE MODE:

  With --runable option, creates a self-extracting JavaScript
  executable that decodes and runs automatically.

  Features:
    🔹 Works with JavaScript, Python, Shell, Ruby files
    🔹 For text files, displays the content
    🔹 For binaries, attempts direct execution
    🔹 Compatible with compression (--compress --runable)
    🔹 Executable with: node file.encoded or ./file.encoded

  Example:
    node invjsible.js encode app.js --compress --runable
    node app.js.encoded

COMPRESSION:

  When you use --compress, the tool:
  1. Calculates size with direct encoding
  2. Calculates size with compression + encoding
  3. Automatically uses the smaller result
  
  Output is ALWAYS invisible characters (text file)
  
  If compressed, file starts with compression marker (U+200D)
  Decoding is automatic based on marker detection

COMPLETE EXAMPLES:

  # Pure invisible encoding
  node invjsible.js encode secret.txt
  cat secret.txt.encoded  # Looks blank!
  
  # Compressed (auto-selects best method)
  node invjsible.js encode document.txt --compress -v
  
  # Self-extracting executable
  node invjsible.js encode server.js --compress --runable
  node server.js.encoded
  
  # Decode any format
  node invjsible.js decode file.encoded
  
  # Analyze invisible content
  node invjsible.js analyze suspicious.txt
  
  # Clean invisibles
  node invjsible.js clean document.txt

NOTES:
  - All output is invisible characters (never binary)
  - Compression compares both methods and uses smaller
  - Brotli compression uses maximum level (11)
  - Decoding is automatic based on marker detection
  - Runnable mode creates self-contained executables
  `);
}

// ==================== CLI PARSER ====================

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args[0] === 'help' || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'encode': {
        if (args.length < 2) {
          console.error('❌ Error: You must specify a file');
          console.error('Usage: node invjsible.js encode <file> [--compress] [--runable] [-o output] [-v]');
          process.exit(1);
        }

        const inputFile = args[1];
        if (!fs.existsSync(inputFile)) {
          console.error(`❌ Error: File "${inputFile}" does not exist`);
          process.exit(1);
        }

        const compress = args.includes('--compress');
        const runable = args.includes('--runable');
        const verbose = args.includes('--verbose') || args.includes('-v');

        let outputFile;
        const outputIndex = args.indexOf('--output') !== -1 ? args.indexOf('--output') : args.indexOf('-o');
        if (outputIndex !== -1 && args[outputIndex + 1]) {
          outputFile = args[outputIndex + 1];
        } else {
          outputFile = inputFile + '.encoded';
        }

        await encode(inputFile, outputFile, { compress, verbose, runable });
        break;
      }

      case 'decode': {
        if (args.length < 2) {
          console.error('❌ Error: You must specify a file');
          console.error('Usage: node invjsible.js decode <file> [-o output] [-v]');
          process.exit(1);
        }

        const inputFile = args[1];
        if (!fs.existsSync(inputFile)) {
          console.error(`❌ Error: File "${inputFile}" does not exist`);
          process.exit(1);
        }

        const verbose = args.includes('--verbose') || args.includes('-v');

        let outputFile = null;
        const outputIndex = args.indexOf('--output') !== -1 ? args.indexOf('--output') : args.indexOf('-o');
        if (outputIndex !== -1 && args[outputIndex + 1]) {
          outputFile = args[outputIndex + 1];
        }

        await decode(inputFile, outputFile, { verbose });
        break;
      }

      case 'analyze': {
        if (args.length < 2) {
          console.error('❌ Error: You must specify a file');
          console.error('Usage: node invjsible.js analyze <file>');
          process.exit(1);
        }

        const inputFile = args[1];
        if (!fs.existsSync(inputFile)) {
          console.error(`❌ Error: File "${inputFile}" does not exist`);
          process.exit(1);
        }

        analyze(inputFile);
        break;
      }

      case 'clean': {
        if (args.length < 2) {
          console.error('❌ Error: You must specify a file');
          console.error('Usage: node invjsible.js clean <file> [-o output]');
          process.exit(1);
        }

        const inputFile = args[1];
        if (!fs.existsSync(inputFile)) {
          console.error(`❌ Error: File "${inputFile}" does not exist`);
          process.exit(1);
        }

        let outputFile = null;
        const outputIndex = args.indexOf('--output') !== -1 ? args.indexOf('--output') : args.indexOf('-o');
        if (outputIndex !== -1 && args[outputIndex + 1]) {
          outputFile = args[outputIndex + 1];
        }

        clean(inputFile, outputFile);
        break;
      }

      case 'list': {
        list();
        break;
      }

      default: {
        console.error(`❌ Error: Unknown command "${command}"`);
        console.error('Use "node invjsible.js help" to see available commands');
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (args.includes('--verbose') || args.includes('-v')) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ==================== EXECUTE ====================

if (require.main === module) {
  main();
}

module.exports = {
  encode,
  decode,
  analyze,
  clean,
  list, // jest only
  showHelp, // jest only
  main, // jest only
  encodeToInvisible,
  decodeFromInvisible,
  invisibleChars
};
