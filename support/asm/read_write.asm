
; dasm read_write.asm -oread_write.o -lread_write.lst -sread_write.sym


	; TEST ADDRESSING MODES
	; $FFFC and $FFFD - RESET PROGRAM COUNTER

	processor   6502

	org	$FF00

loop
    lda #$AA
    sta $0000
	lda #$BB
	sta $0001
	nop
	jmp loop
