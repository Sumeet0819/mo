import * as FileSystem from 'expo-file-system/legacy';

// Fast Base64 lookup table and decoder
const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const lookup = new Uint8Array(256);
for (let i = 0; i < chars.length; i++) {
  lookup[chars.charCodeAt(i)] = i;
}
lookup['-'.charCodeAt(0)] = 62;
lookup['_'.charCodeAt(0)] = 63;

function decodeBase64(base64: string): Uint8Array {
  // Remove all non-base64 characters (whitespaces, newlines, carriage returns, padding "=")
  const cleanBase64 = base64
    .replace(/[^A-Za-z0-9+\/_-]/g, '')
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const len = cleanBase64.length;
  const bufferLength = Math.floor(len * 0.75);
  const bytes = new Uint8Array(bufferLength);

  let p = 0;
  for (let i = 0; i < len; i += 4) {
    const encoded1 = lookup[cleanBase64.charCodeAt(i)] || 0;
    const encoded2 = lookup[cleanBase64.charCodeAt(i + 1)] || 0;
    const encoded3 = lookup[cleanBase64.charCodeAt(i + 2)] || 0;
    const encoded4 = lookup[cleanBase64.charCodeAt(i + 3)] || 0;

    bytes[p++] = (encoded1 << 2) | (encoded2 >> 4);
    if (p < bufferLength) {
      bytes[p++] = ((encoded2 & 15) << 4) | (encoded3 >> 2);
    }
    if (p < bufferLength) {
      bytes[p++] = ((encoded3 & 3) << 6) | (encoded4 & 63);
    }
  }

  return bytes;
}

// Convert a subset of a Uint8Array to a Base64 string (for outputting the image)
function encodeBase64(bytes: Uint8Array, start: number, end: number): string {
  let base64 = '';
  const len = end;
  for (let i = start; i < len; i += 3) {
    const b1 = bytes[i];
    const b2 = i + 1 < len ? bytes[i + 1] : NaN;
    const b3 = i + 2 < len ? bytes[i + 2] : NaN;

    const enc1 = b1 >> 2;
    const enc2 = ((b1 & 3) << 4) | (isNaN(b2) ? 0 : b2 >> 4);
    const enc3 = isNaN(b2) ? 64 : ((b2 & 15) << 2) | (isNaN(b3) ? 0 : b3 >> 6);
    const enc4 = isNaN(b3) ? 64 : b3 & 63;

    base64 += chars.charAt(enc1) + chars.charAt(enc2) +
              (enc3 === 64 ? '=' : chars.charAt(enc3)) +
              (enc4 === 64 ? '=' : chars.charAt(enc4));
  }
  return base64;
}

