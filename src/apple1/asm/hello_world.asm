; dasm hello_world.asm -o../progs/hello_world.o -l../build/hello_world.lst -s../build/hello_world.sym


	PROCESSOR   6502

	ORG	$0280

ECHO = $FFEF
MONITOR = $FF00

BEGIN
    LDX #$00

PRINT
    LDA STRING,X
    CMP #$00
    BEQ DONE
    JSR ECHO
    INX
    JMP PRINT

DONE
    JMP MONITOR

STRING DC "HELLO WORLD!!!", $00

