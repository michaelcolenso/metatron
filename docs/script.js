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

// Filenames can contain spaces (e.g. "IMG_5439 Copy.jpeg"); a plain src
// attribute tolerates that, but the srcset micro-syntax uses whitespace as
// its own delimiter, so an unencoded space silently corrupts the candidate
// and the browser drops it. Always encode filenames used in srcset/src.
function imageUrl(filename) {
  return `images/${encodeURIComponent(filename)}`;
}

// Build a <picture> (WebP + JPEG fallback) for one of a photo's size tiers
function createPicture(photo, tier, altText, { eager = false } = {}) {
  const sizeInfo = photo[tier];
  const picture = document.createElement("picture");

  if (sizeInfo.webp) {
    const source = document.createElement("source");
    source.type = "image/webp";
    source.srcset = imageUrl(sizeInfo.webp);
    picture.appendChild(source);
  }

  const img = document.createElement("img");
  img.src = imageUrl(sizeInfo.jpg || sizeInfo.file);
  img.alt = altText;
  img.loading = eager ? "eager" : "lazy";
  img.decoding = "async";
  if (sizeInfo.width && sizeInfo.height) {
    img.width = sizeInfo.width;
    img.height = sizeInfo.height;
  }
  picture.appendChild(img);

  return picture;
}

// Create photo element
function createPhotoCard(photo) {
  const item = document.createElement("figure");
  item.className = "photo-item";
  item.tabIndex = 0;
  item.setAttribute("role", "button");

  const altText = photo.title || "Photo";
  const picture = createPicture(photo, "thumb", altText);

  const ariaLabel = photo.title || photo.name || "View photo";
  item.setAttribute("aria-label", ariaLabel);

  item.appendChild(picture);

  const formattedDate = formatDate(photo.date);
  // The title already IS the formatted date whenever no better title was
  // available (see scripts/update-images.js), so showing both repeats the
  // same string twice.
  const titleDuplicatesDate = photo.title === formattedDate;

  if ((photo.title && !titleDuplicatesDate) || formattedDate) {
    const overlay = document.createElement("figcaption");
    overlay.className = "photo-overlay";

    if (photo.title && !titleDuplicatesDate) {
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
    modalImg.alt = altText;
    modalImg.src = imageUrl(photo.medium.jpg);
    // Let the browser pull the untouched full-resolution original instead
    // of the ~1400px medium tier when the viewport/DPR genuinely calls for
    // it (e.g. a large hi-DPI monitor), without forcing that download on
    // everyone else opening the lightbox.
    modalImg.srcset = `${imageUrl(photo.medium.jpg)} ${photo.medium.width}w, ${imageUrl(photo.full.file)} ${photo.full.width}w`;
    modalImg.sizes = "90vw";

    modalCaption.innerHTML = "";

    if (photo.title && !titleDuplicatesDate) {
      const titleEl = document.createElement("div");
      titleEl.className = "modal-title";
      titleEl.textContent = photo.title;
      modalCaption.appendChild(titleEl);
    }

    const modalDate = formattedDate;
    if (modalDate) {
      const dateEl = document.createElement("div");
      dateEl.className = "modal-date";
      dateEl.textContent = modalDate;
      modalCaption.appendChild(dateEl);
    }

    const exifParts = [];
    if (photo.camera) exifParts.push(photo.camera);
    if (photo.lens) exifParts.push(photo.lens);
    if (photo.focalLength) exifParts.push(photo.focalLength);
    if (photo.aperture) exifParts.push(photo.aperture);
    if (photo.exposure) exifParts.push(photo.exposure);
    if (photo.iso) exifParts.push(photo.iso);

    if (exifParts.length > 0) {
      const exifEl = document.createElement("div");
      exifEl.className = "modal-exif";
      exifEl.textContent = exifParts.join(" · ");
      modalCaption.appendChild(exifEl);
    }

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
