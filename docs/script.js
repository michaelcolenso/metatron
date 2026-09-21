// DOM Elements
const photoGrid = document.getElementById("photo-grid");
const searchInput = document.getElementById("search");
const sortSelect = document.getElementById("sort");
const modal = document.getElementById("modal");
const modalPicture = document.getElementById("modal-picture");
const modalImg = document.getElementById("modal-img");
const modalWebpSource = document.createElement("source");
modalWebpSource.type = "image/webp";
modalPicture.insertBefore(modalWebpSource, modalImg);
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

// Normalizes a photo's size-tier info to { file, jpg, webp, width, height }.
// Defends against docs/images.js briefly reverting to the older catalogue
// schema (sizes: { thumb, medium, full } as plain filename strings, no
// webp/width/height) if a not-yet-updated CI run overwrites it before the
// pipeline consolidation lands -- see AUDIT.md's "Blocker" note. Without
// this, that schema would make sizeInfo undefined here and throw, breaking
// the whole gallery rather than just losing WebP/responsive-size polish.
function getSizeInfo(photo, tier) {
  const modern = photo[tier];
  if (modern && typeof modern === "object") {
    return modern;
  }
  return { file: photo.sizes?.[tier] || photo.name };
}

// Build a <picture> (WebP + JPEG fallback) from one or more of a photo's
// size tiers, smallest first. A single tier behaves as a plain fixed-size
// image; multiple tiers add width-descriptor srcset candidates so the
// browser can pick a sharper one on high-DPR displays instead of upscaling
// the smallest tier (a 480px thumb rendered at 340 CSS px is soft on a 2x/3x
// screen). `sizes` should describe the rendered width and is required
// whenever more than one tier is passed.
function createPicture(photo, tiers, altText, { eager = false, sizes } = {}) {
  const infos = tiers.map((tier) => getSizeInfo(photo, tier));
  const primary = infos[0];
  const multi = infos.length > 1;
  const picture = document.createElement("picture");

  // A narrow source (<= a larger tier's max dimension) makes that tier's
  // derivative the same width as a smaller tier's (withoutEnlargement means
  // neither can exceed the source), producing two candidates with the same
  // "w" descriptor -- an invalid srcset. Keep only the first (smallest,
  // usually lightest-weight) candidate per distinct width.
  const buildSrcset = (urlKey) => {
    const seenWidths = new Set();
    return infos
      .filter((info) => info[urlKey])
      .filter((info) => {
        if (!multi || !info.width) return true;
        if (seenWidths.has(info.width)) return false;
        seenWidths.add(info.width);
        return true;
      })
      .map((info) => (multi && info.width ? `${imageUrl(info[urlKey])} ${info.width}w` : imageUrl(info[urlKey])))
      .join(", ");
  };

  if (infos.every((info) => info.webp)) {
    const source = document.createElement("source");
    source.type = "image/webp";
    source.srcset = buildSrcset("webp");
    if (multi && sizes) source.sizes = sizes;
    picture.appendChild(source);
  }

  const img = document.createElement("img");
  img.src = imageUrl(primary.jpg || primary.file);
  if (multi && infos.every((info) => info.width && (info.jpg || info.file))) {
    img.srcset = buildSrcset("jpg");
    if (sizes) img.sizes = sizes;
  }
  img.alt = altText;
  img.loading = eager ? "eager" : "lazy";
  img.decoding = "async";
  if (primary.width && primary.height) {
    img.width = primary.width;
    img.height = primary.height;
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
  // thumb (480px) alone looks soft upscaled on 2x/3x displays for cards up
  // to 340 CSS px wide; offering medium (1400px) too lets the browser pick
  // based on actual device pixel density instead of always upscaling thumb.
  const picture = createPicture(photo, ["thumb", "medium"], altText, {
    sizes: "(max-width: 768px) 100vw, (max-width: 1024px) 280px, 340px",
  });

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
    const mediumInfo = getSizeInfo(photo, "medium");
    const fullInfo = getSizeInfo(photo, "full");

    modalImg.alt = altText;
    modalImg.src = imageUrl(mediumInfo.jpg || mediumInfo.file);
    modalImg.removeAttribute("srcset");
    modalImg.removeAttribute("sizes");
    // Offer medium in WebP too. There's deliberately no WebP "full" (see
    // scripts/update-images.js), and a <picture> source with only one
    // candidate is always chosen once its type matches -- so this can't be
    // combined with a width-based srcset the way the grid's srcset is
    // without hard-capping every WebP browser (nearly all of them) at
    // medium forever. Full resolution is reached via the explicit link
    // below instead, which works identically regardless of format.
    if (mediumInfo.webp) {
      modalWebpSource.srcset = imageUrl(mediumInfo.webp);
    } else {
      modalWebpSource.removeAttribute("srcset");
    }

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

    if (fullInfo.file) {
      const fullLink = document.createElement("a");
      fullLink.className = "modal-full-link";
      fullLink.href = imageUrl(fullInfo.file);
      fullLink.target = "_blank";
      fullLink.rel = "noopener";
      fullLink.textContent = "View full resolution";
      modalCaption.appendChild(fullLink);
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
