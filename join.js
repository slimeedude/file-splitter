const fs = require('fs');
const crypto = require('crypto');

const inputDir = 'input/';
const indexFile = inputDir + 'index.json';

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
const outputFile = 'output/' + indexData.name;
const chunkCount = indexData.chunks;

async function checkMissingChunks() {
    let missingChunks = [];

    for (let i = 1; i <= chunkCount; i++) {
        const inputChunkPath = `${inputDir}chunk${i}`
        if (!fs.existsSync(inputChunkPath)) {
            missingChunks.push(i);
        }
    }

    return missingChunks;
}

async function checkMissingKeys() {
    let missingKeys = [];

    for (let i = 1; i <= chunkCount; i++) {
        if (!indexData.keys[i]) {
            missingKeys.push(i);
        }
    }

    return missingKeys;
}

function directoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Info: Directory created: ${dir}`);
    }
}

async function combineChunks() {
	directoryExists('output/');
    try {
        const missingChunks = await checkMissingChunks();
        const missingKeys = await checkMissingKeys();
        
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

        const outputStream = fs.createWriteStream(outputFile);

        for (let i = 1; i <= chunkCount; i++) {
        	console.log(`Info: Processing chunk: chunk${i}`); 
            const inputChunkPath = `${inputDir}chunk${i}`

            const algorithm = 'aes-256-cbc';
            const key = indexData.keys[i];

            const encryptedContent = await fs.promises.readFile(inputChunkPath);

            const iv = encryptedContent.slice(0, 16);
            const encryptedData = encryptedContent.slice(16);

            const decipher = crypto.createDecipheriv(algorithm, key, iv);

            let decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);

            outputStream.write(decrypted);
        }

        outputStream.end(() => {
            console.log(`Info: Successfully combined ${chunkCount} chunk(s) into ${outputFile}`);
        });

        outputStream.on('error', (error) => {
            console.error('Error: Write stream error:', error);
        });
    } catch (error) {
        console.error('Error: Failed to combine chunks:', error);
    }
}

combineChunks();
