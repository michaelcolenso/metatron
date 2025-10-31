const fs = require('fs');
const path = require('path');
const ExifReader = require('exifreader');

// Function to extract date from filename (format: YYYY-MM-DD_HH-mm-ss.jpg)
function extractDate(filename) {
    const match = filename.match(/(\d{4}-\d{2}-\d{2})_/);
    return match ? match[1] : null;
}

// Function to format the date for display
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Function to extract EXIF data from an image file
function extractExifData(filePath) {
    try {
        const fileBuffer = fs.readFileSync(filePath);
        const tags = ExifReader.load(fileBuffer);

        // Extract relevant EXIF data
        const exifData = {
            camera: null,
            exposure: null,
            aperture: null,
            iso: null,
            focalLength: null,
            lens: null
        };

        // Camera model
        if (tags.Model && tags.Model.description) {
            const make = tags.Make?.description || '';
            const model = tags.Model.description;
            exifData.camera = make ? `${make} ${model}` : model;
        }

        // Exposure time (shutter speed)
        if (tags.ExposureTime && tags.ExposureTime.description) {
            exifData.exposure = tags.ExposureTime.description;
        }

        // Aperture (f-stop)
        if (tags.FNumber && tags.FNumber.description) {
            const fNumber = tags.FNumber.description;
            exifData.aperture = fNumber.startsWith('f/') ? fNumber : `f/${fNumber}`;
        } else if (tags.ApertureValue && tags.ApertureValue.description) {
            const apertureValue = tags.ApertureValue.description;
            exifData.aperture = apertureValue.startsWith('f/') ? apertureValue : `f/${apertureValue}`;
        }

        // ISO
        if (tags.ISOSpeedRatings && tags.ISOSpeedRatings.description) {
            exifData.iso = `ISO ${tags.ISOSpeedRatings.description}`;
        } else if (tags.PhotographicSensitivity && tags.PhotographicSensitivity.description) {
            exifData.iso = `ISO ${tags.PhotographicSensitivity.description}`;
        }

        // Focal length
        if (tags.FocalLength && tags.FocalLength.description) {
            exifData.focalLength = tags.FocalLength.description;
        }

        // Lens
        if (tags.LensModel && tags.LensModel.description) {
            exifData.lens = tags.LensModel.description;
        }

        return exifData;
    } catch (error) {
        console.warn(`Could not extract EXIF from ${path.basename(filePath)}: ${error.message}`);
        return {
            camera: null,
            exposure: null,
            aperture: null,
            iso: null,
            focalLength: null,
            lens: null
        };
    }
}

// Function to generate the image list
function generateImageList(sourceDir) {
    // Read all files in the images directory
    const files = fs.readdirSync(sourceDir)
        .filter(file => /\.(jpg|jpeg|png)$/i.test(file));

    // Create image objects with metadata
    const images = files.map(filename => {
        const filePath = path.join(sourceDir, filename);
        const date = extractDate(filename);
        const exifData = extractExifData(filePath);

        return {
            name: filename,
            date: date,
            title: date ? formatDate(date) : filename,
            ...exifData,
            hasWebP: false,
            sizes: {
                thumb: `thumb_${filename}`,
                medium: `medium_${filename}`,
                full: filename
            }
        };
    });

    // Sort by date (newest first)
    images.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Generate JavaScript code
    const jsContent = `const photoList = ${JSON.stringify(images, null, 2)};`;

    return jsContent;
}

// Main execution
try {
    const sourceDir = path.join(__dirname, '..', 'images');
    const outputFile = path.join(__dirname, '..', 'docs', 'images.js');

    console.log('Generating image list with EXIF metadata...');
    const jsContent = generateImageList(sourceDir);

    fs.writeFileSync(outputFile, jsContent);
    console.log('Successfully updated images.js with EXIF data');

    // Also copy new images to docs/images
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
