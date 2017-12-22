                .LF     A1VIDEO.LST
;------------------------------------------------------------------------
;
;  A1VIDEO.ASM
;
;  Video controller software for the Achatz A-One
;  Runs on an Atmel AtMega32 @ 16MHz (doc2503.pfd)
;
;
;  Author: San Bergmans
;  wwww.sbprojects.com
;
;------------------------------------------------------------------------

                .CR     AVR
                .FA     MEGAAVR
                .TF     A1VIDEO.HEX,INT,32

;------------------------------------------------------------------------
;  Constants
;------------------------------------------------------------------------

PER50           .EQ     127             # of clock periods for 50Hz Hsync
PER60           .EQ     126             # of clock periods for 60Hz Hsync
LINES_50HZ      .EQ     312             # of lines in a 50Hz frame
LINES_60HZ      .EQ     262             # of lines in a 60Hz frame
LINES_TOP50     .EQ     40              # of empty lines above pic (50Hz)
LINES_TOP60     .EQ     26              # of empty lines above pic (60Hz)
LINES_INT50     .EQ     3               # of lines between text (50Hz)
LINES_INT60     .EQ     2               # of lines between text (60Hz)

CTRLL_OPT       .EQ     1       or 0    Ctrl-L = Clear screen option


TEMP_LINES      .SE     7+LINES_INT50*24  Number of lines for text zone
LINES_BTM50     .EQ     LINES_50HZ-7-LINES_TOP50-TEMP_LINES

TEMP_LINES      .SE     7+LINES_INT60*24
LINES_BTM60     .EQ     LINES_60HZ-7-LINES_TOP60-TEMP_LINES

                .DO     LINES_BTM50>LINES_50HZ
                .ER     Too many lines for 50Hz system
                .FI
                .DO     LINES_BTM60>LINES_60HZ
                .ER     Too many lines for 60Hz system
                .FI

CURSOR          .EQ     '@'             Cursor character
CURSOR_RLD      .EQ     16              Cursor reload timer value
CTRLL           .EQ     $0C             Ctrl-L
CR              .EQ     $0D             Carriage return
LINE_LEN        .EQ     40              Characters per line
LINE_MAX        .EQ     24              Lines per screen


;------------------------------------------------------------------------
;  Variables
;------------------------------------------------------------------------

DELAY           .SE     0               Used to calculate Hsync length


;------------------------------------------------------------------------
;  Registers
;------------------------------------------------------------------------

ZERO            .EQ     0               This register always holds 0
STANDARD        .EQ     1               50Hz = 1, 60Hz = 0
TTY_DELAY       .EQ     2               Timer for artificial TTY delay
TOPCOUNT        .EQ     3               Number of lines at screen top
INTCOUNT        .EQ     4               Number of lines between text
BTMCOUNT        .EQ     5               Number of lines at bottom of scrn
FIRST_LINE      .EQ     6               First line of screen (scroll)
SCAN_LINE       .EQ     7               Current text scan line
LINE_CNTR       .EQ     8               State machine's line counter
TTY_STATE       .EQ     9               Next TTY state
CH              .EQ     10              Horizontal cursor position
CV              .EQ     11              Vertical cursor position
CURSOR_TMR      .EQ     12              Cursor timer
CURSOR_CHR      .EQ     13              Original character under cursor
SUB_STATE       .EQ     14              Used for CLS and scroll
SPLASH_FLAG     .EQ     15              Splash screen already shown ($5A)

ACCA            .EQ     16              Accu A register
ACCB            .EQ     17              Accu B register
SOUT_HEAD       .EQ     24              Serial output buffer head pntr
SOUT_TAIL       .EQ     25              Serial output buffer tail pntr
X               .EQ     26,27           X Register pair
Y               .EQ     28,29           Y Register pair
Z               .EQ     30,31           Z Register pair


;------------------------------------------------------------------------
;  I/O Space
;------------------------------------------------------------------------

TWBR            .EQ     $00             Two-wire Serial bit rate
TWSR            .EQ     $01             Two-wire Status register
TWAR            .EQ     $02             Two-wire Address register
TWDR            .EQ     $03             Two-wire Data register
ADCL            .EQ     $04             ADC data register low
ADCH            .EQ     $05             ADC data register high
ADCSRA          .EQ     $06             ADC control and status A
ADMUX           .EQ     $07             ADC multiplexer selection
ACSR            .EQ     $08             Analog comparator control
UBRRL           .EQ     $09             USART Baud rate register L
UCSRB           .EQ     $0A             USART control & status B
UCSRA           .EQ     $0B             USART control & status A
UDR             .EQ     $0C             USART I/O Data register
SPCR            .EQ     $0D             SPI control register
SPSR            .EQ     $0E             SPI status register
SPDR            .EQ     $0F             SPI Data register
PIND            .EQ     $10             Port D Input register
DDRD            .EQ     $11             Port D Data direction register
PORTD           .EQ     $12             Port D Output register
PINC            .EQ     $13             Port C Input register
DDRC            .EQ     $14             Port C Data direction register
PORTC           .EQ     $15             Port C Output register
PINB            .EQ     $16             Port B Input register
DDRB            .EQ     $17             Port B Data direction register
PORTB           .EQ     $18             Port B Output register
PINA            .EQ     $19             Port A Input register
DDRA            .EQ     $1A             Port A Data direction register
PORTA           .EQ     $1B             Port A Output register
EECR            .EQ     $1C             EEPROM control register
EEDR            .EQ     $1D             EEPROM data register
EEARL           .EQ     $1E             EEPROM address register L
EEARH           .EQ     $1F             EEPROM address register H
UBRRH           .EQ     $20             USART Baud rate register H
UCSRC           .EQ     $20             USART control & status register C
WDTCR           .EQ     $21             Watchdog Timer Control
ASSR            .EQ     $22             Asynchronous status register
OCR2            .EQ     $23             Timer/Counter2 Output compare
TCNT2           .EQ     $24             Timer/Counter2 (8 bits)
TCCR2           .EQ     $25             Timer/Counter2 Control register
ICR1L           .EQ     $26             Timer/Counter1 Input compare L
ICR1H           .EQ     $27             Timer/Counter1 Input compare H
OCR1BL          .EQ     $28             Timer/Counter1 Output compare BL
OCR1BH          .EQ     $29             Timer/Counter1 Output compare BH
OCR1AL          .EQ     $2A             Timer/Counter1 Output compare AL
OCR1AH          .EQ     $2B             Timer/Counter1 Output compare AH
TCNT1L          .EQ     $2C             Timer/Counter1 Counter register L
TCNT1H          .EQ     $2D             Timer/Counter1 Counter register H
TCCR1B          .EQ     $2E             Timer/Counter1 Control register B
TCCR1A          .EQ     $2F             Timer/Counter1 Control register A
SFIOR           .EQ     $30             Special Function I/O register
OCDR            .EQ     $31             On chip debug register
OSCCAL          .EQ     $31             Oscillator calibration register
TCNT0           .EQ     $32             Timer/Counter0 (8 bits)
TCCR0           .EQ     $33             Timer/Counter control register
MCUCSR          .EQ     $34             MCU Control & Status register
MCUCR           .EQ     $35             MCU Control register
TWCR            .EQ     $36             Two-wire control register
SPMCR           .EQ     $37             Store Program Memory control reg
TIFR            .EQ     $38             Timer/Counter Interrupt Flag reg
TIMSK           .EQ     $39             Timer/Counter Interrupt Mask reg
GIFR            .EQ     $3A             General Interrupt Flag register
GICR            .EQ     $3B             General Interrupt Control register
OCR0            .EQ     $3C             Timer/Counter0 Output Compare
SPL             .EQ     $3D             Stack pointer low
SPH             .EQ     $3E             Stack pointer high
SREG            .EQ     $3F             Processor status register


;------------------------------------------------------------------------
;  RAM Definitions
;------------------------------------------------------------------------

STACK_TOP       .EQ     $007F           Stack grows down to $0070

