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
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// Create photo element
function createPhotoCard(photo) {
  const item = document.createElement("figure");
  item.className = "photo-item";
  item.tabIndex = 0;
  item.setAttribute("role", "button");

  const img = document.createElement("img");
  img.src = `images/${photo.name}`;
  img.alt = photo.title || "Photo";
  img.loading = "lazy";
  img.decoding = "async";

  const ariaLabel = photo.title || photo.name || "View photo";
  item.setAttribute("aria-label", ariaLabel);

  item.appendChild(img);

  const formattedDate = formatDate(photo.date);

  if (photo.title || formattedDate) {
    const overlay = document.createElement("figcaption");
    overlay.className = "photo-overlay";

    if (photo.title) {
      const titleEl = document.createElement("div");
      titleEl.className = "overlay-title";
      titleEl.textContent = photo.title;
      overlay.appendChild(titleEl);
    }

    if (formattedDate) {
      const metaEl = document.createElement("div");
      metaEl.className = "overlay-meta";
      metaEl.textContent = formattedDate;
      overlay.appendChild(metaEl);
    }

    item.appendChild(overlay);
  }

  const openModal = () => {
    modalImg.src = img.src;
    modalImg.alt = img.alt;

    // Build caption with EXIF data
    let captionHTML = photo.title
      ? `<div class="modal-title">${photo.title}</div>`
      : "";

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
  };

  // Add click handler for modal
  item.addEventListener("click", openModal);
  item.addEventListener("keydown", (event) => {
    if (
      event.key === "Enter" ||
      event.key === " " ||
      event.key === "Spacebar" ||
      event.key === "Space"
    ) {
      event.preventDefault();
      openModal();
    }
  });

  return item;
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

// Ensure masonry layout class is applied
photoGrid.classList.add("layout-masonry");

// Initial render
renderPhotoGrid();
