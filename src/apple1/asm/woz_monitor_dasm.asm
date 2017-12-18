; dasm woz_monitor_masm.asm -orom.o -lrom.lst -srom.sym

;-------------------------------------------------------------------------
;
;  The WOZ Monitor for the Apple 1
;  Written by Steve Wozniak 1976
;
;-------------------------------------------------------------------------

                processor     6502
                org     $FF00

;-------------------------------------------------------------------------
;  Memory declaration
;-------------------------------------------------------------------------

XAML            equ     $24             ;Last "opened" location Low
XAMH            equ     $25             ;Last "opened" location High
STL             equ     $26             ;Store address Low
STH             equ     $27             ;Store address High
L               equ     $28             ;Hex value parsing Low
H               equ     $29             ;Hex value parsing High
YSAV            equ     $2A             ;Used to see if hex value is given
MODE            equ     $2B             ;$00=XAM, $7F=STOR, $AE=BLOCK XAM

IN              equ     $0200,$027F     ;Input buffer

KBD             equ     $D010           ;PIA.A keyboard input
KBDCR           equ     $D011           ;PIA.A keyboard control register
DSP             equ     $D012           ;PIA.B display output register
DSPCR           equ     $D013           ;PIA.B display control register

; KBD b7..b0 are inputs, b6..b0 is ASCII input, b7 is constant high
;     Programmed to respond to low to high KBD strobe
; DSP b6..b0 are outputs, b7 is input
;     CB2 goes low when data is written, returns high when CB1 goes high
; Interrupts are enabled, though not used. KBD can be jumpered to IRQ,
; whereas DSP can be jumpered to NMI.

;-------------------------------------------------------------------------
;  Constants
;-------------------------------------------------------------------------

BS              equ     $DF             ;Backspace key, arrow left key
CR              equ     $8D             ;Carriage Return
ESC             equ     $9B             ;ESC key
PROMPT          equ     $5C             ;Prompt character \

;-------------------------------------------------------------------------
;  Let's get started
;
;  Remark the RESET routine is only to be entered by asserting the RESET
;  line of the system. This ensures that the data direction registers
;  are selected.
;-------------------------------------------------------------------------

RESET           cld                      ;Clear decimal arithmetic mode
                cli
                ldy     #%01111111       ;Mask for DSP data direction reg
                sty     DSP              ;(DDR mode is assumed after reset)
                lda     #%10100111       ;KBD and DSP control register mask
                sta     KBDCR            ;Enable interrupts, set CA1, CB1 for
                sta     DSPCR            ;positive edge sense/output mode.

; Program falls through to the GETLINE routine to save some program bytes
; Please note that Y still holds $7F, which will cause an automatic Escape

;-------------------------------------------------------------------------
; The GETLINE process
;-------------------------------------------------------------------------

NOTCR           cmp     #BS             ;Backspace key?
                beq     BACKSPACE       ;Yes
                cmp     #ESC            ;ESC?
                beq     ESCAPE          ;Yes
                iny                     ;Advance text index
                bpl     NEXTCHAR        ;Auto ESC if line longer than 127

ESCAPE          lda     #PROMPT         ;Print prompt character
                jsr     ECHO            ;Output it.

GETLINE         lda     #CR             ;Send CR
                jsr     ECHO

                ldy     #0+1            ;Start a new input line
BACKSPACE       dey                     ;Backup text index
                bmi     GETLINE         ;Oops, line's empty, reinitialize

NEXTCHAR        lda     KBDCR           ;Wait for key press
                bpl     NEXTCHAR        ;No key yet!
                lda     KBD             ;Load character. B7 should be '1'
                sta     IN,Y            ;Add to text buffer
                jsr     ECHO            ;Display character
                cmp     #CR
                bne     NOTCR           ;It's not CR!

; Line received, now let's parse it

                ldy     #-1             ;Reset text index
                lda     #0              ;Default mode is XAM
                tax                     ;X=0

SETSTOR         asl                     ;Leaves $7B if setting STOR mode

SETMODE         sta     MODE            ;Set mode flags

BLSKIP          iny                     ;Advance text index

NEXTITEM        lda     IN,Y            ;Get character
                cmp     #CR
                beq     GETLINE         ;We're done if it's CR!
                cmp     #"."
                bcc     BLSKIP          ;Ignore everything below "."!
                beq     SETMODE         ;Set BLOCK XAM mode ("." = $AE)
                cmp     #":"
                beq     SETSTOR         ;Set STOR mode! $BA will become $7B
                cmp     #"R"
                beq     RUN             ;Run the program! Forget the rest
                stx     L               ;Clear input value (X=0)
                stx     H
                sty     YSAV            ;Save Y for comparison

; Here we're trying to parse a new hex value

