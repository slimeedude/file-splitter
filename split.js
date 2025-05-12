const fs = require('fs');

const cryptLib = require('./lib/crypt.js');
const utilLib = require('./lib/util.js');

const config = JSON.parse(fs.readFileSync('./config.json'));

if (config.chunk_size < config.safe_size) {
    console.warn('Warning: chunk_size is smaller than 1MB, which can cause problems. Aborting.');
    return;
} else if (config.chunk_size % 1 != 0) {
    console.error('Error: chunk_size must be an integer.');
    return;
}

utilLib.checkDirectory(config.input_dir, config.output_dir, (err, files) => {
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

    let outputFolder = fs.readdirSync(config.output_dir);
    if (outputFolder.length !== 0) {
        console.warn('Warning: Output folder must be empty.');
        return;
    }

    const fileName = files[0];

    // All conditions passed, start making chunks
    if(config.compression) {
        console.log(`Info: Compressing and splitting file: ${fileName}`);
        utilLib.splitFile(config.input_dir + files[0], config.output_dir, config.chunk_size, config.secret_key_length, config.compression);
    } else {
        console.log(`Info: Splitting file: ${fileName}`), 
        utilLib.splitFile(config.input_dir + files[0], config.output_dir, config.chunk_size, config.secret_key_length, config.compression);
    }
});
