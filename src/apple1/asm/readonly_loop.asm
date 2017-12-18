
	; TEST ADDRESSING MODES
	; $FFFC and $FFFD - RESET PROGRAM COUNTER

	processor   6502
	org	$FF00

loop
	nop
	nop
loop2
	nop
	jmp loop2
