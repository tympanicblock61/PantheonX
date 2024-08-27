//import { Memory, Device } from "./mutualtypes.js"



// if it is too slow cut down on the this.buildStatus() calls to only one per function

class R6502 extends Device {
    constructor() {
        super(null, { start: 0x0000, end: 0x1FFF }, 0x07FF) //super(null, {start:0, end:0x10000}, null) 0x0000,0x1FFF; 0x07FF
        this.flags = {
            C: true, // Carry Bit
            Z: true, // Zero
            I: true, // Disable Interrupts
            D: true, // Decimal mode (not used in this implementation)
            B: true, // Break
            U: true, // Unused
            V: true, // Overflow
            N: true, // Negative
        };

        this.A = 0x00; // accumulator register
        this.X = 0x00; // X register
        this.Y = 0x00; // Y register
        this.SP = 0x00; // stack pointer
        this.PC = 0x0000; // Program counter
        this.status = 0x00; // status register

        // other utils

        this.fetched = 0x00;
        this.address_abs = 0x0000;
        this.address_rel = 0x0000;
        this.opcode = 0x00;
        this.cycles = 0;
        this.cyclesPassed = 0;

        // opcodes

        this.opcodes = new OpcodeList();

        this.opcodes.addGroup("ADC", this.ADC, [
            [0x69, 2, 2, "IMM"],
            [0x65, 2, 3, "ZP0"],
            [0x75, 2, 4, "ZPX"],
            [0x6D, 3, 4, "ABS"],
            [0x7D, 3, 4, "ABX"],
            [0x79, 3, 4, "ABY"],
            [0x61, 2, 6, "IZX"],
            [0x71, 2, 5, "IZY"],
        ])

        this.opcodes.addGroup("AND", this.AND, [
            [0x29, 2, 2, "IMM"],
            [0x25, 2, 3, "ZP0"],
            [0x35, 2, 4, "ZPX"],
            [0x2D, 3, 4, "ABS"],
            [0x3D, 3, 4, "ABX"],
            [0x39, 3, 4, "ABY"],
            [0x21, 2, 6, "IZX"],
            [0x31, 2, 5, "IZY"],
        ])

        this.opcodes.addGroup("ASL", this.ASL, [
            [0x0A, 1, 2, "ACC"],
            [0x06, 2, 5, "ZP0"],
            [0x16, 2, 6, "ZPX"],
            [0x0E, 3, 6, "ABS"],
            [0x1E, 3, 7, "ABX"],
        ])

        this.opcodes.push("BCC", 0x90, 2, 2, this.BCC, "REL")
        this.opcodes.push("BCS", 0xB0, 2, 2, this.BCS, "REL")
        this.opcodes.push("BEQ", 0xF0, 2, 2, this.BEQ, "REL")

        this.opcodes.addGroup("BIT", this.BIT, [
            [0x24, 2, 3, "ZP0"],
            [0x2C, 3, 4, "ABS"],
        ])

        this.opcodes.push("BMI", 0x30, 2, 2, this.BMI, "REL")
        this.opcodes.push("BNE", 0xD0, 2, 2, this.BNE, "REL")
        this.opcodes.push("BPL", 0x10, 2, 2, this.BPL, "REL")
        this.opcodes.push("BRK", 0x00, 1, 7, this.BRK, "IMP")
        this.opcodes.push("BVC", 0x50, 2, 2, this.BVC, "REL")
        this.opcodes.push("BVS", 0x70, 2, 2, this.BVS, "REL")
        this.opcodes.push("CLC", 0x18, 1, 2, this.CLC, "IMP")
        this.opcodes.push("CLD", 0xD8, 1, 2, this.CLD, "IMP")
        this.opcodes.push("CLI", 0x58, 1, 2, this.CLI, "IMP")
        this.opcodes.push("CLV", 0xB8, 1, 2, this.CLV, "IMP")

        this.opcodes.addGroup("CMP", this.CMP, [
            [0xC9, 2, 2, "IMM"],
            [0xC5, 2, 3, "ZP0"],
            [0xD5, 2, 4, "ZPX"],
            [0xCD, 3, 4, "ABS"],
            [0xDD, 3, 4, "ABX"],
            [0xD9, 3, 4, "ABY"],
            [0xC1, 2, 6, "IZX"],
            [0xD1, 2, 5, "IZY"],
        ])

        this.opcodes.addGroup("CPX", this.CPX, [
            [0xE0, 2, 2, "IMM"],
            [0xE4, 2, 3, "ZP0"],
            [0xEC, 3, 4, "ABS"],
        ])

        this.opcodes.addGroup("CPY", this.CPY, [
            [0xC0, 2, 2, "IMM"],
            [0xC4, 2, 3, "ZP0"],
            [0xCC, 3, 4, "ABS"],
        ])

        this.opcodes.addGroup("DEC", this.DEC, [
            [0xC6, 2, 5, "ZP0"],
            [0xD6, 2, 6, "ZPX"],
            [0xCE, 3, 7, "ABS"],
            [0xDE, 3, 7, "ABX"],
        ])

        this.opcodes.push("DEX", 0xCA, 1, 2, this.DEX, "IMP")
        this.opcodes.push("DEY", 0x88, 1, 2, this.DEY, "IMP")

        this.opcodes.addGroup("EOR", this.EOR, [
            [0x49, 2, 2, "IMM"],
            [0x45, 2, 3, "ZP0"],
            [0x55, 2, 4, "ZPX"],
            [0x4D, 3, 4, "ABS"],
            [0x5D, 3, 4, "ABX"],
            [0x59, 3, 4, "ABY"],
            [0x41, 2, 6, "IZX"],
            [0x51, 2, 5, "IZY"],
        ])

        this.opcodes.addGroup("INC", this.INC, [
            [0xE6, 2, 5, "ZP0"],
            [0xF6, 2, 6, "ZPX"],
            [0xEE, 3, 6, "ABS"],
            [0xFE, 3, 7, "ABX"],
        ])

        this.opcodes.push("INX", 0xE8, 1, 2, this.INX, "IMP")
        this.opcodes.push("INY", 0xC8, 1, 2, this.INY, "IMP")

        this.opcodes.addGroup("JMP", this.JMP, [
            [0x4C, 3, 3, "ABS"],
            [0x6C, 3, 5, "IND"],
        ])

        this.opcodes.push("JSR", 0x20, 3, 6, this.JSR, "ABS")

        this.opcodes.addGroup("LDA", this.LDA, [
            [0xA9, 2, 2, "IMM"],
            [0xA5, 2, 3, "ZP0"],
            [0xB5, 2, 4, "ZPX"],
            [0xAD, 3, 4, "ABS"],
            [0xBD, 3, 4, "ABX"],
            [0xB9, 3, 4, "ABY"],
            [0xA1, 2, 6, "IZX"],
            [0xB1, 2, 5, "IZY"],
        ])

        this.opcodes.addGroup("LDX", this.LDX, [
            [0xA2, 2, 2, "IMM"],
            [0xA6, 2, 3, "ZP0"],
            [0xB6, 2, 4, "ZPY"],
            [0xAE, 3, 4, "ABS"],
            [0xBE, 3, 4, "ABY"],
        ])

        this.opcodes.addGroup("LDY", this.LDY, [
            [0xA0, 2, 2, "IMM"],
            [0xA4, 2, 3, "ZP0"],
            [0xB4, 2, 4, "ZPX"],
            [0xAC, 3, 4, "ABS"],
            [0xBC, 3, 4, "ABX"],
        ])

        this.opcodes.addGroup("LSR", this.LSR, [
            [0x4A, 1, 2, "ACC"],
            [0x46, 2, 5, "ZP0"],
            [0x56, 2, 6, "ZPX"],
            [0x4E, 3, 6, "ABS"],
            [0x5E, 3, 7, "ABX"],
        ])

        this.opcodes.push("NOP", 0xEA, 1, 2, this.NOP, "IMP")

        this.opcodes.addGroup("ORA", this.ORA, [
            [0x09, 2, 2, "IMM"],
            [0x05, 2, 3, "ZP0"],
            [0x15, 2, 4, "ZPX"],
            [0x0D, 3, 4, "ABS"],
            [0x1D, 3, 4, "ABX"],
            [0x19, 3, 4, "ABY"],
            [0x01, 2, 6, "IZX"],
            [0x11, 2, 5, "IZY"],
        ])

        this.opcodes.push("TAX", 0xAA, 1, 2, this.TAX, "IMP")
        this.opcodes.push("TXA", 0x8A, 1, 2, this.TXA, "IMP")
        this.opcodes.push("TAY", 0xA8, 1, 2, this.TAY, "IMP")
        this.opcodes.push("TYA", 0x98, 1, 2, this.TYA, "IMP")

        /*this.opcodes.addGroup("", , [
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
        ])

        this.opcodes.addGroup("", , [
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
        ])

        this.opcodes.addGroup("", , [
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
        ])

        this.opcodes.addGroup("", , [
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
            [0x, , , ""],
        ])*/

        // unofficial opcodes https://www.nesdev.org/wiki/CPU_unofficial_opcodes
        // https://www.nesdev.org/wiki/Visual6502wiki/6502_Unsupported_Opcodes
        // https://www.nesdev.org/wiki/Visual6502wiki/6502_all_256_Opcodes
        // http://bbc.nvg.org/doc/6502OpList.txt
/*
        this.opcodes.addGroup("", , [
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
        ])

        this.opcodes.addGroup("", , [
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
        ])

        this.opcodes.addGroup("", , [
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
        ])

        this.opcodes.addGroup("", , [
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
            [0x, , , ""]
        ])*/

    }

