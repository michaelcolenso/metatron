const fs = require('fs');
const path = require('path');
const ExifReader = require('exifreader');

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

function extractExifData(filePath) {
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
        const fileBuffer = fs.readFileSync(filePath);
        const tags = ExifReader.load(fileBuffer);

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
        console.warn(`Could not extract EXIF from ${path.basename(filePath)}: ${error.message}`);
        return defaults;
    }
}

function generateImageList(sourceDir) {
    const files = fs.readdirSync(sourceDir)
        .filter(file => /\.(jpg|jpeg|png)$/i.test(file));

    const images = files.map(filename => {
        const filePath = path.join(sourceDir, filename);
        const { captureDate, ...exifData } = extractExifData(filePath);
        const filenameDate = extractDateFromFilename(filename);
        let imageDate = filenameDate || captureDate;
        if (!imageDate) {
            const stats = fs.statSync(filePath);
            imageDate = stats.birthtime ? stats.birthtime.toISOString() : null;
        }
        const title = formatDateForTitle(imageDate) || humaniseFilename(filename);

        return {
            name: filename,
            date: imageDate,
            title,
            ...exifData,
            hasWebP: false,
            sizes: {
                thumb: `thumb_${filename}`,
                medium: `medium_${filename}`,
                full: filename
            }
        };
    });

    images.sort((a, b) => {
        const dateA = a.date ? new Date(a.date).getTime() : -Infinity;
        const dateB = b.date ? new Date(b.date).getTime() : -Infinity;
        return dateB - dateA;
    });

    return `const photoList = ${JSON.stringify(images, null, 2)};`;
}

try {
    const sourceDir = path.join(__dirname, '..', 'images');
    const outputFile = path.join(__dirname, '..', 'docs', 'images.js');

    console.log('Generating image list with EXIF metadata...');
    const jsContent = generateImageList(sourceDir);

    fs.writeFileSync(outputFile, jsContent);
    console.log('Successfully updated images.js with EXIF data');

    const docsImagesDir = path.join(__dirname, '..', 'docs', 'images');
    if (!fs.existsSync(docsImagesDir)) {
        fs.mkdirSync(docsImagesDir, { recursive: true });
    }

    const files = fs.readdirSync(sourceDir)
        .filter(file => /\.(jpg|jpeg|png)$/i.test(file));

    files.forEach(file => {
        const sourcePath = path.join(sourceDir, file);
        const destPath = path.join(docsImagesDir, file);
        fs.copyFileSync(sourcePath, destPath);
        console.log(`Copied: ${file}`);
    });

    console.log('All images copied to docs/images');
} catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
}
