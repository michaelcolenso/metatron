const fs = require('fs');
const path = require('path');

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

// Function to generate the image list
function generateImageList(sourceDir) {
    // Read all files in the images directory
    const files = fs.readdirSync(sourceDir)
        .filter(file => /\.(jpg|jpeg|png)$/i.test(file));

    // Create image objects with metadata
    const images = files.map(filename => {
        const date = extractDate(filename);
        return {
            name: filename,
            date: date,
            title: date ? formatDate(date) : filename
        };
    });

    // Sort by date (newest first)
    images.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Generate JavaScript code
    const jsContent = `const photoList = ${JSON.stringify(images, null, 4)};`;

    return jsContent;
}

// Main execution
try {
    const sourceDir = path.join(__dirname, '..', 'images');
    const outputFile = path.join(__dirname, '..', 'docs', 'images.js');
    
    console.log('Generating image list...');
    const jsContent = generateImageList(sourceDir);
    
    fs.writeFileSync(outputFile, jsContent);
    console.log('Successfully updated images.js');
    
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
EOL 2>&1