    // addressing modes

    process_addrmode(mode) {
        let additional_cycle = 0;
        let low;
        let high;
        let address;
        switch (mode) {
            case 'IMP':
                break; // does nothing lol
            case 'IMM':
                this.address_abs = this.PC++;
                break;
            case 'ACC':
                this.fetched = this.A;
                break;
            case 'ZP0':
                this.address_abs = this.read(this.PC);
                this.PC++;
                this.address_abs &= 0x00FF;
                break;
            case 'ZPX':
                this.address_abs = (this.read(this.PC) + this.X);
                this.PC++;
                this.address_abs &= 0x00FF;
                break;
            case 'ZPY':
                this.address_abs = (this.read(this.PC) + this.Y);
                this.PC++;
                this.address_abs &= 0x00FF;
                break;
            case 'ABS':
                low = this.read(this.PC);
                this.PC++;
                high = this.read(this.PC);
                this.PC++;
                this.address_abs = (high << 8) | low;
                break;
            case 'ABY':
                low = this.read(this.PC);
                this.PC++;
                high = this.read(this.PC);
                this.PC++;
                this.address_abs = (high << 8) | low;
                this.address_abs += this.Y;
                if ((this.address_abs & 0xFF00) != (high << 8)) additional_cycle = 1;
                break;
            case 'ABX':
                low = this.read(this.PC);
                this.PC++;
                high = this.read(this.PC);
                this.PC++;
                this.address_abs = (high << 8) | low;
                this.address_abs += this.X;
                if ((this.address_abs & 0xFF00) != (high << 8)) additional_cycle = 1;
                break;
            case 'IZX':
                address = this.read(this.PC);
                this.PC++;
                low = this.read((address + this.X) & 0x00FF);
                high = this.read((address + this.X + 1) & 0x00FF);
                this.address_abs = (high << 8) | low;
                break;
            case 'IZY':
                address = this.read(this.PC);
                this.PC++;
                low = this.read(address & 0x00FF);
                high = this.read((address + 1) & 0x00FF);
                this.address_abs = (high << 8) | low;
                this.address_abs += this.Y;
                if ((this.address_abs & 0xFF00) != (high << 8)) additional_cycle = 1;
                break;
            case 'REL':
                console.log("REL opcode called")
                this.address_rel = this.read(this.PC);
                console.log(this.address_rel)
                this.PC++;
                if (this.address_rel & 0x80) this.address_rel |= 0xFF00;
                console.log(this.address_rel)
                break;
            case 'IND':
                const pointer_low = this.read(this.PC);
                this.PC++;
                const pointer_high = this.read(this.PC);
                this.PC++;
                const pointer = (pointer_high << 8) | pointer_low;
                if (pointer_low == 0x00FF) {
                    this.address_abs = (this.read(pointer & 0xFF00) << 8) | this.read(pointer);
                } else {
                    this.address_abs = (this.read(pointer + 1) << 8) | this.read(pointer);
                }
                break;
        }
        return additional_cycle;
    }