CHAR_LINE1      .EQ     $0100,$017F     Character table line 1
CHAR_LINE2      .EQ     $0200,$027F     Character table line 2
CHAR_LINE3      .EQ     $0300,$037F     Character table line 3
CHAR_LINE4      .EQ     $0400,$047F     Character table line 4
CHAR_LINE5      .EQ     $0500,$067F     Character table line 5
CHAR_LINE6      .EQ     $0600,$076F     Character table line 6
CHAR_LINE7      .EQ     $0700,$077F     Character table line 7

ROW0            .EQ     $0080,$00A7     Screen row 1
ROW1            .EQ     $00A8,$00CF     Screen row 2
ROW2            .EQ     $00D0,$00F7     Screen row 3

ROW3            .EQ     $0180,$01A7     Screen row 4
ROW4            .EQ     $01A8,$01CF     Screen row 5
ROW5            .EQ     $01D0,$01F7     Screen row 6

ROW6            .EQ     $0280,$02A7     Screen row 7
ROW7            .EQ     $02A8,$02CF     Screen row 8
ROW8            .EQ     $02D0,$02F7     Screen row 9

ROW9            .EQ     $0380,$03A7     Screen row 10
ROW10           .EQ     $03A8,$03CF     Screen row 11
ROW11           .EQ     $03D0,$03F7     Screen row 12

ROW12           .EQ     $0480,$04A7     Screen row 13
ROW13           .EQ     $04A8,$04CF     Screen row 14
ROW14           .EQ     $04D0,$04F7     Screen row 15

ROW15           .EQ     $0580,$05A7     Screen row 16
ROW16           .EQ     $05A8,$05CF     Screen row 17
ROW17           .EQ     $05D0,$05F7     Screen row 18

ROW18           .EQ     $0680,$06A7     Screen row 19
ROW19           .EQ     $06A8,$06CF     Screen row 20
ROW20           .EQ     $06D0,$06F7     Screen row 21

ROW21           .EQ     $0780,$07A7     Screen row 22
ROW22           .EQ     $07A8,$07CF     Screen row 23
ROW23           .EQ     $07D0,$07F7     Screen row 24

SOUT_BUFFER     .EQ     $0800,$083F     Plenty of room for serial buffer

ROW_ADDR        .EQ     $0840,$0857     Packed ROW address list


;------------------------------------------------------------------------
;  HSYNC macro
;  HSYNC2 macro (without extra tasks, intended during VSYNC)
;
;  The DELAY parameter indicates the number of clock pulses were wasted
;  before the macro was invoked. This value is used to compensate the
;  final delay.
;
;  Perform some basic task and waste excess time up to 4.7 us
;  Special care should be taken that all hsyncs are of the same length
;  to avoid horizontal text jitter
;------------------------------------------------------------------------

HSYNC           .MA     DELAY
                CPSE    TTY_DELAY,ZERO  Is TTY delay running?
                DEC     TTY_DELAY       Decrement if it is

DELAY           .SE     75-]1-4         Number of clock pulses to waste
                LDI     ACCA,#DELAY/3   Delay divided by loop time
:LOOP           DEC     ACCA            Waste time in loop
                BRNE    :LOOP           Not all time wasted yet!

DELAY           .SE     DELAY\3         How many single clocks left?
                .DO     DELAY>0
                NOP                     At least 1
                .DO     DELAY=2
                NOP                     No, two!
                .FI
                .FI

                .EM

HSYNC2          .MA     DELAY
DELAY           .SE     75-]1-2         Number of clock pulses to waste
                LDI     ACCA,#DELAY/3   Delay divided by loop time
:LOOP           DEC     ACCA            Waste time in loop
                BRNE    :LOOP           Not all time wasted yet!

DELAY           .SE     DELAY\3         How many single clocks left?
                .DO     DELAY>0
                NOP                     At least 1
                .DO     DELAY=2
                NOP                     No, two!
                .FI
                .FI

                .EM


;------------------------------------------------------------------------
;  COMP5060 macro
;
;  This macro compensates for the 0.25us difference between the line
;  length of a 50Hz and a 60Hz system.
;  In case of 50Hz, this macro eats up 3 clock pulses
;  In case of 60Hz, this macro eats up 7 clock pulses
;------------------------------------------------------------------------

COMP5060        .MA
                CP      STANDARD,ZERO   50 or 60Hz?
                BREQ    :60HZ
                NOP                     50Hz takes 4 clock pulses longer
                NOP                      (0.25us)
                NOP
                NOP
                NOP
:60HZ
                .EM


;------------------------------------------------------------------------
;  CHAR macro
;
;  Character outputting macro. Characters are painted to the screen at
;  top speed. No time to call for subroutines. Every single clock pulse
;  counts.
;------------------------------------------------------------------------

CHAR            .MA
                LD      ACCA,X+         Get character pattern
                OUT     PORTB,ACCA      Only used bit is b0
                NOP
                LSR     ACCA
                OUT     PORTB,ACCA
                NOP
                LSR     ACCA
                OUT     PORTB,ACCA
                NOP
                LSR     ACCA
                OUT     PORTB,ACCA
                NOP
                LSR     ACCA
                OUT     PORTB,ACCA
                LD      X,Y+            Get next character from line
                OUT     PORTB,ZERO      Clear bit before output
                .EM


;------------------------------------------------------------------------
;  Vector space
;------------------------------------------------------------------------

RESET           RJMP    INIT            Get things going
                NOP

                RETI                    INT0
                NOP

                RETI                    INT1
                NOP

                RETI                    INT2
                NOP

                RETI                    TIMER2 COMP
                NOP

                RETI                    TIMER2 OVF
                NOP

                RETI                    TIMER1 CAPT
                NOP

                RETI                    TIMER1 COMPA
                NOP

                RETI                    TIMER1 COMPB
                NOP

                RETI                    TIMER1 OVF
                NOP

                CBI     PORTD,2         Create falling edge of sync
                IJMP                    Jump to current state

                RETI                    TIMER0 OVF
                NOP

                RETI                    SPI, STC
                NOP

                RETI                    USART0, RXC
                NOP

                RETI                    USART0, UDRE
                NOP

                RETI                    USART0, TXC
                NOP

                RETI                    ADC
                NOP

                RETI                    EE READY
                NOP

                RETI                    ANALOG COMP
                NOP

                RETI                    TWI
                NOP

                RETI                    SPM READY
                NOP


;------------------------------------------------------------------------
;  INIT
;  Get things going
;------------------------------------------------------------------------

INIT            LDI     ACCA,#STACK_TOP Set stack pointer
                OUT     SPL,ACCA
                LDI     ACCA,/STACK_TOP
                OUT     SPH,ACCA
                EOR     ZERO,ZERO       Make this register 0 (4ever)
                MOV     TTY_DELAY,ZERO  Clear TTY delay timer
                MOV     STANDARD,ZERO   Set 60Hz mode for now

; Init ports
                OUT     PORTB,ZERO      Make video bit low
                LDI     ACCA,#%1111.1111 Only b7 of port B is actually
                OUT     DDRB,ACCA         used, rest outputs garbage
;                                       b6..b0 could have been inputs but
;                                        that would leave them floating

                OUT     DDRC,ZERO       Port C are all inputs (ASCII)
                OUT     PORTC,ACCA      Enable pull-ups

                OUT     PORTD,ACCA      Prepare outputs & pull-ups of D
                LDI     ACCA,#%0000.1110 Bits 1, 2 and 3 of Port D are
                OUT     DDRD,ACCA         outputs

; Initialize TTY
                MOV     CH,ZERO         Set cursor in upper left corner
                MOV     CV,ZERO

; Handle differences between 50 and 60Hz systems
                SBIC    PIND,6          50 or 60Hz?
                INC     STANDARD        50Hz!

                CP      STANDARD,ZERO   What standard is selected?
                BREQ    .60HZ

                LDI     ACCA,#LINES_TOP50  Setup variables for 50Hz
                MOV     TOPCOUNT,ACCA
                LDI     ACCA,#LINES_INT50
                MOV     INTCOUNT,ACCA
                LDI     ACCA,#LINES_BTM50
                MOV     BTMCOUNT,ACCA
                RJMP    .50HZ