export async function getAlbumArt(fileUri: string, trackId: string): Promise<string | null> {
  let tempFile: string | null = null;
  try {
    let targetUri = fileUri;
    
    // Copy content:// or ph:// URIs to a temp local file in cache so FileSystem.readAsStringAsync works with position/length
    if (fileUri.startsWith('content://') || fileUri.startsWith('ph://')) {
      const cleanTrackId = trackId.replace(/[^A-Za-z0-9]/g, '');
      tempFile = `${FileSystem.cacheDirectory}temp_art_${cleanTrackId}.mp3`;
      console.log(`[MetadataService] Copying ${fileUri} -> local cache: ${tempFile}`);
      await FileSystem.copyAsync({
        from: fileUri,
        to: tempFile,
      });
      targetUri = tempFile;
    }

    // 1. Read first 10 bytes to parse ID3 header
    const headerBase64 = await FileSystem.readAsStringAsync(targetUri, {
      position: 0,
      length: 10,
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!headerBase64) return null;
    const headerBytes = decodeBase64(headerBase64);

    // Verify "ID3" marker
    if (
      headerBytes[0] !== 0x49 || // 'I'
      headerBytes[1] !== 0x44 || // 'D'
      headerBytes[2] !== 0x33    // '3'
    ) {
      console.log('[MetadataService] No ID3 marker found for:', targetUri);
      return null;
    }

    const version = headerBytes[3]; // Major version (e.g. 3 for ID3v2.3, 4 for ID3v2.4)
    
    // Synchsafe integer size parsing (7 bits per byte)
    const tagSize =
      (headerBytes[6] << 21) |
      (headerBytes[7] << 14) |
      (headerBytes[8] << 7) |
      headerBytes[9];

    // Total tag size is tagSize + 10 bytes header
    const totalSize = tagSize + 10;
    
    // Cap at 3MB to avoid out-of-memory issues
    const readSize = Math.min(totalSize, 3 * 1024 * 1024);
    console.log(`[MetadataService] Found ID3v2.${version} tag, tag size: ${tagSize} bytes, reading: ${readSize} bytes`);

    // 2. Read the entire ID3 tag
    const tagBase64 = await FileSystem.readAsStringAsync(targetUri, {
      position: 0,
      length: readSize,
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!tagBase64) return null;
    const bytes = decodeBase64(tagBase64);

    let offset = 10; // Skip 10 bytes of ID3v2 header
    const limit = bytes.length;

    while (offset < limit - 10) {
      let frameId = '';
      let frameSize = 0;
      let headerLength = 10;

      if (version === 2) {
        // ID3v2.2: 3-byte frame ID, 3-byte size, no flags
        frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2]);
        frameSize = (bytes[offset + 3] << 16) | (bytes[offset + 4] << 8) | bytes[offset + 5];
        headerLength = 6;
      } else {
        // ID3v2.3 or ID3v2.4: 4-byte frame ID, 4-byte size, 2-byte flags
        frameId = String.fromCharCode(
          bytes[offset],
          bytes[offset + 1],
          bytes[offset + 2],
          bytes[offset + 3]
        );

        if (version === 4) {
          // ID3v2.4 uses synchsafe integers for frame size
          frameSize =
            (bytes[offset + 4] << 21) |
            (bytes[offset + 5] << 14) |
            (bytes[offset + 6] << 7) |
            bytes[offset + 7];
        } else {
          // ID3v2.3 uses standard 32-bit big-endian integers for frame size
          frameSize =
            (bytes[offset + 4] << 24) |
            (bytes[offset + 5] << 16) |
            (bytes[offset + 6] << 8) |
            bytes[offset + 7];
        }
        headerLength = 10;
      }

      // If we see padding (0x00 frame ID) or out of bounds frame size, stop parsing
      if (!frameId || frameId[0] === '\0' || frameSize <= 0 || offset + headerLength + frameSize > limit) {
        break;
      }

      // Check if it's the picture frame: APIC (ID3v2.3+) or PIC (ID3v2.2)
      if (frameId === 'APIC' || frameId === 'PIC') {
        console.log(`[MetadataService] Found picture frame: ${frameId}, size: ${frameSize} bytes`);
        const frameDataOffset = offset + headerLength;
        
        let p = frameDataOffset;
        const encoding = bytes[p++]; // Text encoding byte
        
        let mimeType = '';
        if (frameId === 'APIC') {
          // Null-terminated MIME type string
          while (p < frameDataOffset + frameSize && bytes[p] !== 0) {
            mimeType += String.fromCharCode(bytes[p++]);
          }
          p++; // Skip null terminator
        } else {
          // ID3v2.2 PIC uses 3-character format (e.g. "JPG", "PNG")
          const format = String.fromCharCode(bytes[p], bytes[p + 1], bytes[p + 2]).toUpperCase();
          mimeType = format === 'PNG' ? 'image/png' : 'image/jpeg';
          p += 3;
        }

        const pictureType = bytes[p++]; // Picture type (0x03 is Cover front)
        
        // Skip description (null-terminated string)
        if (encoding === 1 || encoding === 2) {
          // UTF-16: search for double null (0x00 0x00) incrementing by 1 to avoid alignment misses
          while (p < frameDataOffset + frameSize - 1) {
            if (bytes[p] === 0 && bytes[p + 1] === 0) {
              p += 2;
              break;
            }
            p++;
          }
        } else {
          // ISO-8859-1 or UTF-8: search for single null (0x00)
          while (p < frameDataOffset + frameSize) {
            if (bytes[p] === 0) {
              p++;
              break;
            }
            p++;
          }
        }

        // The remaining bytes in the frame are the binary image data
        const imageStart = p;
        const imageEnd = frameDataOffset + frameSize;

        if (imageStart >= imageEnd) {
          console.log('[MetadataService] APIC frame contains no picture data.');
          return null;
        }

        const base64Data = encodeBase64(bytes, imageStart, imageEnd);
        console.log(`[MetadataService] Extracted image base64, length: ${base64Data.length} chars`);
        return `data:${mimeType || 'image/jpeg'};base64,${base64Data}`;
      }

      offset += headerLength + frameSize;
    }
  } catch (error) {
    console.warn('[MetadataService] Error reading ID3 tags:', error);
  } finally {
    if (tempFile) {
      try {
        await FileSystem.deleteAsync(tempFile, { idempotent: true });
        console.log(`[MetadataService] Cleaned up cached temp file: ${tempFile}`);
      } catch (err) {
        console.warn('[MetadataService] Error cleaning up temp file:', err);
      }
    }
  }
  return null;
}
