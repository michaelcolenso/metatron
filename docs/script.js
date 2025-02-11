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
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Create photo card element
function createPhotoCard(image) {
    const card = document.createElement('div');
    card.className = 'photo-card';
    
    const img = document.createElement('img');
    img.src = `images/${image.name}`;
    img.alt = image.title;
    img.loading = 'lazy';
    
    const info = document.createElement('div');
    info.className = 'photo-info';
    info.innerHTML = `
        <div class="photo-date">${formatDate(image.date)}</div>
    `;
    
    card.appendChild(img);
    card.appendChild(info);
    
    // Add click handler for modal
    card.addEventListener('click', () => {
        modalImg.src = img.src;
        modalCaption.textContent = `${image.title} - ${formatDate(image.date)}`;
        modal.style.display = "block";
    });
    
    return card;
}

// Filter and sort images
function filterAndSortImages() {
    const searchTerm = searchInput.value.toLowerCase();
    const sortValue = sortSelect.value;
    
    let filteredImages = images.filter(image => 
        image.title.toLowerCase().includes(searchTerm) ||
        image.date.includes(searchTerm)
    );
    
    switch(sortValue) {
        case 'date-desc':
            filteredImages.sort((a, b) => new Date(b.date) - new Date(a.date));
            break;
        case 'date-asc':
            filteredImages.sort((a, b) => new Date(a.date) - new Date(b.date));
            break;
        case 'name':
            filteredImages.sort((a, b) => a.title.localeCompare(b.title));
            break;
    }
    
    return filteredImages;
}

// Render photo grid
function renderPhotoGrid() {
    const filteredImages = filterAndSortImages();
    photoGrid.innerHTML = '';
    filteredImages.forEach(image => {
        photoGrid.appendChild(createPhotoCard(image));
    });
}

// Event listeners
searchInput.addEventListener('input', renderPhotoGrid);
sortSelect.addEventListener('change', renderPhotoGrid);

closeBtn.addEventListener('click', () => {
    modal.style.display = "none";
});

modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

// Initial render
renderPhotoGrid();