.60HZ           LDI     ACCA,#LINES_TOP60  Setup variables for 60Hz
                MOV     TOPCOUNT,ACCA
                LDI     ACCA,#LINES_INT60
                MOV     INTCOUNT,ACCA
                LDI     ACCA,#LINES_BTM60
                MOV     BTMCOUNT,ACCA
.50HZ

; Initialize Character generator lookup tables
                LDI     X+1,/CHAR_LINE1 Copy character line 1
                LDI     ACCA,#0          with an offset of 0
                RCALL   COPY_CHARTAB
                LDI     X+1,/CHAR_LINE2 Copy character line 2
                LDI     ACCA,#1          with an offset of 1
                RCALL   COPY_CHARTAB
                LDI     X+1,/CHAR_LINE3 Copy character line 3
                LDI     ACCA,#2          with an offset of 2
                RCALL   COPY_CHARTAB
                LDI     X+1,/CHAR_LINE4 Copy character line 4
                LDI     ACCA,#3          with an offset of 3
                RCALL   COPY_CHARTAB
                LDI     X+1,/CHAR_LINE5 Copy character line 5
                LDI     ACCA,#4          with an offset of 4
                RCALL   COPY_CHARTAB
                LDI     X+1,/CHAR_LINE6 Copy character line 6
                LDI     ACCA,#5          with an offset of 5
                RCALL   COPY_CHARTAB
                LDI     X+1,/CHAR_LINE7 Copy character line 7
                LDI     ACCA,#6          with an offset of 6
                RCALL   COPY_CHARTAB

; Fill Row address table in RAM
                RCALL   COPY_ROWADDR

; Fill splash screen
                RCALL   FILL_SPLASH

; Initialize serial output (2400 baud, 8n1)
                LDI     ACCA,/416       Set baud rate generator
                OUT     UBRRH,ACCA
                LDI     ACCA,#416
                OUT     UBRRL,ACCA
                LDI     ACCA,#%1000.0110 Select 8n1 mode
                OUT     UCSRC,ACCA
                LDI     ACCA,#%0000.1000 Enable serial output
                OUT     UCSRB,ACCA
                LDI     SOUT_HEAD,#0    Clear serial output buffer
                LDI     SOUT_TAIL,#0     pointers

; Init timer/counter 0 to interrupt at Hsync interval
                LDI     ACCA,#%0000.1010 Timer0 control: CTC mode, no OC,
                OUT     TCCR0,ACCA        and prescaler :8
                LDI     ACCA,PER60      63.5us interval for 60Hz
                CPSE    STANDARD,ZERO   Check 50/60Hz jumper
                LDI     ACCA,PER50      64us interval for 50Hz
                OUT     OCR0,ACCA       Set CTC Top
                LDI     ACCA,#%0000.0010 Set OCIE0 interrupt mask
                OUT     TIMSK,ACCA

; Prepare registers for take off

                LDI     Z,#VSYNC1       Start with equalizing pulses
                LDI     Z+1,/VSYNC1      before Vsync

                SEI                     Enable interrupts (show time!)

;------------------------------------------------------------------------
;  Main program loop
;  All actual work is done inside the interrupt routine
;  Main program loop should remain empty to avoid horizontal jitter in
;  the generated picture due to potential interrupt latency problems.
;------------------------------------------------------------------------

.4EVER          LDI     ACCA,#%1000.0000 Allow and define Sleep mode
                OUT     MCUCR,ACCA
                SLEEP                   Go to sleep (constant latency)
                RJMP    .4EVER          A well organized main loop

;------------------------------------------------------------------------
;  COPY_CHARTAB
;  Copy one line of the character table from ROM into RAM
;  X is used as destination pointer
;  ACCA holds line offset
;------------------------------------------------------------------------

COPY_CHARTAB    LDI     X,#CHAR_LINE1   Destination low byte
                LDI     Z,#CHAR_TABLE*2 Get start of table in ROM
                LDI     Z+1,/CHAR_TABLE*2
                ADD     Z,ACCA          Add line offset to it
                ADC     Z+1,ZERO

.LOOP           LPM     ACCA,Z          Get byte from ROM
                ST      X,ACCA           and save it in RAM
                ADIW    Z,#7            Point to next character in table
                INC     X               Increment RAM pointer
                BRPL    .LOOP           Do until b7 is set (128 bytes)
                RET


;------------------------------------------------------------------------
;  COPY_ROWADDR
;  Copy packed Row address table to RAM
;  Each entry in the table holds the packed address of all 24 text rows
;  in screen memory.
;  Bits b2..b0 are the MSB, while bits b7..b3 are the LSB of the address.
;------------------------------------------------------------------------

COPY_ROWADDR    LDI     X,#ROW_ADDR     Setup the destination address
                LDI     X+1,/ROW_ADDR
                LDI     Z,#ROM_ROW*2    Setup source address
                LDI     Z+1,/ROM_ROW*2
                LDI     ACCB,#24        Do 24 bytes

.LOOP           LPM     ACCA,Z+         Get byte from ROM
                ST      X+,ACCA          and store it in RAM
                DEC     ACCB
                BRNE    .LOOP           Do all bytes
                RET


;------------------------------------------------------------------------
;  FILL_SPLASH
;  Fill splash screen
;------------------------------------------------------------------------

FILL_SPLASH     MOV     TTY_STATE,ZERO  Set Splash screen state
                INC     TTY_STATE
                MOV     FIRST_LINE,ZERO First line first

                LDI     ACCA,#$5A       Have we been here before?
                CP      SPLASH_FLAG,ACCA
                BREQ    .CLS            Yes! Clear screen
                MOV     SPLASH_FLAG,ACCA Set Splash flag
                MOV     CURSOR_TMR,ZERO Disable flashing during splash

                LDI     Z,#SPLASH_TXT*2 Read Splash text from ROM
                LDI     Z+1,/SPLASH_TXT*2
                LDI     X,#ROW0          and copy it to video buffer
                LDI     X+1,/ROW0         (a total of 8 blocks of 3
                RCALL   .FILL               lines each)
                LDI     X,#ROW3
                LDI     X+1,/ROW3
                RCALL   .FILL
                LDI     X,#ROW6
                LDI     X+1,/ROW6
                RCALL   .FILL
                LDI     X,#ROW9
                LDI     X+1,/ROW9
                RCALL   .FILL
                LDI     X,#ROW12
                LDI     X+1,/ROW12
                RCALL   .FILL
                LDI     X,#ROW15
                LDI     X+1,/ROW15
                RCALL   .FILL
                LDI     X,#ROW18
                LDI     X+1,/ROW18
                RCALL   .FILL
                LDI     X,#ROW21
                LDI     X+1,/ROW21

.FILL           LDI     ACCB,#120
.LOOP           LPM     ACCA,Z+
                ST      X+,ACCA
                DEC     ACCB
                BRNE    .LOOP
                RET

.CLS            MOV     SUB_STATE,ZERO  Clear the screen immediately
                RJMP    TTY_CLS


;------------------------------------------------------------------------
;  VSYNC state machine routines
;  To ensure compatibility with just about any TV screen I decided to
;  generate an official Vsync signal, including equalizing pulses.
;  Most TVs don't mind if they were missing, but I wanted the Vsync to
;  be perfect anyway.
;  The total Vsync takes up 7 lines, and the equal number of states.
;------------------------------------------------------------------------

;------------------------------------------------------------------------
; First leading line with half line sync pulse

VSYNC1          >HSYNC  2               Start with Hsync
                SBI     PORTD,2         End of Hsync, make high now
                LDI     Z,#VSYNC2       Next stop is second equalizing
                LDI     Z+1,/VSYNC2      line before Vsync
                RJMP    HALFSYNC        Generate sync pulse at h/2

;------------------------------------------------------------------------
; Second leading line with half line sync pulse

VSYNC2          >HSYNC  2               Start with Hsync
                SBI     PORTD,2         End of Hsync, make high now
                LDI     Z,#VSYNC3       Next stop is first half of Vsync
                LDI     Z+1,/VSYNC3
                RJMP    HALFSYNC        Generate sync pulse at h/2

