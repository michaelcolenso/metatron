const fs = require('fs');
const path = require('path');
const ExifReader = require('exifreader');
const sharp = require('sharp');
const heicConvert = require('heic-convert');

// HEIC/HEIF source photos are decoded and published only when explicitly
// requested — publishing previously-unpublished personal photos to the
// public gallery is the repo owner's call, not this script's default.
const INCLUDE_HEIC = process.env.INCLUDE_HEIC === '1';

const STANDARD_EXTENSIONS = /\.(jpg|jpeg|png)$/i;
const HEIC_EXTENSIONS = /\.(heic|heif)$/i;

const THUMB_MAX = 480;
const MEDIUM_MAX = 1400;
const HEIC_FULL_QUALITY = 0.95;

function extractDateFromFilename(filename) {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})_/);
    if (!match) {
        return null;
    }

    const [year, month, day] = match[1].split('-').map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDateForTitle(dateStr) {
    if (!dateStr) {
        return null;
    }

    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function humaniseFilename(filename) {
    const name = path.parse(filename).name;
    const cleaned = name.replace(/[\s_-]+/g, ' ').trim();
    if (!cleaned) {
        return filename;
    }

    return cleaned
        .split(' ')
        .map(word => word ? word[0].toUpperCase() + word.slice(1) : '')
        .join(' ');
}

function normaliseExifDate(rawValue) {
    if (!rawValue) {
        return null;
    }

    const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
    if (value instanceof Date) {
        return Number.isNaN(value.getTime()) ? null : value.toISOString();
    }

    if (typeof value !== 'string') {
        return null;
    }

    const match = value.match(/(\d{4})(?::|-)?(\d{2})(?::|-)?(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
    if (!match) {
        return null;
    }

    const [, year, month, day, hour = '00', minute = '00', second = '00'] = match;
    const date = new Date(Date.UTC(
        Number(year),
        Number(month) - 1,
        Number(day),
        Number(hour),
        Number(minute),
        Number(second)
    ));

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function extractCaptureDate(tags) {
    const candidates = [
        tags.DateTimeOriginal,
        tags.CreateDate,
        tags.DateCreated,
        tags.DateTimeDigitized,
        tags.ModifyDate
    ];

    for (const tag of candidates) {
        const isoDate = normaliseExifDate(tag?.description ?? tag?.value);
        if (isoDate) {
            return isoDate;
        }
    }

    return null;
}

function extractExifData(buffer, warningLabel) {
    const defaults = {
        captureDate: null,
        camera: null,
        exposure: null,
        aperture: null,
        iso: null,
        focalLength: null,
        lens: null
    };

    try {
        const tags = ExifReader.load(buffer);

        const exifData = { ...defaults };
        exifData.captureDate = extractCaptureDate(tags);

        if (tags.Model?.description) {
            const make = tags.Make?.description || '';
            const model = tags.Model.description;
            exifData.camera = make ? `${make} ${model}`.trim() : model;
        }

        if (tags.ExposureTime?.description) {
            exifData.exposure = tags.ExposureTime.description;
        }

        if (tags.FNumber?.description) {
            const fNumber = tags.FNumber.description;
            exifData.aperture = fNumber.startsWith('f/') ? fNumber : `f/${fNumber}`;
        } else if (tags.ApertureValue?.description) {
            const apertureValue = tags.ApertureValue.description;
            exifData.aperture = apertureValue.startsWith('f/') ? apertureValue : `f/${apertureValue}`;
        }

        if (tags.ISOSpeedRatings?.description) {
            exifData.iso = `ISO ${tags.ISOSpeedRatings.description}`;
        } else if (tags.PhotographicSensitivity?.description) {
            exifData.iso = `ISO ${tags.PhotographicSensitivity.description}`;
        }

        if (tags.FocalLength?.description) {
            exifData.focalLength = tags.FocalLength.description;
        }

        if (tags.LensModel?.description) {
            exifData.lens = tags.LensModel.description;
        }

        return exifData;
    } catch (error) {
        console.warn(`Could not extract EXIF from ${warningLabel}: ${error.message}`);
        return defaults;
    }
}

// Resize `buffer` so its longest edge is at most `maxDimension`, honouring
// EXIF orientation, and return matching JPEG + WebP derivatives with their
// real output dimensions (needed for <img>/<source> width/height + srcset).
async function buildDerivative(buffer, maxDimension, jpegQuality, webpQuality) {
    const pipeline = sharp(buffer).rotate().resize({
        width: maxDimension,
        height: maxDimension,
        fit: 'inside',
        withoutEnlargement: true
    });

    const [jpeg, webp] = await Promise.all([
        pipeline.clone().jpeg({ quality: jpegQuality, mozjpeg: true }).toBuffer({ resolveWithObject: true }),
        pipeline.clone().webp({ quality: webpQuality }).toBuffer({ resolveWithObject: true })
    ]);

    return {
        jpeg: { buffer: jpeg.data, width: jpeg.info.width, height: jpeg.info.height },
        webp: { buffer: webp.data, width: webp.info.width, height: webp.info.height }
    };
}

async function processImage(filename, sourceDir, docsImagesDir, standardBasenames) {
    const filePath = path.join(sourceDir, filename);
    const isHeic = HEIC_EXTENSIONS.test(filename);
    const originalBuffer = fs.readFileSync(filePath);

    let fullBuffer = originalBuffer;
    let outputName = filename;

    if (isHeic) {
        outputName = `${path.parse(filename).name}.jpg`;
        if (standardBasenames.has(outputName)) {
            console.warn(`Skipping ${filename}: converted name ${outputName} collides with an existing source photo`);
            return null;
        }
        // Some ".heic"/".heif"-named files are actually already JPEG (a
        // common export/transfer mislabeling) -- detect that via the JPEG
        // magic bytes before attempting a HEIC decode, so they're handled
        // as what they really are instead of failing to decode.
        const looksLikeJpeg = originalBuffer.length >= 3
            && originalBuffer[0] === 0xFF && originalBuffer[1] === 0xD8 && originalBuffer[2] === 0xFF;
        if (!looksLikeJpeg) {
            try {
                fullBuffer = await heicConvert({ buffer: originalBuffer, format: 'JPEG', quality: HEIC_FULL_QUALITY });
            } catch (error) {
                console.warn(`Skipping ${filename}: HEIC decode failed (${error.message})`);
                return null;
            }
        }
    }

    // EXIF lives in the original container even when we convert HEIC -> JPEG
    // for display, since the decode step re-encodes pixels without tags.
    const { captureDate, ...exifData } = extractExifData(originalBuffer, filename);
    const filenameDate = extractDateFromFilename(filename);
    // Deliberately no filesystem-timestamp fallback: birthtime/mtime reflect
    // when the file was checked out or copied, not when the photo was
    // taken, and are meaningless (and inconsistent across environments)
    // in a git checkout. A photo with no filename-date and no EXIF date
    // stays undated rather than showing a fabricated one.
    const imageDate = filenameDate || captureDate || null;
    const title = formatDateForTitle(imageDate) || humaniseFilename(filename);

    let fullMeta;
    try {
        fullMeta = await sharp(fullBuffer).rotate().metadata();
    } catch (error) {
        console.warn(`Skipping ${filename}: could not read image (${error.message})`);
        return null;
    }

    let thumb;
    let medium;
    try {
        [thumb, medium] = await Promise.all([
            buildDerivative(fullBuffer, THUMB_MAX, 82, 76),
            buildDerivative(fullBuffer, MEDIUM_MAX, 85, 80)
        ]);
    } catch (error) {
        console.warn(`Skipping ${filename}: could not generate thumbnails (${error.message})`);
        return null;
    }

    const baseName = path.parse(outputName).name;
    const ext = path.parse(outputName).ext || '.jpg';
    const thumbJpegName = `thumb_${baseName}.jpg`;
    const thumbWebpName = `thumb_${baseName}.webp`;
    const mediumJpegName = `medium_${baseName}.jpg`;
    const mediumWebpName = `medium_${baseName}.webp`;

    // Full tier: byte-identical copy of the original for standard formats
    // (never re-encode the showcase image), or the high-quality HEIC->JPEG
    // conversion when there is no other way to serve it in a browser.
    fs.writeFileSync(path.join(docsImagesDir, outputName), fullBuffer);
    fs.writeFileSync(path.join(docsImagesDir, thumbJpegName), thumb.jpeg.buffer);
    fs.writeFileSync(path.join(docsImagesDir, thumbWebpName), thumb.webp.buffer);
    fs.writeFileSync(path.join(docsImagesDir, mediumJpegName), medium.jpeg.buffer);
    fs.writeFileSync(path.join(docsImagesDir, mediumWebpName), medium.webp.buffer);

    console.log(`Processed: ${filename}${isHeic ? ` -> ${outputName} (converted)` : ''}`);

    return {
        name: outputName,
        date: imageDate,
        title,
        ...exifData,
        full: { file: outputName, width: fullMeta.width, height: fullMeta.height },
        thumb: { jpg: thumbJpegName, webp: thumbWebpName, width: thumb.jpeg.width, height: thumb.jpeg.height },
        medium: { jpg: mediumJpegName, webp: mediumWebpName, width: medium.jpeg.width, height: medium.jpeg.height },
        expectedFiles: [outputName, thumbJpegName, thumbWebpName, mediumJpegName, mediumWebpName]
    };
}

function removeStaleFiles(docsImagesDir, expectedFiles) {
    const expected = new Set(expectedFiles);
    const existing = fs.readdirSync(docsImagesDir);
    let removed = 0;

    for (const file of existing) {
        if (!expected.has(file)) {
            fs.unlinkSync(path.join(docsImagesDir, file));
            removed += 1;
        }
    }

    if (removed > 0) {
        console.log(`Removed ${removed} stale file(s) from docs/images (no longer matching a source photo).`);
    }
}

async function generateImageList(sourceDir, docsImagesDir) {
    const allFiles = fs.readdirSync(sourceDir);
    const standardFiles = allFiles.filter(file => STANDARD_EXTENSIONS.test(file));
    const standardBasenames = new Set(standardFiles);

    const heicFiles = allFiles.filter(file => HEIC_EXTENSIONS.test(file));
    // Once a HEIC photo has been converted and published (its converted JPEG
    // already exists in docs/images/), keep republishing it on every future
    // run even without INCLUDE_HEIC=1 -- otherwise the opt-in would have to
    // be remembered forever, and an ordinary maintenance run would silently
    // un-publish it (removeStaleFiles would delete its derivatives and it
    // would vanish from the catalogue).
    const heicToProcess = heicFiles.filter(file => {
        if (INCLUDE_HEIC) return true;
        const convertedName = `${path.parse(file).name}.jpg`;
        return fs.existsSync(path.join(docsImagesDir, convertedName));
    });
    const newHeicSkipped = heicFiles.filter(file => !heicToProcess.includes(file));
    if (newHeicSkipped.length > 0) {
        console.log(`Skipping ${newHeicSkipped.length} HEIC/HEIF source photo(s) (set INCLUDE_HEIC=1 to convert and publish them): ${newHeicSkipped.join(', ')}`);
    }

    const filesToProcess = [...standardFiles, ...heicToProcess];

    const images = [];
    const expectedFiles = [];
    for (const filename of filesToProcess) {
        const result = await processImage(filename, sourceDir, docsImagesDir, standardBasenames);
        if (result) {
            const { expectedFiles: fileList, ...entry } = result;
            images.push(entry);
            expectedFiles.push(...fileList);
        }
    }

    removeStaleFiles(docsImagesDir, expectedFiles);

    images.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : -Infinity;
        const dateB = b.date ? new Date(b.date).getTime() : -Infinity;
        return dateB - dateA;
    });

    return `const photoList = ${JSON.stringify(images, null, 2)};`;
}

(async () => {
    try {
        const sourceDir = path.join(__dirname, '..', 'images');
        const outputFile = path.join(__dirname, '..', 'docs', 'images.js');
        const docsImagesDir = path.join(__dirname, '..', 'docs', 'images');

        if (!fs.existsSync(docsImagesDir)) {
            fs.mkdirSync(docsImagesDir, { recursive: true });
        }

        console.log('Generating image catalogue (EXIF metadata + thumb/medium/full derivatives)...');
        const jsContent = await generateImageList(sourceDir, docsImagesDir);

        fs.writeFileSync(outputFile, jsContent);
        console.log('Successfully updated docs/images.js');
    } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
    }
})();
