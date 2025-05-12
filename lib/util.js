const fs = require('fs');
const zlib = require('zlib');
const stream = require('stream');

const fileLib = require('./file.js');
const cryptLib = require('./crypt.js');

function directoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Info: Directory created: ${dir}`);
    }
}

function checkDirectory(input, output, callback,) {
    directoryExists(input);
    directoryExists(output);
    fs.readdir(input, (err, files) => {
        if (err) {
            console.error(`Error: Failed to read directory: ${input}`, err);
            callback(err);
            return;
        }
        callback(null, files);
    });
}

function encryptChunk(inputFile, key, start, end, outputPath) {
    const data = fileLib.readFileSection(inputFile, start, end);
    const encrypted_data = cryptLib.encryptData(data, key);
    fs.writeFileSync(outputPath, encrypted_data);
}

function splitFile(inputFilePath, outputFolder, chunkSize, keyLength, compress) {
    const fileSize = fs.statSync(inputFilePath).size;

    let chunkInfo = {
        chunks: 1, name: inputFilePath.split('/').pop(), keys: {}, compressed: compress,
    };

    function write() {
        fs.writeFileSync(`${outputFolder}index.json`, JSON.stringify(chunkInfo));
        console.log(`Info: Success. Total chunks created: ${chunkInfo.chunks}`);
    }

    if (compress) {
        const deflate = zlib.createDeflate();
        const input = fs.createReadStream(inputFilePath);

        input.pipe(deflate);
        let buffer = Buffer.alloc(0);

        deflate.on('data', (data) => {
            buffer = Buffer.concat([buffer, data]);

            if (buffer.length >= chunkSize) {
                deflate.pause();
                const key = cryptLib.generateSecretKey(keyLength);
                fs.writeFileSync(`${outputFolder}chunk${chunkInfo.chunks}`, cryptLib.encryptData(buffer, key));
                chunkInfo.keys[chunkInfo.chunks] = key;
                console.log(`Info: Processed chunk ${chunkInfo.chunks}`);
                chunkInfo.chunks++;
                buffer = Buffer.alloc(0);
                deflate.resume();
            }
        });

        deflate.on('end', () => {
            if (buffer.length > 0) {
                const key = cryptLib.generateSecretKey(keyLength);
                fs.writeFileSync(`${outputFolder}chunk${chunkInfo.chunks}`, cryptLib.encryptData(buffer, key));
                chunkInfo.keys[chunkInfo.chunks] = key;
                console.log(`Info: Processed chunk ${chunkInfo.chunks}`);
            }

            write();
        });
    } else {
        for (let startByte = 0; startByte < fileSize; startByte += chunkSize) {
            console.log(`Info: Processing chunk ${chunkInfo.chunks}`);
            const secretKey = cryptLib.generateSecretKey(keyLength);
            encryptChunk(inputFilePath, secretKey, startByte, Math.min(startByte + chunkSize, fileSize), `${outputFolder}chunk${chunkInfo.chunks}`);
            chunkInfo.keys[chunkInfo.chunks] = secretKey;
            chunkInfo.chunks++;
        }

        chunkInfo.chunks--;
        write();
    }
}

function checkMissingChunks(input, chunkCount) {
    let missingChunks = [];

    for (let i = 1; i <= chunkCount; i++) {
        const inputChunkPath = `${input}chunk${i}`
        if (!fs.existsSync(inputChunkPath)) {
            missingChunks.push(i);
        }
    }

    return missingChunks;
}

function checkMissingKeys(keys, chunkCount) {
    let missingKeys = [];

    for (let i = 1; i <= chunkCount; i++) {
        if (!keys[i]) {
            missingKeys.push(i);
        }
    }

    return missingKeys;
}

async function combineChunks(input, outputFile, indexData) {
    try {
        const outputStream = fs.createWriteStream(outputFile);

        if (indexData.compressed) {
            const inflate = zlib.createInflate();

            async function* getDecryptedChunks() {
                for (let i = 1; i <= indexData.chunks; i++) {
                    console.log(`Info: Processing chunk: chunk${i}`);
                    const encrypted = await fs.promises.readFile(`${input}chunk${i}`);
                    yield cryptLib.decryptData(encrypted, indexData.keys[i]);
                }
            }

            const inputStream = stream.Readable.from(getDecryptedChunks());

            inputStream.pipe(inflate).pipe(outputStream);

            await new Promise((resolve, reject) => {
                outputStream.on('finish', resolve);
            });

            console.log(`Info: Successfully combined and decompressed ${indexData.chunks} chunk(s) into ${outputFile}`);
        } else {
            for (let i = 1; i <= indexData.chunks; i++) {
                console.log(`Info: Processing chunk: chunk${i}`);
                const encrypted = await fs.promises.readFile(`${input}chunk${i}`);
                const decrypted = cryptLib.decryptData(encrypted, indexData.keys[i]);
                outputStream.write(decrypted);
            }

            outputStream.end(() => {
                console.log(`Info: Successfully combined ${indexData.chunks} chunk(s) into ${outputFile}`);
            });
        }
    } catch (error) {
        console.error('Error: Failed to combine chunks:', error);
    }
}

module.exports = {
    directoryExists,
    checkDirectory,
    encryptChunk,
    splitFile,
    checkMissingChunks,
    checkMissingKeys,
    combineChunks
}