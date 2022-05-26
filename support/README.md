
# ASM Source Code

<br>

## Compile

*Build the files with:*

```sh
dasm woz_monitor_dasm.asm   \
    -orom.o                 \
    -lrom.lst               \
    -srom.sym
```

<br>

## Convert

*Generate Javascript modules* <br>
*from the object files with:*

```sh
node o2kj.js orom.o
```
