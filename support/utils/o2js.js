const fs = require('fs');

const file = process.argv[2];
console.log(`CONVERTING: ${file}`);

const buffer = [...fs.readFileSync(file)];

const convertedBuffer = buffer.map(byte => {
    return `0x${byte
        .toString(16)
        .padStart(2, '0')
        .toUpperCase()}`;
});

const spliceBuffer = [];
while (convertedBuffer.length) {
    spliceBuffer.push(convertedBuffer.splice(0, 8).join(', '));
}

const result = `
export default [
    ${spliceBuffer.join(',\n    ')}
];
`;

console.log(result);