;------------------------------------------------------------------------
; First line of Vsync

VSYNC3          LDI     Z,#VSYNC4       Next stop is second half of Vsync
                LDI     Z+1,/VSYNC4
                RJMP    HALFVSYNC

;------------------------------------------------------------------------
; Second line of Vsync

VSYNC4          LDI     Z,#VSYNC5       Next stop is end line of Vsync
                LDI     Z+1,/VSYNC5      (the one with the double pulse)
                RJMP    HALFVSYNC

;------------------------------------------------------------------------
; Half a line of Vsync and first half trailing line

VSYNC5          LDI     Z,#VSYNC6       Next stop is first trailing
                LDI     Z+1,/VSYNC6      Vsync line
                LDI     ACCA,#141       Wait half a line
.DELAY1         DEC     ACCA            Waste our time away
                BRNE    .DELAY1         Not done yet!
                >COMP5060               Compensate 50Hz/60Hz

                SBI     PORTD,2         Send inverted pulse
                >HSYNC  0               Delay 4.7us
                CBI     PORTD,2
                >HSYNC2 0               End of 2.5 lines of Vsync
                SBI     PORTD,2

                CP      CURSOR_TMR,ZERO Should the cursor flash?
                BREQ    .RETI           Nope! Still on splash screen

                DEC     CURSOR_TMR
                BRNE    .RETI           Not timed out yet!
                LDI     ACCA,#CURSOR_RLD Reload flash timer
                MOV     CURSOR_TMR,ACCA

                RCALL   CURSOR_POS      Calculate cursor position
                MOV     ACCA,CURSOR_CHR Swap cursor character with
                LD      ACCB,X           character under the cursor
                MOV     CURSOR_CHR,ACCB
                ST      X,ACCA

.RETI           RETI


;------------------------------------------------------------------------
; First trailing line with half line sync pulse

VSYNC6          >HSYNC  2               Start with Hsync
                SBI     PORTD,2         End of Hsync, make high now
                LDI     Z,#VSYNC7       Next stop is second and last
                LDI     Z+1,/VSYNC7      trailing Vsync line
                RJMP    HALFSYNC        Generate sync pulse at h/2

;------------------------------------------------------------------------
; Second trailing line with half line sync pulse

VSYNC7          >HSYNC  2               Start with Hsync
                SBI     PORTD,2         End of Hsync, make high now
                LDI     Z,#TOPLINES     Next stop are the empty lines
                LDI     Z+1,/TOPLINES    at the top of the screen
                MOV     LINE_CNTR,TOPCOUNT Set number of lines at the top
                NOP                     Compensates for the missing RJMP

;------------------------------------------------------------------------
; Leading and trailing lines share this part of the code

HALFSYNC        LDI     ACCA,#141       Wait half a line
.DELAY          DEC     ACCA            Waste our time away
                BRNE    .DELAY          Not done yet!
                >COMP5060               Compensate for the difference
                NOP                      between 50 and 60Hz line length

                CBI     PORTD,2         Generate another sync pulse
                >HSYNC2 0               No RJMP delay this time
                SBI     PORTD,2         Make sync high again
                RETI

;------------------------------------------------------------------------
; First and second Vsync lines share this part of the code

HALFVSYNC       LDI     ACCA,#141       Wait half a line
.DELAY1         DEC     ACCA            Waste our time away
                BRNE    .DELAY1         Not done yet!
                >COMP5060               Compensate 50Hz/60Hz

                SBI     PORTD,2         Send inverted pulse
                >HSYNC  0               Delay 4.7us
                CBI     PORTD,2

                LDI     ACCA,#142       Wait another half a line
.DELAY2         DEC     ACCA            Waste our time away
                BRNE    .DELAY2         Not done yet!
                >COMP5060               Compensate 50Hz/60Hz

                SBI     PORTD,2         Leave high for rest of the line
                RETI


;------------------------------------------------------------------------
;  TOPLINES state
;  During this state the empty lines at the top of the screen are drawn.
;  The line time (approximately 54us) can be used for TTY purposes.
;------------------------------------------------------------------------

TOPLINES        >HSYNC  2               Start with Hsync
                SBI     PORTD,2         End of Hsync, make high now

                DEC     LINE_CNTR       All lines done?
                BRNE    .SKIP           Nope!

                LDI     Z,#TEXTLINE     Next stop is the first text line
                LDI     Z+1,/TEXTLINE
                MOV     SCAN_LINE,ZERO  Start at top of screen

.SKIP           RCALL   TTY             Handle TTY engine
                RETI

;------------------------------------------------------------------------
;  TEXTLINE state
;  During this state a line of the current text row is painted on the
;  screen. This is extremely time critical, so we won't have time to do
;  anything else!
;------------------------------------------------------------------------

TEXTLINE        >HSYNC  2               Start with Hsync
                SBI     PORTD,2         End of Hsync, make high now

                >COMP5060               Compensate difference btwn 50/60
                INC     LINE_CNTR       Use as MSB pntr in char table RAM

                LDI     ACCA,#40        Horizontally centre text on
.DELAY          DEC     ACCA             screen
                BRNE    .DELAY

                LDI     Y,#ROW_ADDR     Calculate absolute address for
                LDI     Y+1,/ROW_ADDR    current text line
                MOV     ACCA,SCAN_LINE  Point to proper text line
                ADD     ACCA,FIRST_LINE
                CPI     ACCA,#LINE_MAX
                BRLO    .SKIP           Not beyond max line!
                SBCI    ACCA,#LINE_MAX  Roll back if beyond (Same length!)
.SKIP           ADD     Y,ACCA          Add row to address pntr (no Cy!)
                LD      ACCA,Y
                MOV     Y,ACCA          Unpack address
                MOV     Y+1,ACCA
                ANDI    Y,#%1111.1000
                ANDI    Y+1,#%0000.0111

                MOV     X+1,LINE_CNTR   Scan line of character pattern
                LD      X,Y+            Get first pattern of this line

                >CHAR                   Output 40 characters at top speed
                >CHAR                    No time to call for subroutines
                >CHAR                    Every single clock pulse
                >CHAR                     counts!
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR

                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR

                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR

                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR
                >CHAR

                LDI     ACCA,#7
                CP      LINE_CNTR,ACCA  Last text line?
                BRNE    .RETI           Nope!
                LDI     Z,#INTLINE      Next stop intermediate line
                LDI     Z+1,/INTLINE
                MOV     LINE_CNTR,INTCOUNT Setup interm. line counter
                INC     SCAN_LINE       Point to next scan row

.RETI           RETI


;------------------------------------------------------------------------
;  INTLINE state
;  During this state the empty lines between the rows of text are drawn.
;  The line time (approximately 54us) can be used for TTY purposes.
;------------------------------------------------------------------------

INTLINE         >HSYNC  2               Start with Hsync
                SBI     PORTD,2         End of Hsync, make high now

                DEC     LINE_CNTR       All lines done?
                BRNE    .TTY            Nope!
                MOV     ACCA,SCAN_LINE  All text rows done?
                CPI     ACCA,#LINE_MAX
                BRGE    .DONE           Yes!

                LDI     Z,#TEXTLINE     Next stop is another row of text
                LDI     Z+1,/TEXTLINE
                RJMP    .TTY

.DONE           LDI     Z,#BOTTOMLINES     Next stop is the final state,
                LDI     Z+1,/BOTTOMLINES    the bottom blank lines
                MOV     LINE_CNTR,BTMCOUNT  Setup number of lines there

.TTY            RCALL   TTY             Do the TTY routines now
                RETI


;------------------------------------------------------------------------
;  BOTTOMLINES state
;  During this state the empty lines at the bottom of the screen are
;  drawn.
;  The line time (approximately 54us) can be used for TTY purposes.
;------------------------------------------------------------------------

