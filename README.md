
[Preview]: Resources/Preview.png

[Interactive Demo]: https://stid.me
[Hybrid]: https://github.com/stid/APPLE-1-ReplicaDue
[6502.js]: https://github.com/Torlus/6502.js

[Localhost]: http://localhost:1234

# Apple 1 JS Emulator

*Written in `Typescript` / `Javascript`*

An emulator based on the **[Hybrid HW][Hybrid]**,
as well as on **Torlus'** [`6502.js`][6502.js] project.

![Preview]

*I use this project as some sort of `'on the edge'`*
*sandbox / playground. It gives me an excuse to play*
*with the latest technologies, as I improve the emulator.*

---

**⸢ [Interactive Demo] ⸥**

---

## Terminal Version

The emulator runs in **Node**, using **Yarn**, <br>
you can easily install the required version.

### Install

1. Navigate to the *repo* folder

2. Install **Packages** with:

    ```sh
    yarn install
    ```

3. Start in ***developer mode***:

    ```sh
    yarn start
    ```

4. Use any **Browser** to navigate to:

    [```localhost:1234```][Localhost]

## Test Programs

To reset press:
 `Tab` in the **Browser**

*Entering code is done line by line,*
*basically entering a list of command.*

### Monitor Test

This program should print a continuous <br>
stream of `ASCII` characters once entered.

```basic
0:A9 0 AA 20 EF FF E8 8A 4C 2 0
0
R
```


### Anniversary

This program should print an image of `WOZ`.

```basic
280
R
```

### Hello World

This program should continuously
print the given a **Hello World** msg.

```basic
E000
R
10 PRINT "HELLO! FROM APPLE 1 JS"
20 GOTO 10
RUN
```
