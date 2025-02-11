// Image data with all available images
const images = [
    {
        name: 'gobi-sees-you.jpg',
        date: '2023-03-05',
        title: 'Gobi Sees You'
    },
    {
        name: '2011-05-20_16-25-28.jpg',
        date: '2011-05-20',
        title: 'May 20, 2011'
    },
    {
        name: '2012-06-05_22-05-18.jpg',
        date: '2012-06-05',
        title: 'June 5, 2012'
    },
    {
        name: '2013-09-01_02-42-30.jpg',
        date: '2013-09-01',
        title: 'September 1, 2013'
    },
    {
        name: '2013-09-07_17-01-21.jpg',
        date: '2013-09-07',
        title: 'September 7, 2013'
    },
    {
        name: '2013-09-14_04-57-44.jpg',
        date: '2013-09-14',
        title: 'September 14, 2013'
    },
    {
        name: '2013-09-17_04-28-52.jpg',
        date: '2013-09-17',
        title: 'September 17, 2013'
    },
    {
        name: '2013-11-26_15-26-58.jpg',
        date: '2013-11-26',
        title: 'November 26, 2013'
    },
    {
        name: '2013-12-19_04-54-39.jpg',
        date: '2013-12-19',
        title: 'December 19, 2013'
    },
    {
        name: '2014-03-06_20-29-26.jpg',
        date: '2014-03-06',
        title: 'March 6, 2014'
    },
    {
        name: '2014-04-08_13-48-32.jpg',
        date: '2014-04-08',
        title: 'April 8, 2014'
    },
    {
        name: '2014-04-17_16-43-08.jpg',
        date: '2014-04-17',
        title: 'April 17, 2014'
    },
    {
        name: '2014-04-23_15-59-19.jpg',
        date: '2014-04-23',
        title: 'April 23, 2014'
    },
    {
        name: '2014-06-03_14-25-09.jpg',
        date: '2014-06-03',
        title: 'June 3, 2014'
    },
    {
        name: '2017-02-28_04-59-39.jpg',
        date: '2017-02-28',
        title: 'February 28, 2017'
    }
];

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