BOTTOMLINES     >HSYNC  2               Start with Hsync
                SBI     PORTD,2         End of Hsync, make high now

                DEC     LINE_CNTR       All lines done?
                BRNE    .SKIP           Nope!

                LDI     Z,#VSYNC1       This was the last state. Next
                LDI     Z+1,/VSYNC1      stop is back to the Vsync
.SKIP           RCALL   TTY             Handle TTY engine

                RETI


;------------------------------------------------------------------------
;  TTY
;  Main entry to the TTY engine
;
;  TTY state machine
;  0  Idle mode, waiting for a key
;  1  Splash screen mode, waiting for very first character
;  2  Clear screen
;  3  Scroll up
;------------------------------------------------------------------------

TTY             SBIC    PIND,7          Clear screen cmd from keyboard?
                RJMP    .NOTCLR         Nope!

                LDI     ACCA,#2         Set clear screen state
                MOV     TTY_STATE,ACCA
                MOV     SUB_STATE,ZERO
                RET                     Wait until end of request!

.NOTCLR         MOV     ACCA,TTY_STATE  Get current state
                CPI     ACCA,#0
                BRNE    .NOT0
                RJMP    TTY_IDLE        TTY Idle state

.NOT0           DEC     ACCA
                BRNE    .NOT1
                RJMP    TTY_SPLASH      Splash screen

.NOT1           DEC     ACCA
                BRNE    .NOT2
                RJMP    TTY_CLS         Clear screen

.NOT2
                MOV     TTY_STATE,ZERO  Was illegal state, reset machine
                RET


;------------------------------------------------------------------------

TTY_IDLE        RCALL   SERIAL          Handle serial output
                CP      TTY_DELAY,ZERO  Is it time to check for input?
                BREQ    .CHECK_IN       Yes!

                SBIC    PINA,1          Speed up during serial input?
                RET                     Not necessary!

.CHECK_IN       SBIS    PIND,4          Is a character waiting?
                RET                     Nope! Nothing to do here

                RCALL   CURSOR_POS      Get absolute cursor position
                LDI     ACCA,#CURSOR    Was character under cursor
                CP      ACCA,CURSOR_CHR  replaced?
                BREQ    .GET_IN         No! No need to restore it then
                ST      X,CURSOR_CHR    Restore character
                MOV     CURSOR_CHR,ACCA

.GET_IN         IN      ACCA,PINC       Get the character
                RCALL   PULSE_RDA       Signal acknowledge to Apple 1
                DEC     TTY_DELAY       Restart TTY_DELAY (255)
                CPI     ACCA,#CR        Is it carriage return?
                BREQ    .CR             Yes! Special treatment

                .DO     CTRLL_OPT       Only do if Ctrl-L option enabled
                CPI     ACCA,#CTRLL     Cntrl-L?
                BREQ    .CTRLL          Clear screen next time
                .FI

                ANDI    ACCA,#%0101.1111 Ignore b5 like real Apple 1 does
                MOV     CURSOR_CHR,ACCA Save new character
                ST      X,ACCA          Put new character on screen
                RCALL   SOUT            Send character to serial buffer
                LDI     ACCA,#CURSOR    Set cursor character
                MOV     CURSOR_CHR,ACCA
                LDI     ACCA,#CURSOR_RLD Restart cursor flash timer to
                MOV     CURSOR_TMR,ACCA   avoid artifacts during updates
                INC     CH              Increment CH
                LDI     ACCA,#LINE_LEN  End of line?
                CP      ACCA,CH
                BRNE    .RET            Nope! Done

.CR             MOV     CH,ZERO         Reset CH
                INC     CV              Increment CV
                LDI     ACCA,#LINE_MAX
                CP      ACCA,CV         Do we have to scroll?
                BRNE    .SOUT0          Nope!

                DEC     CV              Keep CV at bottom line
                RCALL   CLR_LINE        Clear (FIRST_LINE)
                INC     FIRST_LINE      Increment first line
                MOV     ACCA,FIRST_LINE Beyond end of screen?
                CPI     ACCA,#LINE_MAX
                BRNE    .SOUT0          Nope!
                MOV     FIRST_LINE,ZERO Start all over again

.SOUT0          LDI     ACCA,#CR        Send CR to terminal
                RCALL   SOUT0
.RET            RET

                .DO     CTRLL_OPT       Only do if Ctrl-L option enabled
.CTRLL          RCALL   SOUT0           Send Ctrl-L to serial output
                LDI     ACCA,#2         Next stop is clear screen state
                MOV     TTY_STATE,ACCA
                MOV     SUB_STATE,ZERO
                RET
                .FI

;------------------------------------------------------------------------

TTY_SPLASH      SBIS    PIND,4          Is a character waiting
                RET                     Nope! We're already done

                IN      ACCA,PINC       What character was it?
                CPI     ACCA,#'\'
                BREQ    .CLS            A backslash! Apple is running
                RJMP    PULSE_RDA       Ignore this character

.CLS            MOV     SUB_STATE,ZERO  Fall through to CLS routine

;------------------------------------------------------------------------

TTY_CLS         LDI     ACCA,#2         Select clear screen state
                MOV     TTY_STATE,ACCA
                LDI     X,#ROW0         Set pointers to clear the first
                LDI     X+1,/ROW0        six lines
                LDI     Y,#ROW3
                LDI     Y+1,/ROW3
                CP      SUB_STATE,ZERO
                BREQ    .CLEAR          Do the first 6 lines!
                LDI     X+1,/ROW6       Change pointers to next set of
                LDI     Y+1,/ROW9        six lines
                MOV     ACCA,SUB_STATE
                DEC     ACCA
                BREQ    .CLEAR          Do second set of 6 lines!
                LDI     X+1,/ROW12      Change pointers to next set of
                LDI     Y+1,/ROW15       six lines
                DEC     ACCA
                BREQ    .CLEAR          Do them!
                LDI     X+1,/ROW18      Change pointers to do the last
                LDI     Y+1,/ROW21       set of six lines
                MOV     CH,ZERO         Set cursor in upper left corner
                MOV     CV,ZERO
                MOV     FIRST_LINE,ZERO First line first
                MOV     TTY_STATE,ZERO  Next state is idle

.CLEAR          LDI     ACCA,#' '       Clear character
                LDI     ACCB,#3*40      Character counter (3 lines)

.LOOP           ST      X+,ACCA         Clear 1st row set
                ST      Y+,ACCA         Clear 2nd row set
                DEC     ACCB
                BRNE    .LOOP           Not done yet

                INC     SUB_STATE       Do next row-set if we come back
                LDI     ACCA,#16        Enable cursor flash
                MOV     CURSOR_TMR,ACCA
                LDI     ACCA,#CURSOR    Set proper cursor character
                MOV     CURSOR_CHR,ACCA

                RET


;------------------------------------------------------------------------
;  PULSE_RDA
;  Pulse the RDA line to signal that the character was accepted
;------------------------------------------------------------------------

PULSE_RDA       CBI     PORTD,3         Make signal low
                NOP
                NOP
                NOP
                NOP
                NOP
                NOP
                NOP
                NOP
                SBI     PORTD,3
                RET


;------------------------------------------------------------------------
;  CURSOR_POS
;  Calculate absolute cursor position
;------------------------------------------------------------------------

CURSOR_POS      LDI     X,#ROW_ADDR     Point to proper address in table
                LDI     X+1,/ROW_ADDR
                MOV     ACCA,CV         Add first line to CV
                ADD     ACCA,FIRST_LINE
                CPI     ACCA,#LINE_MAX  Beyond last line?
                BRLO    .SKIP           Nope!
                CLC                     Subtract last line to make it fit
                SBCI    ACCA,#LINE_MAX
.SKIP           ADD     X,ACCA          Add to table pointer
                LD      ACCA,X          Get packed address of line
                MOV     X,ACCA           and unpack it
                MOV     X+1,ACCA
                ANDI    X,#%1111.1000
                ANDI    X+1,#%0000.0111
                ADD     X,CH            Add horizontal cursor position
                RET


;------------------------------------------------------------------------
;  CLR_LINE
;  Clear FIRST_LINE for scroll purpose
;------------------------------------------------------------------------