    fetch() {
        if (this.opcodes.getByOpcode(this.opcode).addrmode != 'ACC') this.fetched = this.read(this.address_abs);
        return this.fetched;
    }

    // instruction functions

    AND() {
        this.fetch();
        this.A &= this.fetched;
        this.flags.Z = this.A == 0x00;
        this.buildStatus()
        this.flags.N = Boolean(this.A & 0x80);
        this.buildStatus()
        return 1;
    }

    // Instruction: Branch if Carry Clear
    // Function:    if(C == 0) pc = address
    BCC() {
        if (!this.flags.C) {
            this.cycles++;
            this.address_abs = this.PC + this.address_rel;
            if ((this.address_abs & 0xFF00) != (this.PC & 0xFF00)) this.cycles++;
            this.PC = this.address_abs;
        }
        return 0;
    }

    // Instruction: Branch if Carry Set
    // Function:    if(C == 1) pc = address
    BCS() {
        if (this.flags.C) {
            this.cycles++;
            this.address_abs = this.PC + this.address_rel;
            if ((this.address_abs & 0xFF00) != (this.PC & 0xFF00)) this.cycles++;
            this.PC = this.address_abs;
        }
        return 0;
    }

    // Instruction: Branch if Equal
    // Function:    if(Z == 1) pc = address
    BEQ() {
        if (this.flags.Z) {
            this.cycles++;
            this.address_abs = this.PC + this.address_rel;
            console.log(this.PC)
            console.log(this.address_rel)
            console.log("BEQ address: "+this.address_abs)

            if ((this.address_abs & 0xFF00) != (this.PC & 0xFF00)) this.cycles++;
            this.PC = this.address_abs;
        }
        return 0;
    }

