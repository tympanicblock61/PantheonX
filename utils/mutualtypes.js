class Opcode {
    constructor(name, opcode, size, cycles, func, addrmode) {
        this.name = name;
        this.opcode = opcode;
        this.size = size;
        this.cycles = cycles;
        this.func = func;
        this.addrmode = addrmode;
    }
}

class OpcodeList {
    constructor() {
        this.opcodes = [];
    }

    push(name, opcode, size, cycles, func, addrmode) {
        this.opcodes.push(new Opcode(name, opcode, size, cycles, func, addrmode));
    }

    addGroup(name, operation, opcodes) {
        for (const opcodeInfo of opcodes) {
            const [opcode, size, cycles, addrMode] = opcodeInfo;
            this.opcodes.push(new Opcode(name, opcode, size, cycles, operation, addrMode));
        }
    }

    getByOpcode(op) {
        for (const opcode of this.opcodes) {
            if (opcode.opcode === op) {
                return opcode
            }
        }
        return null;
    }

    getByName(name) {
        let ops = []
        for (const opcode of this.opcodes) {
            if (opcode.name == name) {
                ops.push(opcode)
            }
        }
        return ops
    }
}

class Device {
    constructor(bus, addressRange, modifier = null, master = false) {
        this.bus = bus;
        this.addressRange = addressRange;
        this.modifier = modifier;
        this.master = master;
    }

    connect(bus) {
        this.bus = bus;
    }

    write(address, data) {
        this.bus.write(address, data, this);
    }

    read(address) {
        let val = this.bus.read(address, this);
        console.log("read: " + address + ", " + address.toString(16).padStart(4, '0').toUpperCase());
        console.log("value: " + val);
        return val;
    }

    isAddressInRange(address) { // deprecated? unused: yup
        return address >= this.addressRange.start && address <= this.addressRange.end;
    }
}

class Bus {
    constructor(mem) {
        this.devices = [];
        this.masterDevice = null;
        this.memory = mem;
    }

    connectDevice(device) {
        this.devices.push(device);
        console.log("master: " + device.master)
        if (device.master) {
            this.masterDevice = device;
        }
        device.connect(this);
    }

    write(address, data, device) {
        if (this.masterDevice && this.masterDevice.isAddressInRange(address)) {
            this.masterDevice.write(address, data);
        } else {
            const modifiedAddress = device.modifier != null ? address & device.modifier : address;
            this.memory.write(modifiedAddress, data);
        }
    }

    read(address, device) {
        if (this.masterDevice && this.masterDevice.isAddressInRange(address)) {
            return this.masterDevice.read(address);
        } else {
            const modifiedAddress = device.modifier != null ? address & device.modifier : address;
            const value = this.memory.read(modifiedAddress) 
            return value;
        }
    }
}

class Memory {
    constructor(size, arrayType, defaultValue) {
        this.size = size;
        this.data = new arrayType(size).fill(defaultValue);
        this.defaultValue = defaultValue;
    }

    reset() {
        this.data.fill(this.defaultValue);
    }

    read(address) {
        if (address >= 0 && address < this.size) {
            return this.data[address];
        }
        console.error("Address out of range for memory read:", address);
        return this.defaultValue;
    }

    write(address, value) {
        if (address >= 0 && address < this.size) {
            this.data[address] = value;
        } else {
            console.error("Address out of range for memory write:", address);
        }
    }
}

class AutoDataView {
    constructor(buffer) {
        this.dataView = new DataView(buffer);
        this.pointer = 0;
    }

    setUint8(value) {
        this.dataView.setUint8(this.pointer, value);
        this.pointer += 1;
    }

    setUint16(value, littleEndian = false) {
        this.dataView.setUint16(this.pointer, value, littleEndian);
        this.pointer += 2;
    }

    setUint32(value, littleEndian = false) {
        this.dataView.setUint32(this.pointer, value, littleEndian);
        this.pointer += 4;
    }

    setInt8(value) {
        this.dataView.setInt8(this.pointer, value);
        this.pointer += 1;
    }

    setInt16(value, littleEndian = false) {
        this.dataView.setInt16(this.pointer, value, littleEndian);
        this.pointer += 2;
    }

    setInt32(value, littleEndian = false) {
        this.dataView.setInt32(this.pointer, value, littleEndian);
        this.pointer += 4;
    }

    getPointer() {
        return this.pointer;
    }

    setPointer(newPointer) {
        this.pointer = newPointer;
    }

}


class PromiseRegistry {
    constructor() {
        this.promises = {};
    }

    register(event, promise) {
        this.promises[event] = promise;
    }

    async trigger(event, ...args) {
        if (this.promises[event]) {
            await this.promises[event](...args);
        }
    }
}

