# Apple 1 NodeJS Emulator

NodeJS Apple 1 Emulator, include initial abstraction of 6820 and other core components.

Start in dev mode via: `yarn raw_start`

You can compile it via webpack using: `yarn build` and just `yarn start` to run the compiled version. This will not give you so much - just playing with the flow as it may be used to be consumed in a browser.

Project was build to sketch the hybrid HW version published here: https://github.com/stid/APPLE-1-ReplicaDue


6502.js is based on:
https://github.com/Torlus/6502.js


## TEST PROGRAM

0:A9 0 AA 20 EF FF E8 8A 4C 2 0 (RET)
0 (RET)
R (RET)

THE PROGRAM SHOULD THEN PRINT
OUT ON THE DISPLAY A CONTINUOUS STREAM
OF ASCII CHARACTERS. TO STOP THE PROGRAM
AND RETURN TO THE SYSTEM MONITOR,
HIT THE "RESET" BUTTON. TO RUN AGAIN,
TYPE : R (RET).
