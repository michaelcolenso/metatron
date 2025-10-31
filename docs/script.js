// DOM Elements
const photoGrid = document.getElementById("photo-grid");
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort");
const modal = document.getElementById("modal");
const modalImg = document.getElementById("modal-img");
const modalCaption = document.getElementById("modal-caption");
const closeBtn = document.querySelector(".close");
const layoutButtons = document.querySelectorAll(".layout-option");

const layoutClasses = [
  "layout-masonry",
  "layout-grid",
  "layout-collage",
  "layout-filmstrip",
];

const collageTilts = [-6, -3.5, -2, 0, 1.5, 3.5, 5.5];
const collageAccentColors = [
  "rgba(255, 215, 134, 0.75)",
  "rgba(244, 114, 182, 0.65)",
  "rgba(129, 140, 248, 0.7)",
  "rgba(96, 165, 250, 0.6)",
  "rgba(45, 212, 191, 0.55)",
];

let currentLayout = "masonry";

// Set current year in footer
document.getElementById("year").textContent = new Date().getFullYear();

// Format date for display
function formatDate(dateStr) {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
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

  const tilt = collageTilts[Math.floor(Math.random() * collageTilts.length)];
  const accent =
    collageAccentColors[Math.floor(Math.random() * collageAccentColors.length)];
  card.dataset.tilt = tilt;
  card.style.setProperty("--tilt", tilt);
  card.style.setProperty("--accent-color", accent);

  const img = document.createElement("img");
  img.src = `images/${photo.name}`;
  img.alt = photo.title;
  img.loading = "lazy";

  const info = document.createElement("div");
  info.className = "photo-info";
  const formattedDate = formatDate(photo.date);
  info.innerHTML = `
        <div class="photo-title">${photo.title}</div>
        ${formattedDate ? `<div class="photo-date">${formattedDate}</div>` : ""}
    `;

  card.appendChild(img);
  card.appendChild(info);

  // Add click handler for modal
  card.addEventListener("click", () => {
    modalImg.src = img.src;

    // Build caption with EXIF data
    let captionHTML = `<div class="modal-title">${photo.title}</div>`;

    // Add date if available
    const modalDate = formatDate(photo.date);
    if (modalDate) {
      captionHTML += `<div class="modal-date">${modalDate}</div>`;
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
  const searchTerm = searchInput.value.trim().toLowerCase();
  const sortValue = sortSelect.value;

  let filteredPhotos = photoList.filter((photo) => {
    const titleMatch = photo.title?.toLowerCase().includes(searchTerm);
    const rawDate = typeof photo.date === "string" ? photo.date.toLowerCase() : "";
    const prettyDate = formatDate(photo.date).toLowerCase();
    return (
      titleMatch ||
      rawDate.includes(searchTerm) ||
      prettyDate.includes(searchTerm)
    );
  });

  const getTimestamp = (photo) => {
    if (!photo.date) return null;
    const value = new Date(photo.date);
    return Number.isNaN(value.getTime()) ? null : value.getTime();
  };

  switch (sortValue) {
    case "date-desc":
      filteredPhotos.sort((a, b) => {
        const timeA = getTimestamp(a);
        const timeB = getTimestamp(b);
        if (timeA === null && timeB === null) return 0;
        if (timeA === null) return 1;
        if (timeB === null) return -1;
        return timeB - timeA;
      });
      break;
    case "date-asc":
      filteredPhotos.sort((a, b) => {
        const timeA = getTimestamp(a);
        const timeB = getTimestamp(b);
        if (timeA === null && timeB === null) return 0;
        if (timeA === null) return 1;
        if (timeB === null) return -1;
        return timeA - timeB;
      });
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
  if (!photoGrid.classList.contains(`layout-${currentLayout}`)) {
    layoutClasses.forEach((cls) => photoGrid.classList.remove(cls));
    photoGrid.classList.add(`layout-${currentLayout}`);
  }
  photoGrid.innerHTML = "";
  filteredPhotos.forEach((photo) => {
    photoGrid.appendChild(createPhotoCard(photo));
  });
}

function setLayout(layout) {
  currentLayout = layout;

  layoutButtons.forEach((button) => {
    const isActive = button.dataset.layout === layout;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  layoutClasses.forEach((cls) => photoGrid.classList.remove(cls));
  photoGrid.classList.add(`layout-${layout}`);

  renderPhotoGrid();
}

// Event listeners
searchInput.addEventListener("input", renderPhotoGrid);
sortSelect.addEventListener("change", renderPhotoGrid);

layoutButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setLayout(button.dataset.layout);
  });
});

closeBtn.addEventListener("click", () => {
  modal.style.display = "none";
});

modal.addEventListener("click", (e) => {
  if (e.target === modal) {
    modal.style.display = "none";
  }
});

// Initial render
setLayout(currentLayout);
