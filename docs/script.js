const photoGrid = document.getElementById("photo-grid");

// List of images we know exist
const images = [
    'gobi-sees-you.jpg',
    '2012-06-05_22-05-18.jpg'
];

// Create image elements
images.forEach(imageName => {
    const img = document.createElement("img");
    img.src = `images/${imageName}`;
    img.alt = imageName.replace(/\.[^/.]+$/, ""); // Remove file extension for alt text
    img.loading = "lazy";
    photoGrid.appendChild(img);
});