CLR_LINE        LDI     Y,#ROW_ADDR     Point to proper address in table
                LDI     Y+1,/ROW_ADDR
                ADD     Y,FIRST_LINE
                ADC     Y+1,ZERO
                LD      ACCA,Y          Get packed value from table
                MOV     Y,ACCA          And move it and unpack it
                MOV     Y+1,ACCA
                ANDI    Y,#%1111.1000
                ANDI    Y+1,#%0000.0111
                LDI     ACCA,#' '       Fill line with spaces
                LDI     ACCB,#40

.LOOP           ST      Y+,ACCA
                DEC     ACCB
                BRNE    .LOOP           Do all 40 characters!
                RET


;------------------------------------------------------------------------
;  SOUT
;------------------------------------------------------------------------

SOUT            CPI     ACCA,#' '       Is it a control character?
                BRSH    SOUT0           Nope!
                ORI     ACCA,#%0010.0000 Make it a printable character

SOUT0           MOV     X,SOUT_TAIL     Prepare output buffer pointer
                LDI     X+1,/SOUT_BUFFER
                ST      X+,ACCA         Save character to output buffer
                ANDI    X,#%0001.1111   Wrap around if necessary
                CP      X,SOUT_HEAD     Is buffer full?
                BREQ    SERIAL          Yes! We've lost some characters!
                MOV     SOUT_TAIL,X     Save new pointer

;------------------------------------------------------------------------
;  SERIAL
;------------------------------------------------------------------------

SERIAL          CP      SOUT_HEAD,SOUT_TAIL Is there anything to send?
                BREQ    .RET            Nope!
                SBIS    UCSRA,5         Is the output register empty?
                RJMP    .RET            Nope!
                MOV     X,SOUT_HEAD     Prepare pointer to next character
                LDI     X+1,/SOUT_BUFFER
                LD      ACCA,X+         Get the character
                OUT     UDR,ACCA         and send it out
                ANDI    X,#%0001.1111   Wrap around if necessary
                MOV     SOUT_HEAD,X     Save new pointer
.RET            RET



;------------------------------------------------------------------------
;  CHAR_TABLE
;
;  This is a complete character table, even though the Apple 1 can't
;  actually print lower case characters. However I've included lower case
;  anyway so they can be used for the splash screen.
;  The first 32 characters are actually non printable CTRL characters.
;  To mimic the original Apple 1 behaviour I've copied the range from
;  $20 to $3F into this block.
;------------------------------------------------------------------------

                .DS

