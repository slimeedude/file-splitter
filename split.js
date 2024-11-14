const fs = require('fs');
const crypto = require('crypto');

const config = {
    inputDir: 'input/',
    outputDir: 'output/',
    chunkSize: 24 * 1024 * 1024,
}

function directoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Directory created: ${dir}`);
    }
}

function generateSecretKey(length) {
    return crypto.randomBytes(length).toString('hex').slice(0, length);
}

function readFileSection(file, start_byte, end_byte) {
    const buffer_size = end_byte - start_byte;
    const buffer = Buffer.alloc(buffer_size);
    const fd = fs.openSync(file, 'r');
    fs.readSync(fd, buffer, 0, buffer_size, start_byte);
    fs.closeSync(fd);
    return buffer;
}

function encryptData(data, key) {
    const content_iv = crypto.randomBytes(16);
    const data_cipher = crypto.createCipheriv('aes-256-cbc', key, content_iv);
    const encrypted_data = Buffer.concat([content_iv, data_cipher.update(data), data_cipher.final()]);
    return encrypted_data;
};

function processChunk(file, start, end, counter, chunk_info) {
    const data = readFileSection(file, start, end);
    const secret_key = generateSecretKey(32);
    const encrypted_data = encryptData(data, secret_key);
    fs.writeFileSync(`${config.outputDir}chunk${counter}`, encrypted_data);
    chunk_info.keys[counter] = secret_key;
}

function checkDirectory(dir, callback) {
    fs.readdir(dir, (err, files) => {
        if (err) {
            console.error(`Error reading directory: ${dir}`, err);
            callback(err);
            return;
        }
        callback(null, files);
    });
}

directoryExists(config.inputDir);
directoryExists(config.outputDir);

checkDirectory(config.inputDir, (err, files) => {
    if (err) {
        console.error('Error reading directory: ', err);
        return;
    }

    if (files.length === 0) {
        console.error('No files found in the input folder.');
        return;
    }

    if (files.length > 1) {
        console.warn('Cannot proceed with multiple input files; please input a single file.');
        return;
    }

    let outputFolder = fs.readdirSync(config.outputDir);
    if (outputFolder.length !== 0) {
        console.warn('Output folder must be empty.');
        return;
    }

    console.log('Processing file: ', files[0]);

    const inputFile = config.inputDir + files[0];

    const size = fs.statSync(inputFile).size;
    const chunkCount = Math.ceil(size / config.chunkSize);

    let counter = 1;
    let chunkInfo = {
        chunks: chunkCount, name: files[0], keys: {},
    };

    for (let start = 0; start < size; start += config.chunkSize) {
        console.log(`Processing chunk ${counter}`);
        processChunk(inputFile, start, Math.min(start + config.chunkSize, size), counter, chunkInfo);
        counter++;
    }

    fs.writeFileSync(`${config.outputDir}index.json`, JSON.stringify(chunkInfo))
    console.log(`Total chunks created: ${chunkCount}`);
});
