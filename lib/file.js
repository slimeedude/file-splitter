const fs = require('fs');

function readFileSection(file, start_byte, end_byte) {
    const buffer_size = end_byte - start_byte;
    const buffer = Buffer.alloc(buffer_size);
    const fd = fs.openSync(file, 'r');
    fs.readSync(fd, buffer, 0, buffer_size, start_byte);
    fs.closeSync(fd);
    return buffer;
}

module.exports = {
    readFileSection
};
