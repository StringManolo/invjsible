# invjsible

> Encode any file into invisible Unicode characters. Hide data in plain sight.

[![License: GPLV3](https://img.shields.io/badge/License-GPLV3-yellow.svg)](https://opensource.org/licenses/GPLV3)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org/)
[![Tests](https://img.shields.io/badge/tests-passing-brightgreen)](https://github.com/stringmanolo/invjsible)

**invjsible** is a powerful CLI tool that encodes files using invisible Unicode characters (Zero-Width Spaces, Zero-Width Non-Joiners, etc.). The encoded files look completely blank but contain all the original data. Perfect for steganography, data hiding, or just having fun with invisible text.

## ✨ Features

- 🔒 **Invisible Encoding**: Encode any file into invisible Unicode characters
- 📦 **Maximum Compression**: Uses Brotli compression at maximum level (11)
- 🏃 **Self-Extracting**: Create runnable files that auto-extract and execute
- 🔄 **Lossless**: Perfect roundtrip encoding/decoding with no data loss
- 🎯 **Multi-Format**: Works with text, binary, JavaScript, Python, Shell, Ruby files
- 🔍 **Analysis Tools**: Detect and analyze invisible characters in files
- 🧹 **Cleanup**: Remove invisible characters from contaminated files
- ⚡ **Fast**: Optimized encoding/decoding algorithms

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/stringmanolo/invjsible.git
cd invjsible

# Make it executable (Unix/Linux/Mac)
chmod +x invjsible.js

# Create global symlink
npm link
```

## 🚀 Quick Start

```bash
# Encode a file in invisible characters
invjsible encode secret.txt

# Encode a file with compression (Recomended to always use)
invjsible encode secret.txt --compress

# Create a self-extracting executable
invjsible encode app.js --compress --runable

# Run the encoded file
node app.js.encoded
# or ./app.js.encoded

# Decode the file
invjsible decode secret.txt.encoded

# Analyze invisible characters
invjsible analyze suspicious.txt
```

## 📖 Usage

### Commands

#### `encode` - Encode a file

```bash
invjsible encode <file> [options]

Options:
  --compress        Compare direct vs compressed encoding, use smaller
  --runable         Generate self-extracting executable
  -o, --output      Output file (default: <file>.encoded)
  -v, --verbose     Show detailed information

Examples:
  invjsible encode document.txt
  invjsible encode document.txt --compress
  invjsible encode script.js --runable
  invjsible encode app.js --compress --runable -v
```

#### `decode` - Decode a file

```bash
invjsible decode <file> [options]

Options:
  -o, --output      Output file (default: <file>.decoded)
  -v, --verbose     Show detailed information

Examples:
  invjsible decode document.txt.encoded
  invjsible decode encoded.txt -o original.txt
```

#### `analyze` - Analyze invisible characters

```bash
invjsible analyze <file>

Example:
  invjsible analyze suspicious.txt
```

#### `clean` - Remove invisible characters

```bash
invjsible clean <file> [options]

Options:
  -o, --output      Output file (default: <file>.cleaned)

Example:
  invjsible clean document.txt
```

#### `list` - Show available invisible characters

```bash
invjsible list
```

## 🎯 Use Cases

### 1. Steganography

Hide secret messages in plain sight:

```bash
# Encode a secret message
echo "Secret data" > secret.txt
invjsible encode secret.txt

# The .encoded file looks blank but contains the data
cat secret.txt.encoded  # Appears empty!

# Decode to recover
invjsible decode secret.txt.encoded
```

### 2. Self-Extracting Executables

Create files that execute themselves:

```bash
# Encode a Node.js application
invjsible encode server.js --compress --runable

# The encoded file is executable
node server.js.encoded
# or
./server.js.encoded  # On Unix systems
```

### 3. Data Hiding in Documents

Hide data in text documents:

```bash
# Encode binary data
invjsible encode image.png

# Paste the encoded content anywhere in a text document
# The binary data is preserved as invisible characters
```

### 4. Watermarking

Add invisible watermarks to text:

```bash
# Encode watermark data
echo "Copyright StringManolo 2025" >> copy.txt && invjsible encode copy.txt

# Append to any file
cat copy.txt.encoded >> myDocument.txt
# The watermark is invisible but recoverable
```

## 🔧 How It Works

### Encoding Process

1. **Read File**: Load the original file into memory
2. **Compress (Optional)**: Apply Brotli compression at maximum level
3. **Binary Encoding**: Convert each byte to 8-bit binary representation
4. **Invisible Mapping**:
   - `0` → Zero-Width Space (`U+200B`)
   - `1` → Zero-Width Non-Joiner (`U+200C`)
5. **Marker Addition**: Add compression marker if compressed
6. **Save**: Write the invisible character string to file

### Compression Methods

When you use `--compress`, invjsible automatically compares two methods and chooses the smaller result:

**Option 1: Direct Encode**
- Encode directly without compression
- Faster encoding

**Option 2: Compress → Encode**
- Compress first with Brotli, then encode
- Best for most files, especially repetitive content
- Marked with Zero-Width Joiner (`U+200D`)

The tool automatically selects the most efficient method, ensuring you always get the smallest possible output.

### Decoding Process

1. **Detect Format**: Check for compression marker
2. **Decompress (if needed)**: Apply decompression if marker is present
3. **Binary Decoding**: Convert invisible characters back to binary
4. **Reconstruct**: Rebuild the original file byte by byte

## 📊 Compression Performance

Typical compression ratios with `--compress`:

| File Type | Original Size | Encoded Size | Ratio |
|-----------|--------------|--------------|-------|
| Text (repetitive) | 100 KB | ~15 KB | 15% |
| Text (random) | 100 KB | ~30 KB | 30% |
| JavaScript | 100 KB | ~20 KB | 20% |
| Binary (PNG) | 100 KB | ~40 KB | 40% |
| Already Compressed | 100 KB | ~80 KB | 80% |

*Note: Files already compressed (PNG, ZIP, etc.) don't compress well.*

## 🧪 Testing

```bash
# Install Jest
npm install --save-dev jest

# Run all tests
npm test

# Run with coverage report
npm run test:coverage

# Watch mode for development
npm run test:watch

# Generate HTML coverage report
npm test -- --coverage --coverageReporters=html
# Then open: coverage/index.html
```

### Test Coverage

The project has **exceptional test coverage** with **172 comprehensive tests**:

```
Statements   : 99.67% (305/306)
Branches     : 94.59% (140/148)
Functions    : 100%   (19/19)
Lines        : 99.66% (294/295)
```

### Test Categories

✅ **Core Functionality**
- Encoding/decoding with invisible characters
- Compression vs non-compression selection
- Binary encoding (all byte values 0x00-0xFF)

✅ **CLI Commands**
- All commands: `encode`, `decode`, `analyze`, `clean`, `list`, `help`
- All flags: `--compress`, `--runable`, `--verbose`, `-o`, `--output`
- Error handling for all commands

✅ **Runnable Templates**
- Self-extracting executables for: `.js`, `.mjs`, `.sh`, `.bash`, `.py`, `.rb`, `.txt`
- Files without extensions
- Compression in runnable mode

✅ **File Types**
- Text files (ASCII, UTF-8, Unicode)
- Binary files (images, executables)
- Empty files
- Files with special characters and emojis
- Files with null bytes

✅ **Edge Cases**
- Empty buffers and files
- Incomplete bytes (7 bits)
- All byte patterns (0x00, 0xFF, 0x55, 0xAA, sequential)
- Maximum compression scenarios
- Files with 20, 21, 50+ invisible characters
- Very long filenames (200+ characters)
- Corrupted compression data

✅ **Integration Tests**
- Complete encode/decode roundtrips
- Preservation of binary data integrity
- Runnable file execution and extraction
- CLI end-to-end workflows

✅ **Performance Tests**
- Large file encoding (< 5 seconds)
- Large file decoding (< 5 seconds)
- Compression efficiency verification

✅ **Platform Compatibility**
- Unix/Linux/Mac permissions (chmod)
- Windows graceful error handling
- Cross-platform file operations

## 🔍 Technical Details

### Invisible Characters Used

| Character | Unicode | Code | Usage |
|-----------|---------|------|-------|
| Zero-Width Space | U+200B | 8203 | Binary `0` |
| Zero-Width Non-Joiner | U+200C | 8204 | Binary `1` |
| Zero-Width Joiner | U+200D | 8205 | Compression marker |

### File Format

```
[Optional: 1-byte compression marker (U+200D)]
[Invisible character string representing binary data]
```

### Runnable File Format

```javascript
#!/usr/bin/env node
// Self-extracting executable generated by invjsible
[Minified decoder + embedded invisible data]
```


## 📝 API Usage

You can also use invjsible as a module:

```javascript
const { encode, decode, encodeToInvisible, decodeFromInvisible } = require('./invjsible.js');

// Encode a buffer
const buffer = Buffer.from('Hello World');
const invisible = encodeToInvisible(buffer);
console.log(invisible); // Invisible characters

// Decode back
const { buffer: decoded } = decodeFromInvisible(invisible);
console.log(decoded.toString()); // "Hello World"

// Encode a file
await encode('input.txt', 'output.encoded', {
  compress: true,
  runable: false,
  verbose: true
});

// Decode a file
await decode('output.encoded', 'output.decoded', {
  verbose: true
});
```

## 🛡️ Security Considerations

- **Not Encryption**: This is encoding, not encryption. Data is not secure.
- **Obfuscation Only**: Provides obscurity, not cryptographic security.
- **Steganography**: Good for hiding data in plain sight.
- **No Authentication**: No way to verify data integrity or authenticity.

For actual security, combine with encryption tools like `gpg`:

```bash
# Encrypt then encode
gpg --encrypt secret.txt
invjsible encode secret.txt.gpg

# Decode then decrypt
invjsible decode secret.txt.gpg.encoded
gpg --decrypt secret.txt.gpg.decoded
```

## Example

> This is an example of hidding a message into a html file and recovering it.

0. Create the html file
```bash
echo '<!DOCTYPE html>
<html lang="en">
  <head prefix="og:http://ogp.me/ns#">
  <meta charset="utf-8">
    <link rel="icon" href="data:;base64,iVBORw0KGgo=">
  <title>Hello World</title>
</head>
<body><!-- This html file contains hidden data -->
  <div id="myApp"></div>
  <script>
  const myApp = document.querySelector("#myApp");
  myApp.innerText="Hello World!"
  </script>
</body>
</html>' > myIndex.html
```

1. Check the html file has no hidden data:
```bash
cat myIndex.html | xxd
```

```html
00000000: 3c21 444f 4354 5950 4520 6874 6d6c 3e0a  <!DOCTYPE html>.
00000010: 3c68 746d 6c20 6c61 6e67 3d22 656e 223e  <html lang="en">
00000020: 0a3c 6865 6164 2070 7265 6669 783d 226f  .<head prefix="o
00000030: 673a 6874 7470 3a2f 2f6f 6770 2e6d 652f  g:http://ogp.me/
00000040: 6e73 2322 3e0a 2020 3c6d 6574 6120 6368  ns#">.  <meta ch
00000050: 6172 7365 743d 2275 7466 2d38 223e 0a20  arset="utf-8">.
00000060: 203c 6c69 6e6b 2072 656c 3d22 6963 6f6e   <link rel="icon
00000070: 2220 6872 6566 3d22 6461 7461 3a3b 6261  " href="data:;ba
00000080: 7365 3634 2c69 5642 4f52 7730 4b47 676f  se64,iVBORw0KGgo
00000090: 3d22 3e0a 2020 3c74 6974 6c65 3e48 656c  =">.  <title>Hel
000000a0: 6c6f 2057 6f72 6c64 3c2f 7469 746c 653e  lo World</title>
000000b0: 0a3c 2f68 6561 643e 0a3c 626f 6479 3e3c  .</head>.<body><
000000c0: 212d 2d20 5468 6973 2068 746d 6c20 6669  !-- This html fi
000000d0: 6c65 2063 6f6e 7461 696e 7320 6869 6464  le contains hidd
000000e0: 656e 2064 6174 6120 2d2d 3e0a 2020 3c64  en data -->.  <d
000000f0: 6976 2069 643d 226d 7941 7070 223e 3c2f  iv id="myApp"></
00000100: 6469 763e 0a20 203c 7363 7269 7074 3e0a  div>.  <script>.
00000110: 2020 636f 6e73 7420 6d79 4170 7020 3d20    const myApp =
00000120: 646f 6375 6d65 6e74 2e71 7565 7279 5365  document.querySe
00000130: 6c65 6374 6f72 2822 236d 7941 7070 2229  lector("#myApp")
00000140: 3b0a 2020 6d79 4170 702e 696e 6e65 7254  ;.  myApp.innerT
00000150: 6578 743d 2248 656c 6c6f 2057 6f72 6c64  ext="Hello World
00000160: 2122 0a20 203c 2f73 6372 6970 743e 0a3c  !".  </script>.<
00000170: 2f62 6f64 793e 0a3c 2f68 746d 6c3e 0a    /body>.</html>.
```

2. Create a hidden message (you can reaname any file to secret.txt)
```bash
echo "I'm a secret message" > secret.txt
```

3. Encode the message
```bash
invjsible encode secret.txt
```

4. Split the html in half by the line you want (9 in my case)
```bash
head -n 9 myIndex.html > half1.html

tail -n +10 myIndex.html > half2.html
```

5. Create the file with the hidden message:
```bash
cat half1.html secret.txt.encoded half2.html > index.html
```

6. Check the file has the hidden data
```bash
cat index.html | xxd
```

```html
00000000: 3c21 444f 4354 5950 4520 6874 6d6c 3e0a  <!DOCTYPE html>.
00000010: 3c68 746d 6c20 6c61 6e67 3d22 656e 223e  <html lang="en">
00000020: 0a20 203c 6865 6164 2070 7265 6669 783d  .  <head prefix=
00000030: 226f 673a 6874 7470 3a2f 2f6f 6770 2e6d  "og:http://ogp.m
00000040: 652f 6e73 2322 3e0a 2020 3c6d 6574 6120  e/ns#">.  <meta
00000050: 6368 6172 7365 743d 2275 7466 2d38 223e  charset="utf-8">
00000060: 0a20 2020 203c 6c69 6e6b 2072 656c 3d22  .    <link rel="
00000070: 6963 6f6e 2220 6872 6566 3d22 6461 7461  icon" href="data
00000080: 3a3b 6261 7365 3634 2c69 5642 4f52 7730  :;base64,iVBORw0
00000090: 4b47 676f 3d22 3e0a 2020 3c74 6974 6c65  KGgo=">.  <title
000000a0: 3e48 656c 6c6f 2057 6f72 6c64 3c2f 7469  >Hello World</ti
000000b0: 746c 653e 0a3c 2f68 6561 643e 0a3c 626f  tle>.</head>.<bo
000000c0: 6479 3e3c 212d 2d20 5468 6973 2068 746d  dy><!-- This htm
000000d0: 6c20 6669 6c65 2063 6f6e 7461 696e 7320  l file contains
000000e0: 6869 6464 656e 2064 6174 6120 2d2d 3e0a  hidden data -->.
000000f0: 2020 3c64 6976 2069 643d 226d 7941 7070    <div id="myApp
00000100: 223e 3c2f 6469 763e 0ae2 808b e280 8ce2  "></div>........
00000110: 808b e280 8be2 808c e280 8be2 808b e280  ................
00000120: 8ce2 808b e280 8be2 808c e280 8be2 808b  ................
00000130: e280 8ce2 808c e280 8ce2 808b e280 8ce2  ................
00000140: 808c e280 8be2 808c e280 8ce2 808b e280  ................
00000150: 8ce2 808b e280 8be2 808c e280 8be2 808b  ................
00000160: e280 8be2 808b e280 8be2 808b e280 8ce2  ................
00000170: 808c e280 8be2 808b e280 8be2 808b e280  ................
00000180: 8ce2 808b e280 8be2 808c e280 8be2 808b  ................
00000190: e280 8be2 808b e280 8be2 808b e280 8ce2  ................
000001a0: 808c e280 8ce2 808b e280 8be2 808c e280  ................
000001b0: 8ce2 808b e280 8ce2 808c e280 8be2 808b  ................
000001c0: e280 8ce2 808b e280 8ce2 808b e280 8ce2  ................
000001d0: 808c e280 8be2 808b e280 8be2 808c e280  ................
000001e0: 8ce2 808b e280 8ce2 808c e280 8ce2 808b  ................
000001f0: e280 8be2 808c e280 8be2 808b e280 8ce2  ................
00000200: 808c e280 8be2 808b e280 8ce2 808b e280  ................
00000210: 8ce2 808b e280 8ce2 808c e280 8ce2 808b  ................
00000220: e280 8ce2 808b e280 8be2 808b e280 8be2  ................
00000230: 808c e280 8be2 808b e280 8be2 808b e280  ................
00000240: 8be2 808b e280 8ce2 808c e280 8be2 808c  ................
00000250: e280 8ce2 808b e280 8ce2 808b e280 8ce2  ................
00000260: 808c e280 8be2 808b e280 8ce2 808b e280  ................
00000270: 8ce2 808b e280 8ce2 808c e280 8ce2 808b  ................
00000280: e280 8be2 808c e280 8ce2 808b e280 8ce2  ................
00000290: 808c e280 8ce2 808b e280 8be2 808c e280  ................
000002a0: 8ce2 808b e280 8ce2 808c e280 8be2 808b  ................
000002b0: e280 8be2 808b e280 8ce2 808b e280 8ce2  ................
000002c0: 808c e280 8be2 808b e280 8ce2 808c e280  ................
000002d0: 8ce2 808b e280 8ce2 808c e280 8be2 808b  ................
000002e0: e280 8ce2 808b e280 8ce2 808b e280 8be2  ................
000002f0: 808b e280 8be2 808c e280 8be2 808c e280  ................
00000300: 8b20 203c 7363 7269 7074 3e0a 2020 636f  .  <script>.  co
00000310: 6e73 7420 6d79 4170 7020 3d20 646f 6375  nst myApp = docu
00000320: 6d65 6e74 2e71 7565 7279 5365 6c65 6374  ment.querySelect
00000330: 6f72 2822 236d 7941 7070 2229 3b0a 2020  or("#myApp");.
00000340: 6d79 4170 702e 696e 6e65 7254 6578 743d  myApp.innerText=
00000350: 2248 656c 6c6f 2057 6f72 6c64 2122 0a20  "Hello World!".
00000360: 203c 2f73 6372 6970 743e 0a3c 2f62 6f64   </script>.</bod
00000370: 793e 0a3c 2f68 746d 6c3e 0a              y>.</html>.
```

> Chrome's view-source: cat, curl and other commands will not show the hidden data.

7. To decode, split the index.html in half, get the line with encoded data and decode it
```bash
# 1. Get line number 10 directly
sed -n '10p' index.html > secret.txt.encoded

# 2. Decode and print it.
invjsible decode secret.txt.encoded && cat secret.txt.decoded

# Using a single line:
sed -n '10p' index.html > secret.txt.encoded && invjsible decode secret.txt.encoded && cat secret.txt.decoded
```



## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the GPLV3 License - see the [LICENSE](LICENSE) file for details.

## 🌟 Star History

If you find this project useful, please consider giving it a ⭐ on GitHub!