    BIT() {
        this.fetch();
        const temp = this.A & this.fetched;
        this.flags.Z = Boolean((temp & 0x00FF) == 0x00);
        this.buildStatus()
        this.flags.N = Boolean(this.fetched & (1 << 7));
        this.buildStatus()
        this.flags.V = Boolean(this.fetched & (1 << 6));
        this.buildStatus()
        return 0;
    }

    // Instruction: Branch if Negative
    // Function:    if(N == 1) pc = address
    BMI() {
        if (this.flags.N) {
            this.cycles++;
            this.address_abs = this.PC + this.address_rel;
            if ((this.address_abs & 0xFF00) != (this.PC & 0xFF00)) this.cycles++;
            this.PC = this.address_abs;
        }
        return 0;
    }

    // Instruction: Branch if Not Equal
    // Function:    if(Z == 0) pc = address
    BNE() {
        if (!this.flags.Z) {
            this.cycles++;
            this.address_abs = this.PC + this.address_rel;
            if ((this.address_abs & 0xFF00) != (this.PC & 0xFF00)) this.cycles++;
            this.PC = this.address_abs;
        }
        return 0;
    }

    // Instruction: Branch if Positive
    // Function:    if(N == 0) pc = address
    BPL() {
        if (!this.flags.N) {
            this.cycles++;
            this.address_abs = this.PC + this.address_rel;
            if ((this.address_abs & 0xFF00) != (this.PC & 0xFF00)) this.cycles++;
            this.PC = this.address_abs;
        }
        return 0;
    }

