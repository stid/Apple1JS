
	; TEST ADDRESSING MODES
	; $FFFC and $FFFD - RESET PROGRAM COUNTER

	processor   6502

	org	$FF00

	lda #$00
	sta $0000
loop
    lda $0000
	tax
	inx
    stx $0000
	jmp loop
