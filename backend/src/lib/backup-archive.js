const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const tar = require('tar-stream');
const {pipeline} = require('stream/promises');

async function extractArchive(archivePath, destPath, files, isSafePath) {
    const extracted = new Set();
    const directories = files.filter(name => name.endsWith('/'));
    const extract = tar.extract();
    const root = path.resolve(destPath);
    let unsafeEntry;
    extract.on('entry', (header, stream, next) => {
        const selected = files.includes(header.name) ||
            directories.some(dir => header.name.startsWith(dir));
        if (!selected || unsafeEntry) {
            stream.once('end', next);
            stream.resume();
            return;
        }
        const target = path.resolve(root, header.name);
        const relative = path.relative(root, target);
        if (!relative || relative.startsWith('..' + path.sep) || relative === '..' ||
            path.isAbsolute(header.name) || header.name.includes('\\') || !isSafePath(header.name) ||
            !['file', 'directory'].includes(header.type)) {
            unsafeEntry = new Error('Unsafe archive entry');
            stream.once('end', next);
            stream.resume();
            return;
        }
        (async () => {
            if (header.type === 'directory') {
                await fs.promises.mkdir(target, {recursive: true});
                stream.resume();
            } else {
                // Do not advance the extractor until the destination has finished writing.
                await fs.promises.mkdir(path.dirname(target), {recursive: true});
                await pipeline(stream, fs.createWriteStream(target));
            }
            extracted.add(header.name);
            next();
        })().catch(error => extract.destroy(error));
    });
    await pipeline(fs.createReadStream(archivePath), zlib.createGunzip(), extract);
    if (unsafeEntry) throw unsafeEntry;
    if (!extracted.size) throw new Error('No files were extracted from the Archive');
    // A directory selection may legitimately be empty; its manifest is required.
    const missing = files.filter(name => !name.endsWith('/') && !extracted.has(name));
    if (missing.length) throw new Error(`Missing files in the archive: ${missing.toString()}`);
}

async function decryptArchive(encryptedPath, decryptedPath, password) {
    let file;
    try {
        file = await fs.promises.open(encryptedPath, 'r');
        const header = Buffer.alloc(16);
        const {bytesRead} = await file.read(header, 0, 16, 0);
        if (bytesRead !== 16 || header.subarray(0, 8).toString('ascii') !== 'Salted__') {
            throw new Error('Missing or invalid encrypted backup header');
        }
        const secret = crypto.pbkdf2Sync(password, header.subarray(8), 10000, 48, 'sha256');
        const decipher = crypto.createDecipheriv('aes-256-cbc', secret.subarray(0, 32), secret.subarray(32));
        await pipeline(fs.createReadStream(encryptedPath, {start: 16}), decipher, fs.createWriteStream(decryptedPath));
    } catch (error) {
        throw {fn: 'BadParameters', message: 'Decryption failed. Wrong password, unreadable or corrupted file'};
    } finally {
        if (file) await file.close();
    }
}

module.exports = {extractArchive, decryptArchive};
