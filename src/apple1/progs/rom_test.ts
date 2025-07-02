// Test program that triggers ROM write warnings for UI logging demonstration
// This program attempts to write to ROM addresses, which will trigger logging messages
const PROG = [
    0x00,
    0x00, // Load at RAM address $0000
    
    // LDA #$AA - Load accumulator with test value
    0xA9,
    0xAA,
    
    // STA $FF00 - Attempt to store to ROM (will trigger warning)
    0x8D,
    0x00,
    0xFF,
    
    // LDA #$BB - Load accumulator with another test value  
    0xA9,
    0xBB,
    
    // STA $FF01 - Another ROM write attempt (will trigger warning)
    0x8D,
    0x01,
    0xFF,
    
    // LDA #$CC - Load accumulator with third test value
    0xA9,
    0xCC,
    
    // STA $FF02 - Third ROM write attempt (will trigger warning)
    0x8D,
    0x02,
    0xFF,
    
    // JMP $0000 - Jump back to start (infinite loop to keep triggering)
    0x4C,
    0x00,
    0x00,
];

export default PROG;