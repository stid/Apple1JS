
[Preview]: Resources/Preview.png

[Interactive Demo]: https://stid.github.io/Apple1JS/
[Hybrid]: https://github.com/stid/APPLE-1-ReplicaDue
[6502.js]: https://github.com/Torlus/6502.js

[Localhost]: http://127.0.0.1:8080/

# Apple 1 Emulator
*Written in `Typescript` / `Javascript`*

An emulator based on the **[Hybrid HW][Hybrid]**, <br>
as well as on **Torlus'** [`6502.js`][6502.js] project.

![Preview]

*I use this project as some sort of `'on the edge'`* <br>
*sandbox / playground. It gives me an excuse to play* <br>
*with the latest technologies, as I improve the emulator.*


---

**⸢ [Interactive Demo] ⸥**

---

## Terminal Version

The emulator runs in **Node**, using **Yarn**, <br>
you can easily install the required version.

#### Install

1. Navigate to the *repo* folder

2. Install **Packages** with:

    ```sh
    yarn install
    ```

3. Start in ***developer mode***:

    ```sh
    yarn raw_start
    ```

#### Building Node Manually

1. Navigate to the *repo* folder

2. Build **Node** with:

    ```sh
    yarn build-node
    ```

3. Start **Node** with:

    ```sh
    yarn start
    ```

---

## Browser Version

A local **Webserver** is used to host a **Browser** <br>
accessible interface utilizing **Web Workers** as <br>
well as **React** components for the interface.

#### Installation

1. Install the **Packages** with:

    ```sh
    yarn install
    ```

2. Build the **Emulator** with:

    ```sh
    yarn build
    ```

#### Usage

1. Start the local **Webserver** with:

    ```sh
    yarn server-start
    ```

2. Use any **Browser** to navigate to:

    [```localhost:8080```][Localhost]

---

## Test Programs

To reset press: <br>
 `Ctrl-R` in the **Terminal** <br>
 `Tab` in the **Browser**

*Entering code is done line by line,* <br>
*basically entering a list of command.*

<br>

#### Monitor Test

This program should print a continuous <br>
stream of `ASCII` characters once entered.

```basic
0:A9 0 AA 20 EF FF E8 8A 4C 2 0
0
R
```

<br>

#### Anniversary

This program should print an image of `WOZ`.

```basic
280
R
```

<br>

#### Hello World

This program should continuously <br>
print the given a **Hello World** msg.

```basic
E000
R
10 PRINT "HELLO! FROM APPLE 1 JS"
20 GOTO 10
RUN
```