    // Instruction: Break
    // Function:    Program Sourced Interrupt
    BRK() {
        this.PC++;
        this.flags.I = true;
        this.buildStatus()
        this.write(0x0100 + this.SP, (this.PC >> 8) & 0x00FF);
        this.SP--;
        this.write(0x0100 + this.SP, this.PC & 0x00FF);
        this.SP--;
        this.flags.B = true;
        this.buildStatus()
        this.write(0x0100 + this.SP, this.status); // TODO use the flags
        this.SP--;
        this.flags.B = false;
        this.buildStatus()
        console.log(this.read(0xFFFE))
        console.log(this.read(0xFFFF))

        this.PC = this.read(0xFFFE) | (this.read(0xFFFF) << 8);
        if (this.PC == 0x00) this.cycles = -1 // dont know if this is correct
        return 0;
    }

    // Instruction: Branch if Overflow Clear
    // Function:    if(V == 0) pc = address
    BVC() {
        if (!this.flags.V) {
            this.cycles++;
            this.address_abs = this.PC + this.address_rel;
            if ((this.address_abs & 0xFF00) != (this.PC & 0xFF00)) this.cycles++;
            this.PC = this.address_abs;
        }
        return 0;
    }

    // Instruction: Branch if Overflow Set
    // Function:    if(V == 1) pc = address
    BVS() {
        if (this.flags.V) {
            this.cycles++;
            this.address_abs = this.PC + this.address_rel;
            if ((this.address_abs & 0xFF00) != (this.PC & 0xFF00)) this.cycles++;
            this.PC = this.address_abs;
        }
        return 0;
    }

    CLC() {
        this.flags.C = false;
        this.buildStatus()
        return 0;
    }

    CLD() {
        this.flags.D = false;
        this.buildStatus()
        return 0;
    }

    CLI() {
        this.flags.I = false;
        this.buildStatus()
        return 0;
    }

    CLV() {
        this.flags.V = false;
        this.buildStatus()
        return 0;
    }

    ADC() {
        this.fetch();
        const temp = (this.A << 8) + (this.fetched << 8) + (this.flags.C ? 1 : 0); // TODO might need to << 8 the C flag
        this.flags.C = Boolean(temp > 255);
        this.buildStatus()
        this.flags.Z = (temp & 0x00FF) == 0;
        this.buildStatus()
        this.flags.N = Boolean(temp & 0x80);
        this.buildStatus()
        this.flags.V = Boolean((~((this.A << 8) ^ (this.fetched << 8)) & ((this.A << 8) ^ (temp)) & 0x0080));
        this.buildStatus()
        this.A = temp & 0x00FF;
        return 1;
    }

    SBC() {
        this.fetch();
        let value = (this.fetched << 8) ^ 0x00FF

        let temp = (this.A << 8) + value + (this.flags.C ? 1 : 0)
        this.flags.C = Boolean(temp & 0xFF00)
        this.buildStatus()
        this.flags.Z = (temp & 0x00FF) == 0
        this.buildStatus()
        this.flags.V = Boolean((temp ^ (this.A << 8)) & (temp ^ value) & 0x0080)
        this.buildStatus()
        this.flags.N = Boolean(temp & 0x0080)
        this.buildStatus()
        this.A = temp & 0x00FF
    }

    PHA() {
        this.write(0x0100 + this.SP, this.A)
        this.SP--
        return 0
    }

    PLA() {
        this.SP++
        this.A = this.read(0x0100 + this.SP)
        this.flags.Z = this.A == 0x00
        this.buildStatus()
        this.flags.N = Boolean(this.A & 0x80)
        this.buildStatus()
        return 0
    }

    RTI() {
        this.SP++
        this.status = this.read(0x0100 + this.SP)
        this.status ^= (1 << 4) // flip break bit
        this.status ^= (1 << 5) // flip unused bit
        this.setFlags()
        this.SP++
        this.PC = this.read(0x0100 + this.SP)
        this.SP++
        this.PC |= this.read(0x0100 + this.SP) << 8
        return 0
    }

    // hmm wasnt in the videos?

    ASL() {
        this.fetch()
        let temp = this.fetched << 1
        this.flags.C = (temp & 0xFF00) > 0
        this.buildStatus()
        this.flags.Z = (temp & 0x00FF) == 0x00
        this.buildStatus()
        this.flags.N = Boolean(temp & 0x80)
        this.buildStatus()
        if (this.opcodes.getByOpcode(this.opcode).addrmode == "ACC") {
            this.A = temp & 0x00FF
        } else this.write(this.address_abs, temp & 0x00FF)
        return 0
    }

