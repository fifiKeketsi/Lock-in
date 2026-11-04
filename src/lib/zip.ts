// Minimal pure-JavaScript ZIP builder using uncompressed (Store) records.
// Compatible with Chrome, Windows Explorer, macOS, and Linux without any external dependencies.

function createCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const crcTable = createCrcTable();

function calculateCrc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = crcTable[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export interface ZipFileInput {
  name: string;
  content: string | Uint8Array;
}

export function createZipBlob(files: ZipFileInput[]): Blob {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let currentOffset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = typeof file.content === "string" ? encoder.encode(file.content) : file.content;
    const crc = calculateCrc32(contentBytes);
    const size = contentBytes.length;

    // Local Header (30 bytes + name length + content length)
    const localHeader = new Uint8Array(30 + nameBytes.length + size);
    const lView = new DataView(localHeader.buffer);

    lView.setUint32(0, 0x04034b50, true); // Local file header signature
    lView.setUint16(4, 20, true);         // Version needed: 2.0
    lView.setUint16(6, 0, true);          // General purpose bit flag
    lView.setUint16(8, 0, true);          // Compression method: 0 (Store)
    lView.setUint16(10, 0, true);         // Last mod time
    lView.setUint16(12, 0, true);         // Last mod date
    lView.setUint32(14, crc, true);        // CRC-32
    lView.setUint32(18, size, true);       // Compressed size
    lView.setUint32(22, size, true);       // Uncompressed size
    lView.setUint16(26, nameBytes.length, true); // File name length
    lView.setUint16(28, 0, true);          // Extra field length

    localHeader.set(nameBytes, 30);
    localHeader.set(contentBytes, 30 + nameBytes.length);
    localHeaders.push(localHeader);

    // Central Directory Header (46 bytes + name length)
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const cView = new DataView(centralHeader.buffer);

    cView.setUint32(0, 0x02014b50, true); // Central directory signature
    cView.setUint16(4, 20, true);         // Version made by: 2.0
    cView.setUint16(6, 20, true);         // Version needed: 2.0
    cView.setUint16(8, 0, true);          // General purpose bit flag
    cView.setUint16(10, 0, true);         // Compression method: 0 (Store)
    cView.setUint16(12, 0, true);         // Last mod time
    cView.setUint16(14, 0, true);         // Last mod date
    cView.setUint32(16, crc, true);        // CRC-32
    cView.setUint32(20, size, true);       // Compressed size
    cView.setUint32(24, size, true);       // Uncompressed size
    cView.setUint16(28, nameBytes.length, true); // File name length
    cView.setUint16(30, 0, true);          // Extra field length
    cView.setUint16(32, 0, true);          // File comment length
    cView.setUint16(34, 0, true);          // Disk number start
    cView.setUint16(36, 0, true);          // Internal file attributes
    cView.setUint32(38, 0, true);          // External file attributes
    cView.setUint32(42, currentOffset, true); // Relative offset of local header

    centralHeader.set(nameBytes, 46);
    centralHeaders.push(centralHeader);

    currentOffset += localHeader.length;
  });

  const centralDirSize = centralHeaders.reduce((acc, h) => acc + h.length, 0);

  // End of Central Directory (22 bytes)
  const eocd = new Uint8Array(22);
  const eView = new DataView(eocd.buffer);
  eView.setUint32(0, 0x06054b50, true); // End of central dir signature
  eView.setUint16(4, 0, true);          // Number of this disk
  eView.setUint16(6, 0, true);          // Disk where central dir starts
  eView.setUint16(8, files.length, true); // Number of central dir records on this disk
  eView.setUint16(10, files.length, true); // Total number of central dir records
  eView.setUint32(12, centralDirSize, true); // Size of central directory
  eView.setUint32(16, currentOffset, true); // Offset of start of central directory
  eView.setUint16(20, 0, true);         // ZIP comment length

  return new Blob([...localHeaders, ...centralHeaders, eocd] as unknown as BlobPart[], { type: "application/zip" });
}
