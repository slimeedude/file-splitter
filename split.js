const fs = require('fs');
const zlib = require('zlib');
const crypto = require('crypto');

const config = {
    inputDir: 'input/',
    outputDir: 'output/',
    chunkSize: 24 * 1024 * 1024,
    secretKeyLength: 32,
    compression: false,
}

if (config.chunkSize < 1024 * 1024) {
	console.warn('Warning: config.chunkSize is smaller than 1MB, which can cause problems. Aborting.');
	return;
} else if (config.chunkSize % 1 != 0) {
	console.error('Error: config.chunkSize must be an integer.');
	return;
}

function directoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Info: Directory created: ${dir}`);
    }
}

function generateSecretKey(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let randomString = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) { randomString += characters[bytes[i] % characters.length]; }
    return randomString;
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
    const secret_key = generateSecretKey(config.secretKeyLength);
    const encrypted_data = encryptData(data, secret_key);
    fs.writeFileSync(`${config.outputDir}chunk${counter}`, encrypted_data);
    chunk_info.keys[counter] = secret_key;
}

function checkDirectory(dir, callback) {
    directoryExists(config.inputDir);
    directoryExists(config.outputDir);
    fs.readdir(dir, (err, files) => {
        if (err) {
            console.error(`Error: Failed to read directory: ${dir}`, err);
            callback(err);
            return;
        }
        callback(null, files);
    });
}

function splitFile(inputFilePath) {
    console.log('Info: Splitting file:', inputFilePath.split('/').pop());

    const size = fs.statSync(inputFilePath).size;
    const chunkCount = Math.ceil(size / config.chunkSize);

    let counter = 1;
    let chunkInfo = {
        chunks: chunkCount, name: inputFilePath.split('/').pop(), keys: {}, compressed: false,
    };

    for (let start = 0; start < size; start += config.chunkSize) {
        console.log(`Info: Processing chunk ${counter}`);
        processChunk(inputFilePath, start, Math.min(start + config.chunkSize, size), counter, chunkInfo);
        counter++;
    }

    fs.writeFileSync(`${config.outputDir}index.json`, JSON.stringify(chunkInfo));
    console.log(`Info: Success. Total chunks created: ${chunkCount}`);
}

function splitFileCompressed(inputFilePath) {
    console.log('Info: Compressing and splitting file:', inputFilePath.split('/').pop());

    const deflate = zlib.createDeflate();
    const input = fs.createReadStream(inputFilePath);

    input.pipe(deflate);

    let buffer = Buffer.alloc(0);
    let counter = 1;
    let chunkInfo = {
        chunks: 0, name: inputFilePath.split('/').pop(), keys: {}, compressed: true,
    };

    deflate.on('data', (data) => {
    	buffer = Buffer.concat([buffer, data]);

        if (buffer.length >= config.chunkSize) {
        	deflate.pause();
            const key = generateSecretKey(config.secretKeyLength);
            fs.writeFileSync(`${config.outputDir}chunk${counter}`, encryptData(buffer, key));
            chunkInfo.keys[counter] = key;
            console.log(`Info: Processed chunk ${counter}`);
            counter++;
            chunkInfo.chunks++
            buffer = Buffer.alloc(0);
            deflate.resume();
        }
    });

    deflate.on('end', () => {
    	if (buffer.length > 0) {
            const key = generateSecretKey(config.secretKeyLength);
    	    fs.writeFileSync(`${config.outputDir}chunk${counter}`, encryptData(buffer, key));
            chunkInfo.keys[counter] = key;
            chunkInfo.chunks++
            console.log(`Info: Processed chunk ${counter}`);
    	}

        fs.writeFileSync(`${config.outputDir}index.json`, JSON.stringify(chunkInfo));
        console.log(`Success. Total chunks created: ${counter}`);
    });
}

checkDirectory(config.inputDir, (err, files) => {
    if (err) {
        console.error('Error: Failed to read directory: ', err);
        return;
    }

    if (files.length === 0) {
        console.error('Error: No files found in the input folder.');
        return;
    }

    if (files.length > 1) {
        console.warn('Warning: Cannot proceed with multiple input files; please input a single file.');
        return;
    }

    let outputFolder = fs.readdirSync(config.outputDir);
    if (outputFolder.length !== 0) {
        console.warn('Warning: Output folder must be empty.');
        return;
    }

    // All conditions passed, start making chunks
    if(config.compression) {
    	splitFileCompressed(config.inputDir + files[0]);
    } else {
        splitFile(config.inputDir + files[0]);
    }
});
