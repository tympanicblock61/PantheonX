class NESMapper {
    constructor(prgROMSize, chrROMSize, ramSize = 0) {
        this.prgROMSize = prgROMSize;  // Size of the PRG ROM
        this.chrROMSize = chrROMSize;  // Size of the CHR ROM
        this.ramSize = ramSize;        // Size of the extra RAM (if any)

        // Initialize memory banks
        this.prgBanks = [];
        this.chrBanks = [];
        this.ram = new Array(ramSize).fill(0);
    }

    loadPRGROM(data) {
        this.prgBanks = this.splitDataIntoBanks(data, this.prgROMSize);
    }

    loadCHRROM(data) {
        this.chrBanks = this.splitDataIntoBanks(data, this.chrROMSize);
    }

    splitDataIntoBanks(data, bankSize) {
        const banks = [];
        for (let i = 0; i < data.length; i += bankSize) {
            banks.push(data.slice(i, i + bankSize));
        }
        return banks;
    }

    // Method to handle memory mapping (bank switching)
    mapMemory(address) {
        // To be implemented by subclasses
        throw new Error("mapMemory() must be implemented by subclass.");
    }

    // Method to handle IRQ (Interrupt Request) logic
    handleIRQ() {
        // To be implemented by subclasses if required
    }

    // Method to read memory (default behavior, can be overridden)
    readMemory(address) {
        return 0;  // Default return value for unimplemented mappers
    }

    // Method to write memory (default behavior, can be overridden)
    writeMemory(address, value) {
        // Default implementation does nothing
    }
}

// Example subclass for MMC1
class MMC1Mapper extends NESMapper {
    constructor(prgROMSize, chrROMSize, ramSize = 0) {
        super(prgROMSize, chrROMSize, ramSize);
        // MMC1 specific state variables
        this.shiftRegister = 0x10;
        this.controlRegister = 0x0C;
        this.prgBankMode = 3;
        this.chrBankMode = 0;
        this.prgBank = 0;
        this.chrBank0 = 0;
        this.chrBank1 = 0;
    }

    mapMemory(address) {
        // MMC1 specific memory mapping logic
        // Example: PRG ROM bank switching
        if (address >= 0x8000) {
            return this.prgBanks[this.prgBank];  // Simplified for example
        }
        return super.readMemory(address);
    }

    writeMemory(address, value) {
        if (address >= 0x8000) {
            // Handle MMC1 specific writes to control the mapper
            this.shiftRegister = (this.shiftRegister >> 1) | ((value & 1) << 4);
            if (value & 0x80) {  // Reset shift register
                this.shiftRegister = 0x10;
            } else if (this.shiftRegister & 1) {  // Full shift register
                // Update control register or bank depending on the address
                this.controlRegister = this.shiftRegister;
                this.shiftRegister = 0x10;  // Reset shift register
            }
        } else {
            super.writeMemory(address, value);
        }
    }
}

// Example subclass for UNROM
class UNROMMapper extends NESMapper {
    constructor(prgROMSize, chrROMSize, ramSize = 0) {
        super(prgROMSize, chrROMSize, ramSize);
        this.prgBank = 0;
    }

    mapMemory(address) {
        if (address >= 0x8000 && address < 0xC000) {
            return this.prgBanks[this.prgBank];
        } else if (address >= 0xC000) {
            return this.prgBanks[this.prgBanks.length - 1];  // Fixed last bank
        }
        return super.readMemory(address);
    }

    writeMemory(address, value) {
        if (address >= 0x8000) {
            this.prgBank = value & 0x0F;  // Select PRG bank
        } else {
            super.writeMemory(address, value);
        }
    }
}

// Example usage:
const mmc1Mapper = new MMC1Mapper(0x4000, 0x2000);  // Example sizes
const unromMapper = new UNROMMapper(0x4000, 0x2000);  // Example sizes

// Load data into the mapper
mmc1Mapper.loadPRGROM([...]);  // Load PRG ROM data
mmc1Mapper.loadCHRROM([...]);  // Load CHR ROM data

unromMapper.loadPRGROM([...]);
unromMapper.loadCHRROM([...]);

// Access memory through the mappers
console.log(mmc1Mapper.mapMemory(0x8000));  // Example memory access
console.log(unromMapper.mapMemory(0x8000));  // Example memory access