# Apple 1 JS Emulator

The Apple 1 JS Emulator is a project written in TypeScript/JavaScript that emulates the Apple 1 computer. It is based on the Hybrid HW and Torlus' 6502.js project.

## Demo

You can try out the emulator in your browser with the [Interactive Demo](https://stid.me).

## Local Setup

To run the emulator locally on your computer, you'll need to install the required packages with the following command in the repo folder:

``` ssh
yarn install
```

Then, start the emulator in developer mode with:

``` ssh
yarn start
```

You can access the emulator in your browser at `localhost:1234`.

## Test Programs

Once you have the emulator running, you can try out some test programs. To reset the emulator, press `Tab` in your browser. Then, you can enter a list of commands to execute the program.

### Monitor Test

This program should print a continuous stream of ASCII characters:

```basic
0:A9 0 AA 20 EF FF E8 8A 4C 2 0
0
R
```

### Anniversary

This program should print an image of WOZ:

```basic
280
R
```

### Hello World

This program should continuously print "HELLO! FROM APPLE 1 JS":

```basic
E000
R
10 PRINT "HELLO! FROM APPLE 1 JS"
20 GOTO 10
RUN
```

Enjoy!
