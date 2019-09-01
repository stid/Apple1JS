# Apple 1 Javascript Emulator

NodeJS/Javascript Apple 1 Emulator, include initial abstraction of 6820 and other core components.

Project was build to sketch the hybrid HW version published here: https://github.com/stid/APPLE-1-ReplicaDue

6502.js is based on:
https://github.com/Torlus/6502.js

I use this project as some sort of on the edge sandbox/playground. It give me an excuse to play with the latest technologies as I improve the emulator itself.

## NODEJS

You can execute the emulator in via nodejs, assuming proper version of node is installed in your system.

Under this repository root:

1. Install required packages via: `yarn install`
2. Start in dev mode via: `yarn raw_start`

## BROWSER

You can build & execute a web version visible inside your browser. This use a simple server behind, Web Workers to execute the core and a simple React component to render the monitor.

Under this repository root:

1. Install required packages via: `yarn install`
2. Build via `yarn build`
3. Start the simple web server via: `yarn server-start`
4. Follow the info and load the related app on your browser (usually http://127.0.0.1:8080)

## WOZ MONITOR TEST PROGRAM

``` text
0:A9 0 AA 20 EF FF E8 8A 4C 2 0 (RET)
0 (RET)
R (RET)

THE PROGRAM SHOULD THEN PRINT
OUT ON THE DISPLAY A CONTINUOUS STREAM
OF ASCII CHARACTERS. TO STOP THE PROGRAM
AND RETURN TO THE SYSTEM MONITOR,
HIT THE "RESET" BUTTON. TO RUN AGAIN,
TYPE : R (RET).
```

## APPLE 1 ANNIVERSARY

``` text
280 (RET)
R (RET)
```

## BASIC

``` text
E000 (RET)
R (RET)
10 PRINT "HELLO! FROM APPLE 1 JS" (RET)
20 GOTO 10 (RET)
RUN (RET)
```