    CMP() {
        this.fetch()
        let temp = this.A - this.fetched
        this.flags.C = this.A > this.fetched
        this.buildStatus()
        this.flags.Z = (temp & 0x00FF) == 0
        this.buildStatus()
        this.flags.N = Boolean(temp & 0x80)
        this.buildStatus()
        return 1;
    }

    CPX() {
        this.fetch()
        let temp = this.X - this.fetched
        this.flags.C = this.X > this.fetched
        this.buildStatus()
        this.flags.Z = (temp & 0x00FF) == 0
        this.buildStatus()
        this.flags.N = Boolean(temp & 0x80)
        this.buildStatus()
        return 0
    }

    CPY() {
        this.fetch()
        let temp = this.Y - this.fetched
        this.flags.C = this.Y > this.fetched
        this.buildStatus()
        this.flags.Z = (temp & 0x00FF) == 0
        this.buildStatus()
        this.flags.N = Boolean(temp & 0x80)
        this.buildStatus()
        return 0
    }

    DEC() {
        this.fetch()
        let temp = fetched - 1
        this.write(this.address_abs, temp & 0x00FF)
        this.flags.Z = (temp & 0x00FF) == 0
        this.buildStatus()
        this.flags.N = Boolean(temp & 0x80)
        this.buildStatus()
        return 0
    }

    DEX() {
        this.X--
        this.flags.Z = this.X == 0
        this.buildStatus()
        this.flags.N = Boolean(this.X & 0x80)
        this.buildStatus()
        return 0
    }

    DEY() {
        this.Y--
        this.flags.Z = this.Y == 0
        this.buildStatus()
        this.flags.N = Boolean(this.Y & 0x80)
        this.buildStatus()
        return 0
    }

    EOR() {
        this.fetch()
        this.A ^= this.fetched
        this.flags.Z = this.A == 0
        this.buildStatus()
        this.flags.N = Boolean(this.A & 0x80)
        this.buildStatus()
        return 1
    }

    INC() {
        this.fetch()
        let temp = this.fetched + 1
        this.write(this.address_abs, temp & 0x00FF)
        this.flags.Z = (temp & 0x00FF) == 0
        this.buildStatus()
        this.flags.N = Boolean(temp & 0x80)
        this.buildStatus()
        return 0
    }

    INX() {
        this.X++
        this.flags.Z = this.X == 0
        this.buildStatus()
        this.flags.N = Boolean(this.X & 0x80)
        this.buildStatus()
        console.log("incremented X: " + this.X)
        return 0
    }

    INY() {
        this.Y++
        this.flags.Z = this.Y == 0
        this.buildStatus()
        this.flags.N = Boolean(this.Y & 0x80)
        this.buildStatus()
        return 0
    }

    JMP() {
        this.PC = this.address_abs
        return 0
    }

    JSR() {
        this.PC--

        this.write(0x0100 + this.SP, (this.PC >> 8) & 0x00FF)
        this.SP--
        this.write(0x0100 + this.SP, this.PC & 0x00FF)
        this.SP--

        this.PC = this.address_abs
        return 0
    }

    LDA() {
        this.fetch()
        this.A = this.fetched
        this.flags.Z = this.A == 0
        this.buildStatus()
        this.flags.N = Boolean(this.A & 0x80)
        this.buildStatus()
        return 1
    }

    LDX() {
        this.fetch()
        this.X = this.fetched
        this.flags.Z = this.X == 0
        this.buildStatus()
        this.flags.N = Boolean(this.X & 0x80)
        this.buildStatus()
        return 1
    }

    LDY() {
        this.fetch()
        this.Y = this.fetched
        this.flags.Z = this.Y == 0
        this.buildStatus()
        this.flags.N = Boolean(this.Y & 0x80)
        this.buildStatus()
        return 1
    }

    LSR() {
        const value = this.read(this.address_abs);
        const bitOut = value & 0x01;
        const result = (value >> 1) & 0xFF;
        this.write(this.address_abs, result);
        this.flags.C = Boolean(bitOut);
        this.buildStatus()
        this.flags.Z = result === 0;
        this.buildStatus()
        this.flags.N = (result & 0x80) !== 0;
        this.buildStatus()
        return 0;
    }

