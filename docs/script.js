// DOM Elements
const photoGrid = document.getElementById("photo-grid");
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const modalCaption = document.getElementById("modal-caption");
const closeBtn = document.querySelector(".close");

// Set current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Format date for display
function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Create photo card element
function createPhotoCard(photo) {
  const card = document.createElement("div");
  card.className = "photo-card";

  const img = document.createElement("img");
  img.src = `images/${photo.name}`;
  img.alt = photo.title;
  img.loading = "lazy";

  const info = document.createElement("div");
  info.className = "photo-info";
  info.innerHTML = `
        <div class="photo-date">${photo.title}</div>
    `;

  card.appendChild(img);
  card.appendChild(info);

  // Add click handler for modal
  card.addEventListener("click", () => {
    modalImg.src = img.src;

    // Build caption with EXIF data
    let captionHTML = `<div class="modal-title">${photo.title}</div>`;

    // Add date if available
    if (photo.date) {
      captionHTML += `<div class="modal-date">${formatDate(photo.date)}</div>`;
    }

    // Add EXIF metadata if available
    const exifParts = [];
    if (photo.camera) exifParts.push(photo.camera);
    if (photo.lens) exifParts.push(photo.lens);
    if (photo.focalLength) exifParts.push(photo.focalLength);
    if (photo.aperture) exifParts.push(photo.aperture);
    if (photo.exposure) exifParts.push(photo.exposure);
    if (photo.iso) exifParts.push(photo.iso);

    if (exifParts.length > 0) {
      captionHTML += `<div class="modal-exif">${exifParts.join(' · ')}</div>`;
    }

    modalCaption.innerHTML = captionHTML;
    modal.style.display = "block";
  });

  return card;
}

// Filter and sort photos
function filterAndSortPhotos() {
  const searchTerm = searchInput.value.toLowerCase();
  const sortValue = sortSelect.value;

  let filteredPhotos = photoList.filter(
    (photo) =>
      photo.title.toLowerCase().includes(searchTerm) ||
      photo.date.includes(searchTerm)
  );

  switch (sortValue) {
    case "date-desc":
      filteredPhotos.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case "date-asc":
      filteredPhotos.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case "name":
      filteredPhotos.sort((a, b) => a.title.localeCompare(b.title));
      break;
  }

  return filteredPhotos;
}

// Render photo grid
function renderPhotoGrid() {
  const filteredPhotos = filterAndSortPhotos();
  photoGrid.innerHTML = "";
  filteredPhotos.forEach((photo) => {
    photoGrid.appendChild(createPhotoCard(photo));
  });
}

// Event listeners
searchInput.addEventListener("input", renderPhotoGrid);
sortSelect.addEventListener("change", renderPhotoGrid);

closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

// Initial render
renderPhotoGrid();
