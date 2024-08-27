const memory = new Memory(0x10000, Uint8Array, 0x00) 
const bus = new Bus(memory)
const ppu = new R2C02()
const cpu = new R6502()
const cart = new Device(bus, { start: 0x8000, end: 0x10000 }, null, true)

cart.read = (address) => {
    return memory.read(address)
}

cart.write = (address) => {
    memory.write(address)
}

bus.connectDevice(ppu)
bus.connectDevice(cpu)
bus.connectDevice(cart)

cpu.reset()
memory.write(0, 0xA2); // LDX
memory.write(1, 0x00); // LDX
memory.write(2, 0xE8); // INX
memory.write(3, 0xE0); // CPX
memory.write(4, 0x0A); // CPX
memory.write(5, 0xF0); // BEQ
memory.write(6, 0xF8); // BEQ
memory.write(7, 0x4C); // JMP
memory.write(8, 0x02); // JMP low byte
memory.write(9, 0x00); // JMP high byte

const mode = "ntsc"
let cps = 1000
let fps = 60
if (mode == "ntsc") {
    cps = 1790000
    fps = 29.97
} else if (mode = "pal") {
    cps = 1660000
    fps = 25
}

const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
function drawArray(array) {
  const cellSize = 10;
  array.forEach((row, rowIndex) => {
    row.forEach((value, colIndex) => {
      ctx.fillRect(colIndex * cellSize, rowIndex * cellSize, cellSize, cellSize);
    });
  });
}

/*setInterval(()=>{
    cpu.clock()
}, 1000/cps)
*/
let startAddr = 0x0000
let padding = 5;

window.addEventListener("keydown", (event) => {
    let act = document.activeElement.id != "assembly"
    if (event.keyCode === 0x26 && startAddr > 0x0000 && act) { // up
        startAddr -= 16;
    } else if (event.keyCode === 0x28 && startAddr < memory.size && act) { // down
        startAddr += 16;
    } else if (event.keyCode === 0x20) {
        cpu.clock()
    }
})

const getWidth = (text) => (ctx.measureText(text)).width;
const dissassemble = (address, amount) => {
    let dissassembled = []

    for (let i = 0; i < amount; i++) {
        let opcode = cpu.opcodes.getByOpcode(memory.read(address))
        if (!opcode) return `${address.toString(16).padStart(4, '0').toUpperCase()}: ??`;

        let dis = `${address.toString(16).padStart(4, '0').toUpperCase()}: ${opcode.name}`

        let params = []
        for (let i = 1; i < opcode.size; i++) {
            params.push(memory.read(address + i).toString(16).padStart(2, '0').toUpperCase())
        }

        if (params.length > 0) dis += ` ${params}`

        if (opcode.addrmode == "REL") {
            let address_rel = 0;
            address_rel = memory.read(address+1);
            if (address_rel & 0x80) address_rel |= 0xFF00;
            dis += ` [${address_rel}]`
        }

        dis += ` {${opcode.addrmode}}`
        dissassembled.push(dis)
        address += opcode.size
    }

    return dissassembled
}

const assemble = () => {
    /*
        # <- imm value
        zeropage if within address range 0x0000 to 0x00FF // guh  cant use regex?
        zeropage x/y if ,X or ,Y
        abs if 16 bit (4 int long number)
        abs x/y if ,X or ,Y
        indirect if (address)
        IZX if (address,X)
        IZY if (address),Y
        relative if label or has no zeropage impl
        IMP if A param
    */

    const N16BitRegex = new RegExp("(?:0x[0-9A-Fa-f]{1,4}|0b[01]{16}|\\$[0-9A-Fa-f]{1,4}|\\d{1,5})");
    const N8BitRegex = new RegExp("(?:0x[0-9A-Fa-f]{1,2}|0b[01]{8}|\\$[0-9A-Fa-f]{1,2}|\\d{1,3})");

    const setAddressRegex = new RegExp(`\\*\\s*=\\s*${N16BitRegex.source}`, "g");

    const modes = {
        "IMM": new RegExp(`^([A-Za-z]{3,})\\s*#(${N8BitRegex.source})$`, "g"),
        "ABS": new RegExp(`^([A-Za-z]{3,})\\s*(${N16BitRegex.source})$`, "g"),
        "ZP0": new RegExp(`^([A-Za-z]{3,})\\s*\\(${N8BitRegex.source}\\)$`, "g"),
        "ZPX": new RegExp(`^([A-Za-z]{3,})\\s*\\(${N8BitRegex.source}\\),X$`, "g"),
        "ZPY": new RegExp(`^([A-Za-z]{3,})\\s*\\(${N8BitRegex.source}\\),Y$`, "g"),
        "ABX": new RegExp(`^([A-Za-z]{3,})\\s*(${N16BitRegex.source}),X$`, "g"),
        "ABY": new RegExp(`^([A-Za-z]{3,})\\s*(${N16BitRegex.source}),Y$`, "g"),
        "IND": new RegExp(`^([A-Za-z]{3,})\\s*\\(${N16BitRegex.source}\\)$`, "g"),
        "IZX": new RegExp(`^([A-Za-z]{3,})\\s*\\((${N8BitRegex.source}),X\\)$`, "g"),
        "IZY": new RegExp(`^([A-Za-z]{3,})\\s*\\((${N8BitRegex.source})\\),Y$`, "g"),
        "REL": new RegExp(`^([A-Za-z]{3,})\\s*(${N8BitRegex.source})$`, "g")
    };



    const testStrings = [
        "LDA #$10",        // Immediate
        "STA $1234",       // Absolute
        "LDA $45",         // Zero Page
        "LDA $45,X",       // Zero Page, X Indexed
        "LDA $45,Y",       // Zero Page, Y Indexed
        "LDA $1234,X",     // Absolute, X Indexed
        "LDA $1234,Y",     // Absolute, Y Indexed
        "JMP ($1234)",     // Indirect
        "LDA ($20,X)",     // Indirect, X Indexed
        "LDA ($20),Y",     // Indirect, Y Indexed
        "BCC $10",         // Relative
        "* = $1234"        // Set Address
    ];

    const addrMode = (line) => {
        for (const [mode, regex] of Object.entries(modes)) {
            let matches = [...line.matchAll(regex)][0]
            if (matches != null && matches.length > 0) {
                console.log(cpu.opcodes.getByName(matches[1]))
                console.log(`${line} line matches ${mode} ${regex}`)
            }
        }
    }
    window.addrMode = addrMode


    testStrings.forEach(str => {
        addrMode(str)
    });

    const view = new AutoDataView(new ArrayBuffer(0x10000));
    const text = document.getElementById("assembly").value;
    const lines = text.split("\n");

    for (const line of lines) {
        const match = setAddressRegex.exec(line);
        if (match) {
            const address = match[1];
            console.log(`Address set to: ${Number(address)}`);
            view.setPointer(Number(address))
            console.log(`'${line}'`);
        } else {
            console.log(line);
        }
    }
}