    ORA() {
        this.fetch();
        this.A |= this.fetched;
        this.flags.Z = (this.A === 0x00);
        this.buildStatus()
        this.flags.N = (this.A & 0x80) !== 0;
        this.buildStatus()
        return 0;
    }

    TAX() {
        this.X = this.A
        this.flags.Z = (this.X === 0x00);
        this.flags.N = (this.X & 0x80) !== 0;
        return 0;
    }

    TXA() {
        this.A = this.X
        this.flags.Z = (this.A === 0x00);
        this.flags.N = (this.A & 0x80) !== 0;
        return 0;
    }

    TAY() {
        this.Y = this.A
        this.flags.Z = (this.Y === 0x00);
        this.flags.N = (this.Y & 0x80) !== 0;
        return 0;
    }

    TYA() {
        this.A = this.Y
        this.flags.Z = (this.A === 0x00);
        this.flags.N = (this.A & 0x80) !== 0;
        return 0;
    }

    // signals

    clock() {
        if (this.cycles == 0) {
            this.opcode = this.read(this.PC);
            this.PC++;
            const opcode = this.opcodes.getByOpcode(this.opcode);
            console.log(opcode)
            this.cycles = opcode.cycles;
            const inc_cycles_1 = this.process_addrmode(opcode.addrmode);
            const inc_cycles_2 = opcode.func.bind(this)();
            this.cycles += (inc_cycles_1 & inc_cycles_2);
        }

        if (this.cycles < 0) return;

        this.cycles--;
        this.cyclesPassed++;
    }

    reset() {
        this.A = 0
        this.X = 0
        this.Y = 0
        this.SP = 0xFD
        this.status = 0x00

        this.address_abs = 0xFFFC
        let low = this.read(this.address_abs)
        let high = this.read(this.address_abs + 1)

        this.PC = (high << 8) | low

        this.address_rel = 0x0000
        this.address_abs = 0x0000
        this.fetched = 0x00 | (this.flags.U ? 32 : 0)

        this.cycles = 8
        this.cyclesPassed = 0;
    }

    irq() {
        if (!this.flags.I) {
            this.write(0x0100 + this.SP, (this.PC >> 8) & 0x00FF)
            this.SP--
            this.write(0x0100 + this.SP, this.PC & 0x00FF)
            this.SP--

            this.flags.B = false
            this.buildStatus()
            this.flags.U = true
            this.buildStatus()
            this.flags.I = true
            this.buildStatus()
            this.write(0x0100 + this.SP, this.status)
            this.SP--

            this.address_abs = 0xFFFE // interrupt vector
            let low = this.read(this.address_abs)
            let high = this.read(this.address_abs + 1)
            this.PC = (high << 8) | low

            this.cycles = 7
        }
    }

    nmi() {
        this.write(0x0100 + this.SP, (this.PC >> 8) & 0x00FF)
        this.SP--
        this.write(0x0100 + this.SP, this.PC & 0x00FF)
        this.SP--

        this.flags.B = false
        this.buildStatus()
        this.flags.U = true
        this.buildStatus()
        this.flags.I = true
        this.buildStatus()
        this.write(0x0100 + this.SP, this.status)
        this.SP--

        this.address_abs = 0xFFFA // interrupt vector
        let low = this.read(this.address_abs)
        let high = this.read(this.address_abs + 1)
        this.PC = (high << 8) | low

        this.cycles = 8
    }

    buildStatus() {
        const bitsArray = Object.values(this.flags).reverse().map(Number);
        this.status = 0
        for (let i = 0; i < 8; i++) this.status = (this.status << 1) | bitsArray[i];
    }

    setFlags() {
        let bools = this.status.toString(2).padStart(8, '0').split('').reverse().map(Number).map(Boolean)
        let keys = Object.keys(this.flags)
        for (let i = 0; i<keys.length; i++) {
            this.flags[keys[i]] = bools[i]
        }
    }
}