import fs from 'fs';

export const readBinary = (filePath: string): Array<number> => {
    return [...fs.readFileSync(filePath)];
};