assemble()

setInterval(() => {
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = "15px serif";
    ctx.fillStyle = "#FFFFFF";
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, canvas.width - (15 * 2), (16 * 15)+3);

    let addr = startAddr
    let y = 30;
    for (let j = 0; j < 16; j++) {
        ctx.fillText(addr.toString(16).padStart(4, '0').toUpperCase(), 18, y);
        let x = 35;
        for (let i = 0; i < 16; i++) {
            const text = memory.read(addr+i).toString(16).padStart(2, '0').toUpperCase();
            const textWidth = Math.floor(getWidth(text));
            x += textWidth + padding; // Add padding after each text element
            ctx.fillText(text, x, y);
        }
        y += 15
        addr += 16;
    }

    ctx.fillText("status", 15, (18 * 15) + 3)
    let x = Math.floor(getWidth("status"))+15+3
    /*this.flags = {
        C: true, // Carry Bit
        Z: true, // Zero
        I: true, // Disable Interrupts
        D: true, // Decimal mode (not used in this implementation)
        B: true, // Break
        U: true, // Unused
        V: true, // Overflow
        N: true, // Negative
    };*/
    cpu.flags.C ? ctx.fillStyle = "#00FF00" : ctx.fillStyle = "#FF0000"
    ctx.fillText("C", x, (18 * 15) + 3); x+=15
    cpu.flags.Z ? ctx.fillStyle = "#00FF00" : ctx.fillStyle = "#FF0000"
    ctx.fillText("Z", x, (18 * 15) + 3); x += 15 
    cpu.flags.I ? ctx.fillStyle = "#00FF00" : ctx.fillStyle = "#FF0000"
    ctx.fillText("I", x, (18 * 15) + 3); x += 15
    cpu.flags.D ? ctx.fillStyle = "#00FF00" : ctx.fillStyle = "#FF0000"
    ctx.fillText("D", x, (18 * 15) + 3); x += 15
    cpu.flags.B ? ctx.fillStyle = "#00FF00" : ctx.fillStyle = "#FF0000"
    ctx.fillText("B", x, (18 * 15) + 3); x += 15
    cpu.flags.U ? ctx.fillStyle = "#00FF00" : ctx.fillStyle = "#FF0000"
    ctx.fillText("U", x, (18 * 15) + 3); x += 15
    cpu.flags.V ? ctx.fillStyle = "#00FF00" : ctx.fillStyle = "#FF0000"
    ctx.fillText("V", x, (18 * 15) + 3); x += 15
    cpu.flags.N ? ctx.fillStyle = "#00FF00" : ctx.fillStyle = "#FF0000"
    ctx.fillText("N", x, (18 * 15) + 3)
    ctx.fillStyle = "#FFFFFF";

    ctx.fillText(`PC: ${cpu.PC.toString(16).padStart(4, '0').toUpperCase()}`, 15, (19 * 15) + 3)
    ctx.fillText(`SP: ${cpu.SP.toString(16).padStart(4, '0').toUpperCase()}`, 15, (20 * 15) + 3)
    ctx.fillText(`A: ${cpu.A.toString(16).padStart(2, '0').toUpperCase()} [${cpu.A}]`, 15, (21 * 15) + 3)
    ctx.fillText(`X: ${cpu.X.toString(16).padStart(2, '0').toUpperCase()} [${cpu.X}]`, 15, (22 * 15) + 3)
    ctx.fillText(`Y: ${cpu.Y.toString(16).padStart(2, '0').toUpperCase()} [${cpu.Y}]`, 15, (23 * 15) + 3)
    ctx.fillText(`cycles left: ${cpu.cycles}`, 15, (24 * 15) + 3)
    ctx.fillText(`cycles passed: ${cpu.cyclesPassed}`, 15, (25 * 15) + 3)

    let dis = dissassemble(cpu.PC, 4)
    y = (19 * 15) + 3
    for (const di of dis) {
        y+=15
        ctx.fillText(di, 200, y)
    }
}, 1000 / fps);