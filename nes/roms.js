// https://www.nesdev.org/wiki/NES_2.0
// https://www.nesdev.org/wiki/INES

class NESHeader {
    constructor(data) {
        this.data = data;
        this.header = new Uint8Array(data.slice(0, 16));
    }

    isiNESFormat() {
        return this.header[0] === 0x4E &&
               this.header[1] === 0x45 &&
               this.header[2] === 0x53 &&
               this.header[3] === 0x1A;
    }

    isNES20Format() {
        return this.isiNESFormat() && (this.header[7] & 0x0C) === 0x08;
    }
}

class iNESFile {
    constructor(data, header) {
        this.data = data;
        this.header = header;
        this.prgSize = header.header[4] * 16384; // PRG ROM size in bytes
        this.chrSize = header.header[5] * 8192;  // CHR ROM size in bytes
        this.trainerSize = (header.header[6] & 0x04) ? 512 : 0;
        this.prgRom = new Uint8Array(this.data.slice(16 + this.trainerSize, 16 + this.trainerSize + this.prgSize));
        this.chrRom = this.chrSize > 0 ? new Uint8Array(this.data.slice(16 + this.trainerSize + this.prgSize, 16 + this.trainerSize + this.prgSize + this.chrSize)) : null;
    }

    parseData() {
        return {
            prgRom: this.prgRom,
            chrRom: this.chrRom
        };
    }
}

class NES20File {
    constructor(data, header) {
        this.data = data;
        this.header = header;
        this.prgSize = ((header.header[4] & 0x0F) | ((header.header[9] & 0x0F) << 4)) * 16384; // PRG ROM size in bytes
        this.chrSize = ((header.header[5] & 0x0F) | ((header.header[10] & 0x0F) << 4)) * 8192; // CHR ROM size in bytes
        this.prgRom = new Uint8Array(this.data.slice(16, 16 + this.prgSize));
        this.chrRom = this.chrSize > 0 ? new Uint8Array(this.data.slice(16 + this.prgSize, 16 + this.prgSize + this.chrSize)) : null;
    }

    parseData() {
        return {
            prgRom: this.prgRom,
            chrRom: this.chrRom
        };
    }
}

async function decodeNESFile(file) {
    const arrayBuffer = await file.arrayBuffer();
    const data = new Uint8Array(arrayBuffer);
    const header = new NESHeader(data);

    // Detect format
    const iNESFormat = header.isiNESFormat();
    const NES20Format = header.isNES20Format();

    let formatVersion = 'Unknown';
    let fileHandler;

    if (NES20Format) {
        formatVersion = 'NES 2.0';
        fileHandler = new NES20File(data, header);
    } else if (iNESFormat) {
        formatVersion = 'iNES';
        fileHandler = new iNESFile(data, header);
    } else {
        throw new Error('Unsupported NES file format');
    }

    // Parse the file data
    const parsedData = fileHandler.parseData();

    return {
        file: parsedData,
        formatVersion: formatVersion
    };
}