NEXTHEX         lda     IN,Y            ;Get character for hex test
                eor     #$B0            ;Map digits to 0-9
                cmp     #9+1            ;Is it a decimal digit?
                bcc     DIG             ;Yes!
                adc     #$88            ;Map letter "A"-"F" to $FA-FF
                cmp     #$FA            ;Hex letter?
                bcc     NOTHEX          ;No! Character not hex

DIG             asl
                asl                     ;Hex digit to MSD of A
                asl
                asl

                ldx     #4              ;Shift count
HEXSHIFT        asl                     ;Hex digit left, MSB to carry
                rol     L               ;Rotate into LSD
                rol     H               ;Rotate into MSD's
                dex                     ;Done 4 shifts?
                bne     HEXSHIFT        ;No, loop
                iny                     ;Advance text index
                bne     NEXTHEX         ;Always taken

NOTHEX          cpy     YSAV            ;Was at least 1 hex digit given?
                beq     ESCAPE          ;No! Ignore all, start from scratch

                bit     MODE            ;Test MODE byte
                bvc     NOTSTOR         ;B6=0 is STOR, 1 is XAM or BLOCK XAM

; STOR mode, save LSD of new hex byte

                lda     L               ;LSD's of hex data
                sta     (STL,X)         ;Store current 'store index'(X=0)
                inc     STL             ;Increment store index.
                bne     NEXTITEM        ;No carry!
                inc     STH             ;Add carry to 'store index' high
TONEXTITEM      jmp     NEXTITEM        ;Get next command item.

;-------------------------------------------------------------------------
;  RUN user's program from last opened location
;-------------------------------------------------------------------------

RUN             jmp     (XAML)          ;Run user's program

;-------------------------------------------------------------------------
;  We're not in Store mode
;-------------------------------------------------------------------------

NOTSTOR         bmi     XAMNEXT         ;B7 = 0 for XAM, 1 for BLOCK XAM

; We're in XAM mode now

                ldx     #2              ;Copy 2 bytes
SETADR          lda     L-1,X           ;Copy hex data to
                sta     STL-1,X         ; 'store index'
                sta     XAML-1,X        ; and to 'XAM index'
                dex                     ;Next of 2 bytes
                bne     SETADR          ;Loop unless X = 0

; Print address and data from this address, fall through next bne.

NXTPRNT         bne     PRDATA          ;NE means no address to print
                lda     #CR             ;Print CR first
                jsr     ECHO
                lda     XAMH            ;Output high-order byte of address
                jsr     PRBYTE
                lda     XAML            ;Output low-order byte of address
                jsr     PRBYTE
                lda     #":"            ;Print colon
                jsr     ECHO

PRDATA          lda     #" "            ;Print space
                jsr     ECHO
                lda     (XAML,X)        ;Get data from address (X=0)
                jsr     PRBYTE          ;Output it in hex format
XAMNEXT         stx     MODE            ;0 -> MODE (XAM mode).
                lda     XAML            ;See if there's more to print
                cmp     L
                lda     XAMH
                sbc     H
                bcs     TONEXTITEM      ;Not less! No more data to output

                inc     XAML            ;Increment 'examine index'
                bne     MOD8CHK         ;No carry!
                inc     XAMH

MOD8CHK         lda     XAML            ;If address MOD 8 = 0 start new line
                and     #%00000111
                bpl     NXTPRNT         ;Always taken.

;-------------------------------------------------------------------------
;  Subroutine to print a byte in A in hex form (destructive)
;-------------------------------------------------------------------------

PRBYTE          pha                     ;Save A for LSD
                lsr
                lsr
                lsr                     ;MSD to LSD position
                lsr
                jsr     PRHEX           ;Output hex digit
                pla                     ;Restore A

; Fall through to print hex routine

;-------------------------------------------------------------------------
;  Subroutine to print a hexadecimal digit
;-------------------------------------------------------------------------

PRHEX           and     #%00001111     ;Mask LSD for hex print
                ora     #"0"            ;Add "0"
                cmp     #"9"+1          ;Is it a decimal digit?
                bcc     ECHO            ;Yes! output it
                adc     #6              ;Add offset for letter A-F

; Fall through to print routine

;-------------------------------------------------------------------------
;  Subroutine to print a character to the terminal
;-------------------------------------------------------------------------

ECHO            bit     DSP             ;DA bit (B7) cleared yet?
                bmi     ECHO            ;No! Wait for display ready
                sta     DSP             ;Output character. Sets DA
                rts

;-------------------------------------------------------------------------
;  Vector area
;-------------------------------------------------------------------------

                dc.w    $0000           ;Unused, what a pity
NMI_VEC         dc.w    $0F00           ;NMI vector
RESET_VEC       dc.w    RESET           ;RESET vector
IRQ_VEC         dc.w    $0000           ;IRQ vector

;-------------------------------------------------------------------------