CHAR_TABLE      .DA     #%00000         sp $00
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000

                .DA     #%00100         !
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00000
                .DA     #%00100

                .DA     #%01010         "
                .DA     #%01010
                .DA     #%01010
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000

                .DA     #%01010         #
                .DA     #%01010
                .DA     #%11111
                .DA     #%01010
                .DA     #%11111
                .DA     #%01010
                .DA     #%01010

                .DA     #%00100         $
                .DA     #%11110
                .DA     #%00101
                .DA     #%01110
                .DA     #%10100
                .DA     #%01111
                .DA     #%00100

                .DA     #%00011         %
                .DA     #%10011
                .DA     #%01000
                .DA     #%00100
                .DA     #%00010
                .DA     #%11001
                .DA     #%11000

                .DA     #%00010         &
                .DA     #%00101
                .DA     #%00101
                .DA     #%00010
                .DA     #%10101
                .DA     #%01001
                .DA     #%10110

                .DA     #%00100         '
                .DA     #%00100
                .DA     #%00100
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000

                .DA     #%00100         (
                .DA     #%00010
                .DA     #%00001
                .DA     #%00001
                .DA     #%00001
                .DA     #%00010
                .DA     #%00100

                .DA     #%00100         )
                .DA     #%01000
                .DA     #%10000
                .DA     #%10000
                .DA     #%10000
                .DA     #%01000
                .DA     #%00100

                .DA     #%00100         *
                .DA     #%10101
                .DA     #%01110
                .DA     #%00100
                .DA     #%01110
                .DA     #%10101
                .DA     #%00100

                .DA     #%00000         +
                .DA     #%00100
                .DA     #%00100
                .DA     #%11111
                .DA     #%00100
                .DA     #%00100
                .DA     #%00000

                .DA     #%00000         ,
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00100
                .DA     #%00100
                .DA     #%00010

                .DA     #%00000         -
                .DA     #%00000
                .DA     #%00000
                .DA     #%11111
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000

                .DA     #%00000         .
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00100

                .DA     #%00000         /
                .DA     #%10000
                .DA     #%01000
                .DA     #%00100
                .DA     #%00010
                .DA     #%00001
                .DA     #%00000

                .DA     #%01110         0  $10
                .DA     #%10001
                .DA     #%11001
                .DA     #%10101
                .DA     #%10011
                .DA     #%10001
                .DA     #%01110

                .DA     #%00100         1
                .DA     #%00110
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%01110

                .DA     #%01110         2
                .DA     #%10001
                .DA     #%10000
                .DA     #%01100
                .DA     #%00010
                .DA     #%00001
                .DA     #%11111

                .DA     #%11111         3
                .DA     #%10000
                .DA     #%01000
                .DA     #%01100
                .DA     #%10000
                .DA     #%10001
                .DA     #%01110

                .DA     #%01000         4
                .DA     #%01100
                .DA     #%01010
                .DA     #%01001
                .DA     #%11111
                .DA     #%01000
                .DA     #%01000

                .DA     #%11111         5
                .DA     #%00001
                .DA     #%01111
                .DA     #%10000
                .DA     #%10000
                .DA     #%10001
                .DA     #%01110

                .DA     #%11100         6
                .DA     #%00010
                .DA     #%00001
                .DA     #%01111
                .DA     #%10001
                .DA     #%10001
                .DA     #%01110

                .DA     #%11111         7
                .DA     #%10000
                .DA     #%01000
                .DA     #%00100
                .DA     #%00010
                .DA     #%00010
                .DA     #%00010

                .DA     #%01110         8
                .DA     #%10001
                .DA     #%10001
                .DA     #%01110
                .DA     #%10001
                .DA     #%10001
                .DA     #%01110

                .DA     #%01110         9
                .DA     #%10001
                .DA     #%10001
                .DA     #%11110
                .DA     #%10000
                .DA     #%01000
                .DA     #%00111

                .DA     #%00000         :
                .DA     #%00000
                .DA     #%00100
                .DA     #%00000
                .DA     #%00100
                .DA     #%00000
                .DA     #%00000

                .DA     #%00000         ;
                .DA     #%00000
                .DA     #%00100
                .DA     #%00000
                .DA     #%00100
                .DA     #%00100
                .DA     #%00010

                .DA     #%01000         <
                .DA     #%00100
                .DA     #%00010
                .DA     #%00001
                .DA     #%00010
                .DA     #%00100
                .DA     #%01000

                .DA     #%00000         =
                .DA     #%00000
                .DA     #%11111
                .DA     #%00000
                .DA     #%11111
                .DA     #%00000
                .DA     #%00000

                .DA     #%00010         >
                .DA     #%00100
                .DA     #%01000
                .DA     #%10000
                .DA     #%01000
                .DA     #%00100
                .DA     #%00010

                .DA     #%01110         ?
                .DA     #%10001
                .DA     #%01000
                .DA     #%00100
                .DA     #%00100
                .DA     #%00000
                .DA     #%00100

                .DA     #%00000         sp $20
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000

                .DA     #%00100         !
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00000
                .DA     #%00100

                .DA     #%01010         "
                .DA     #%01010
                .DA     #%01010
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000

                .DA     #%01010         #
                .DA     #%01010
                .DA     #%11111
                .DA     #%01010
                .DA     #%11111
                .DA     #%01010
                .DA     #%01010

                .DA     #%00100         $
                .DA     #%11110
                .DA     #%00101
                .DA     #%01110
                .DA     #%10100
                .DA     #%01111
                .DA     #%00100

                .DA     #%00011         %
                .DA     #%10011
                .DA     #%01000
                .DA     #%00100
                .DA     #%00010
                .DA     #%11001
                .DA     #%11000

                .DA     #%00010         &
                .DA     #%00101
                .DA     #%00101
                .DA     #%00010
                .DA     #%10101
                .DA     #%01001
                .DA     #%10110

                .DA     #%00100         '
                .DA     #%00100
                .DA     #%00100
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000

                .DA     #%00100         (
                .DA     #%00010
                .DA     #%00001
                .DA     #%00001
                .DA     #%00001
                .DA     #%00010
                .DA     #%00100

                .DA     #%00100         )
                .DA     #%01000
                .DA     #%10000
                .DA     #%10000
                .DA     #%10000
                .DA     #%01000
                .DA     #%00100

                .DA     #%00100         *
                .DA     #%10101
                .DA     #%01110
                .DA     #%00100
                .DA     #%01110
                .DA     #%10101
                .DA     #%00100

                .DA     #%00000         +
                .DA     #%00100
                .DA     #%00100
                .DA     #%11111
                .DA     #%00100
                .DA     #%00100
                .DA     #%00000

                .DA     #%00000         ,
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00100
                .DA     #%00100
                .DA     #%00010

                .DA     #%00000         -
                .DA     #%00000
                .DA     #%00000
                .DA     #%11111
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000

                .DA     #%00000         .
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00100

                .DA     #%00000         /
                .DA     #%10000
                .DA     #%01000
                .DA     #%00100
                .DA     #%00010
                .DA     #%00001
                .DA     #%00000

                .DA     #%01110         0  $30
                .DA     #%10001
                .DA     #%11001
                .DA     #%10101
                .DA     #%10011
                .DA     #%10001
                .DA     #%01110

                .DA     #%00100         1
                .DA     #%00110
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%01110

                .DA     #%01110         2
                .DA     #%10001
                .DA     #%10000
                .DA     #%01100
                .DA     #%00010
                .DA     #%00001
                .DA     #%11111

                .DA     #%11111         3
                .DA     #%10000
                .DA     #%01000
                .DA     #%01100
                .DA     #%10000
                .DA     #%10001
                .DA     #%01110

                .DA     #%01000         4
                .DA     #%01100
                .DA     #%01010
                .DA     #%01001
                .DA     #%11111
                .DA     #%01000
                .DA     #%01000

                .DA     #%11111         5
                .DA     #%00001
                .DA     #%01111
                .DA     #%10000
                .DA     #%10000
                .DA     #%10001
                .DA     #%01110

                .DA     #%11100         6
                .DA     #%00010
                .DA     #%00001
                .DA     #%01111
                .DA     #%10001
                .DA     #%10001
                .DA     #%01110

                .DA     #%11111         7
                .DA     #%10000
                .DA     #%01000
                .DA     #%00100
                .DA     #%00010
                .DA     #%00010
                .DA     #%00010

                .DA     #%01110         8
                .DA     #%10001
                .DA     #%10001
                .DA     #%01110
                .DA     #%10001
                .DA     #%10001
                .DA     #%01110

                .DA     #%01110         9
                .DA     #%10001
                .DA     #%10001
                .DA     #%11110
                .DA     #%10000
                .DA     #%01000
                .DA     #%00111

                .DA     #%00000         :
                .DA     #%00000
                .DA     #%00100
                .DA     #%00000
                .DA     #%00100
                .DA     #%00000
                .DA     #%00000

                .DA     #%00000         ;
                .DA     #%00000
                .DA     #%00100
                .DA     #%00000
                .DA     #%00100
                .DA     #%00100
                .DA     #%00010

                .DA     #%01000         <
                .DA     #%00100
                .DA     #%00010
                .DA     #%00001
                .DA     #%00010
                .DA     #%00100
                .DA     #%01000

                .DA     #%00000         =
                .DA     #%00000
                .DA     #%11111
                .DA     #%00000
                .DA     #%11111
                .DA     #%00000
                .DA     #%00000

                .DA     #%00010         >
                .DA     #%00100
                .DA     #%01000
                .DA     #%10000
                .DA     #%01000
                .DA     #%00100
                .DA     #%00010

                .DA     #%01110         ?
                .DA     #%10001
                .DA     #%01000
                .DA     #%00100
                .DA     #%00100
                .DA     #%00000
                .DA     #%00100

                .DA     #%01110         @  $40
                .DA     #%10001
                .DA     #%10101
                .DA     #%11101
                .DA     #%01101
                .DA     #%00001
                .DA     #%11110

                .DA     #%00100         A
                .DA     #%01010
                .DA     #%10001
                .DA     #%10001
                .DA     #%11111
                .DA     #%10001
                .DA     #%10001

                .DA     #%01111         B
                .DA     #%10001
                .DA     #%10001
                .DA     #%01111
                .DA     #%10001
                .DA     #%10001
                .DA     #%01111

                .DA     #%01110         C
                .DA     #%10001
                .DA     #%00001
                .DA     #%00001
                .DA     #%00001
                .DA     #%10001
                .DA     #%01110

                .DA     #%01111         D
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%01111

                .DA     #%11111         E
                .DA     #%00001
                .DA     #%00001
                .DA     #%01111
                .DA     #%00001
                .DA     #%00001
                .DA     #%11111

                .DA     #%11111         F
                .DA     #%00001
                .DA     #%00001
                .DA     #%01111
                .DA     #%00001
                .DA     #%00001
                .DA     #%00001

                .DA     #%11110         G
                .DA     #%00001
                .DA     #%00001
                .DA     #%00001
                .DA     #%11001
                .DA     #%10001
                .DA     #%11110

                .DA     #%10001         H
                .DA     #%10001
                .DA     #%10001
                .DA     #%11111
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001

                .DA     #%01110         I
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%01110

                .DA     #%10000         J
                .DA     #%10000
                .DA     #%10000
                .DA     #%10000
                .DA     #%10000
                .DA     #%10001
                .DA     #%01110

                .DA     #%10001         K
                .DA     #%01001
                .DA     #%00101
                .DA     #%00011
                .DA     #%00101
                .DA     #%01001
                .DA     #%10001

                .DA     #%00001         L
                .DA     #%00001
                .DA     #%00001
                .DA     #%00001
                .DA     #%00001
                .DA     #%00001
                .DA     #%11111

                .DA     #%10001         M
                .DA     #%11011
                .DA     #%10101
                .DA     #%10101
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001

                .DA     #%10001         N
                .DA     #%10001
                .DA     #%10011
                .DA     #%10101
                .DA     #%11001
                .DA     #%10001
                .DA     #%10001

                .DA     #%01110         O
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%01110

                .DA     #%01111         P  $50
                .DA     #%10001
                .DA     #%10001
                .DA     #%01111
                .DA     #%00001
                .DA     #%00001
                .DA     #%00001

                .DA     #%01110         Q
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%10101
                .DA     #%01001
                .DA     #%10110

                .DA     #%01111         R
                .DA     #%10001
                .DA     #%10001
                .DA     #%01111
                .DA     #%00101
                .DA     #%01001
                .DA     #%10001

                .DA     #%01110         S
                .DA     #%10001
                .DA     #%00001
                .DA     #%01110
                .DA     #%10000
                .DA     #%10001
                .DA     #%01110

                .DA     #%11111         T
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100

                .DA     #%10001         U
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%01110

                .DA     #%10001         V
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%01010
                .DA     #%00100

                .DA     #%10001         W
                .DA     #%10001
                .DA     #%10001
                .DA     #%10101
                .DA     #%10101
                .DA     #%11011
                .DA     #%10001

                .DA     #%10001         X
                .DA     #%10001
                .DA     #%01010
                .DA     #%00100
                .DA     #%01010
                .DA     #%10001
                .DA     #%10001

                .DA     #%10001         Y
                .DA     #%10001
                .DA     #%01010
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100

                .DA     #%11111         Z
                .DA     #%10000
                .DA     #%01000
                .DA     #%00100
                .DA     #%00010
                .DA     #%00001
                .DA     #%11111

                .DA     #%11111         [
                .DA     #%00011
                .DA     #%00011
                .DA     #%00011
                .DA     #%00011
                .DA     #%00011
                .DA     #%11111

                .DA     #%00000         \
                .DA     #%00001
                .DA     #%00010
                .DA     #%00100
                .DA     #%01000
                .DA     #%10000
                .DA     #%00000

                .DA     #%11111         ]
                .DA     #%11000
                .DA     #%11000
                .DA     #%11000
                .DA     #%11000
                .DA     #%11000
                .DA     #%11111

                .DA     #%00000         ^
                .DA     #%00000
                .DA     #%00100
                .DA     #%01010
                .DA     #%10001
                .DA     #%00000
                .DA     #%00000

                .DA     #%00000         _
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%11111

                .DA     #%00100         `
                .DA     #%00100
                .DA     #%01000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000

                .DA     #%00000         a
                .DA     #%00000
                .DA     #%01110
                .DA     #%10000
                .DA     #%11110
                .DA     #%10001
                .DA     #%11110

                .DA     #%00001         b
                .DA     #%00001
                .DA     #%00001
                .DA     #%01111
                .DA     #%10001
                .DA     #%10001
                .DA     #%01111

                .DA     #%00000         c
                .DA     #%00000
                .DA     #%11110
                .DA     #%00001
                .DA     #%00001
                .DA     #%00001
                .DA     #%11110

                .DA     #%10000         d
                .DA     #%10000
                .DA     #%10000
                .DA     #%11110
                .DA     #%10001
                .DA     #%10001
                .DA     #%11110

                .DA     #%00000         e
                .DA     #%00000
                .DA     #%01110
                .DA     #%10001
                .DA     #%01111
                .DA     #%00001
                .DA     #%11110

                .DA     #%01100         f
                .DA     #%10010
                .DA     #%00010
                .DA     #%00111
                .DA     #%00010
                .DA     #%00010
                .DA     #%00010

                .DA     #%00000         g
                .DA     #%11110
                .DA     #%10001
                .DA     #%10001
                .DA     #%11110
                .DA     #%10000
                .DA     #%01110

                .DA     #%00001         h
                .DA     #%00001
                .DA     #%00001
                .DA     #%01111
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001

                .DA     #%00100         i
                .DA     #%00000
                .DA     #%00110
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%01110

                .DA     #%01000         j
                .DA     #%00000
                .DA     #%01000
                .DA     #%01000
                .DA     #%01000
                .DA     #%01001
                .DA     #%00110

                .DA     #%00001         k
                .DA     #%00001
                .DA     #%01001
                .DA     #%00101
                .DA     #%00011
                .DA     #%00101
                .DA     #%01001

                .DA     #%00110         l
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100
                .DA     #%01110

                .DA     #%00000         m
                .DA     #%00000
                .DA     #%01011
                .DA     #%10101
                .DA     #%10101
                .DA     #%10101
                .DA     #%10101

                .DA     #%00000         n
                .DA     #%00000
                .DA     #%01101
                .DA     #%10011
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001

                .DA     #%00000         o
                .DA     #%00000
                .DA     #%01110
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%01110

                .DA     #%00000         p  $70
                .DA     #%01111
                .DA     #%10001
                .DA     #%01111
                .DA     #%00001
                .DA     #%00001
                .DA     #%00001

                .DA     #%00000         q
                .DA     #%11110
                .DA     #%10001
                .DA     #%11110
                .DA     #%10000
                .DA     #%10000
                .DA     #%10000

                .DA     #%00000         r
                .DA     #%00000
                .DA     #%01101
                .DA     #%00011
                .DA     #%00001
                .DA     #%00001
                .DA     #%00001

                .DA     #%00000         s
                .DA     #%00000
                .DA     #%11110
                .DA     #%00001
                .DA     #%01110
                .DA     #%10000
                .DA     #%01111

                .DA     #%00010         t
                .DA     #%00010
                .DA     #%00111
                .DA     #%00010
                .DA     #%00010
                .DA     #%10010
                .DA     #%01100

                .DA     #%00000         u
                .DA     #%00000
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%01110

                .DA     #%00000         v
                .DA     #%00000
                .DA     #%10001
                .DA     #%10001
                .DA     #%10001
                .DA     #%01010
                .DA     #%00100

                .DA     #%00000         w
                .DA     #%00000
                .DA     #%10001
                .DA     #%10001
                .DA     #%10101
                .DA     #%10101
                .DA     #%01010

                .DA     #%00000         x
                .DA     #%00000
                .DA     #%10001
                .DA     #%01010
                .DA     #%00100
                .DA     #%01010
                .DA     #%10001

                .DA     #%00000         y
                .DA     #%10001
                .DA     #%10001
                .DA     #%01010
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100

                .DA     #%00000         z
                .DA     #%00000
                .DA     #%11111
                .DA     #%01000
                .DA     #%00100
                .DA     #%00010
                .DA     #%11111

                .DA     #%01100         {
                .DA     #%00010
                .DA     #%00010
                .DA     #%00001
                .DA     #%00010
                .DA     #%00010
                .DA     #%01100

                .DA     #%00100         |
                .DA     #%00100
                .DA     #%00100
                .DA     #%00000
                .DA     #%00100
                .DA     #%00100
                .DA     #%00100

                .DA     #%00110         }
                .DA     #%01000
                .DA     #%01000
                .DA     #%10000
                .DA     #%01000
                .DA     #%01000
                .DA     #%00110

                .DA     #%01010         ~
                .DA     #%00101
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000
                .DA     #%00000

                .DA     #%11111         block
                .DA     #%11111
                .DA     #%11111
                .DA     #%11111
                .DA     #%11111
                .DA     #%11111
                .DA     #%11111

                .CS

