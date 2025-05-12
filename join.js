const fs = require('fs');

const cryptLib = require('./lib/crypt.js');
const utilLib = require('./lib/util.js');

const config = JSON.parse(fs.readFileSync('./config.json'));

const indexFile = config.input_dir + 'index.json';

if (!fs.existsSync(indexFile)) {
    console.error('Error: Missing index.json file in the input folder.');
    return;
}

let indexData;
try {
    console.log('Info: Found index.json file.');
    indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));
} catch (error) {
    console.error('Error: Failed to read index file:', error.message)
    return;
}

if (!indexData.name) {
    console.warn('Warning: File name missing from index.json.');
    indexData.name = 'unknown_name';
}
if (!indexData.chunks) {
    console.error('Error: Not a valid index.json.');
    return;
}
const outputFile = config.output_dir + indexData.name;

utilLib.directoryExists(config.output_dir);

const missingChunks = utilLib.checkMissingChunks(config.input_dir, indexData.chunks);
const missingKeys = utilLib.checkMissingKeys(indexData.keys, indexData.chunks);

if (fs.existsSync(outputFile)) {
    console.warn('Warning: There is already a file with the same name in the output folder; cannot overwrite.');
    return;
}

if (missingChunks.length > 0) {
    console.error(`Error: Missing chunks: ${missingChunks.join(', ')}`);
    return;
}

if (missingKeys.length > 0) {
    console.error(`Error: Missing keys: ${missingKeys.join(', ')}`);
    return;
}

utilLib.combineChunks(config.input_dir, outputFile, indexData);
