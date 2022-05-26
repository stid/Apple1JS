
const fs = require('fs');

const { log } = console;


const file = process.argv[2];

log(`Converting: ${ file }`);


const bytes = [ ... fs.readFileSync(file) ];

const buffer = bytes.map(byteToHex);

const slices = [];

while(buffer.length){

    const slice = buffer
        .splice(0,8)
        .join(' , ');

    slices.push(slice);
}


const combined = slices
    .map((line) => `    ${ line }`)
    .join(' ,\n');

const result = `\nexport default [\n${ combined }\n];\n`;

log(result);


function byteToHex(byte){

    const hex = byte
        .toString(16)
        .padStart(2,'0')
        .toUpperCase();

    return `0x${ hex }`;
}