;------------------------------------------------------------------------
;  ROM_ROW
;  Text Row addresses
;------------------------------------------------------------------------

                .DS

ROM_ROW         .DA     #0+$80          Row 0
                .DA     #0+$A8          Row 1
                .DA     #0+$D0          Row 2
                .DA     #1+$80          Row 3
                .DA     #1+$A8          Row 4
                .DA     #1+$D0          Row 5
                .DA     #2+$80          Row 6
                .DA     #2+$A8          Row 7
                .DA     #2+$D0          Row 8
                .DA     #3+$80          Row 9
                .DA     #3+$A8          Row 10
                .DA     #3+$D0          Row 11
                .DA     #4+$80          Row 12
                .DA     #4+$A8          Row 13
                .DA     #4+$D0          Row 14
                .DA     #5+$80          Row 15
                .DA     #5+$A8          Row 16
                .DA     #5+$D0          Row 17
                .DA     #6+$80          Row 18
                .DA     #6+$A8          Row 19
                .DA     #6+$D0          Row 20
                .DA     #7+$80          Row 21
                .DA     #7+$A8          Row 22
                .DA     #7+$D0          Row 23

                .CS

;------------------------------------------------------------------------
;  SPLASH_TXT
;  Splash screen content
;------------------------------------------------------------------------

                .DS

SPLASH_TXT      .AS     "+         APPLE 1        A-ONE         +"    1
                .AS     "                                        "    2
                .AS     "                                        "    3
                .AS     "      Original Apple 1 design:          "    4
                .AS     "                                        "    5
                .AS     "        Steve Wozniak   1975            "    6
                .AS     "        www.woz.org                     "    7
                .AS     "                                        "    8
                .AS     "      A-One hardware design:            "    9
                .AS     "                                        "   10
                .AS     "        Franz Achatz    2006            "   11
                .AS     "        www.achatz.nl                   "   12
                .AS     "                                        "   13
                .AS     "      Video controller software:        "   14
                .AS     "                                        "   15
                .AS     "        San Bergmans    2006            "   16
                .AS     "        www.sbprojects.com              "   17
                .AS     "                                        "   18
                .AS     "      Keyboard controller software:     "   19
                .AS     "                                        "   20
                .AS     "        Ben Zijlstra    2006            "   21
                .AS     "        www.benshobbycorner.nl          "   22
                .AS     "                                        "   23
                .AS     "+  Please press RESET to get started.  +"   24

                .CS

                .LI     OFF
