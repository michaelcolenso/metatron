const photoGrid = document.getElementById("photo-grid");

// List of images we know exist
const images = [
    'gobi-sees-you.jpg',
    '2012-06-05_22-05-18.jpg',
    '2011-05-20_16-25-28.jpg'
];

// Create image elements
images.forEach(imageName => {
    const img = document.createElement("img");
    img.src = `images/${imageName}`;
    img.alt = imageName.replace(/\.[^/.]+$/, "").replace(/-/g, " "); // Remove file extension and hyphens for alt text
    img.loading = "lazy";
    photoGrid.appendChild(img);
});