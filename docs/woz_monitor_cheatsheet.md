# WOZ Monitor Cheatsheet (Apple-1)

## Commands

| Format       | Description                        |
|--------------|------------------------------------|
| `XXXX`       | Examine memory at address `XXXX`   |
| `XXXX:YY`    | Store byte `YY` at address `XXXX`  |
| `R`          | Run program at last address        |
| `ESC`        | Cancel input                       |
| `BS`         | Backspace (non-destructive)        |

- Only last 4 hex digits of address and 2 digits of data are used.
- Input buffer: 127 chars. Overflow resets line.

---

## Memory Map

| Range         | Description                     |
|---------------|---------------------------------|
| `$0000–$0FFF` | RAM (4KB)                       |
| `$D010–$D013` | PIA (Keyboard/Display I/O)      |
| `$E000–$EFFF` | Extended RAM (for BASIC)        |
| `$FF00–$FFFF` | ROM (WOZ Monitor, 256 bytes)    |

---

## PIA Registers

| Addr   | Name    | Function                     |
|--------|---------|------------------------------|
| `$D010`| `KBD`   | Keyboard input (ASCII)       |
| `$D011`| `KBDCR` | Keyboard control             |
| `$D012`| `DSP`   | Display output               |
| `$D013`| `DSPCR` | Display control              |
