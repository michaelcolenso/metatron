# Metatron

photos by michaelcolenso

## Table of contents
- [Features](#features)
- [Project structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
  - [Run the gallery locally](#run-the-gallery-locally)
  - [Update the image catalogue](#update-the-image-catalogue)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

## Features
- Responsive masonry layout that adapts to any viewport size.
- Client-side search and sorting (newest, oldest, alphabetical) with instant feedback.
- Click-to-enlarge modal viewer with metadata captions; grid thumbnails, the lightbox image, and the full-resolution original are all served as separate WebP/JPEG derivatives sized for their use, not one full-size image everywhere.
- Automatic footer year updates and lazy-loading of grid thumbnails.
- Node.js maintenance script for regenerating the gallery catalogue, generating responsive image derivatives, and syncing media assets.

## Project structure

```
├── docs/                # Static site that is published (ideal for GitHub Pages)
│   ├── images/          # Gallery-ready images copied from the top-level images/ folder
│   ├── images.js        # Auto-generated list of photo metadata consumed by the gallery
│   ├── index.html       # Portfolio entry point
│   ├── script.js        # Gallery logic (search, sort, modal)
│   └── styles.css       # Styling and responsive layout rules
├── images/              # Source images that feed the gallery
├── scripts/
│   └── update-images.js # Maintenance script to refresh docs/images and docs/images.js
├── package.json         # Project metadata and npm scripts
└── LICENSE
```

## Prerequisites
- [Node.js](https://nodejs.org/) 18 or newer (required for the maintenance script).
- Any static file server if you want to preview the site locally.

## Getting started
1. **Clone the repository**
   ```bash
   git clone https://github.com/michaelcolenso/metatron.git
   cd metatron
   ```
2. **Install dependencies** (needed to regenerate the catalogue: `exifreader` for metadata, `sharp` for resizing/WebP, `heic-convert` for HEIC/HEIF support)
   ```bash
   npm install
   ```

### Run the gallery locally
The gallery is a static site, so you can use any HTTP server to preview it. A few quick options:

```bash
# Option 1: use the http-server package (installs if missing)
npx http-server docs

# Option 2: use Python's built-in server
python3 -m http.server --directory docs 8080
```

Once the server is running, visit `http://localhost:8080` (or the port you selected) to browse the gallery.

### Update the image catalogue
When you add, remove, or rename images in the top-level `images/` directory, regenerate the metadata file and image derivatives with the provided script:

```bash
npm run update-images
```

The script performs the following tasks:
1. Scans `images/` for `.jpg`, `.jpeg`, or `.png` files (see below for HEIC/HEIF).
2. Extracts a capture date from the filename (`YYYY-MM-DD_HH-mm-ss.ext`) or, failing that, the photo's EXIF metadata. A photo with neither is left undated rather than given a fabricated one — filesystem timestamps reflect when the file was checked out, not when it was taken, so the script never falls back to them.
3. Generates a human-readable title from the date, or from the filename when there's no date.
4. Generates `thumb` (480px) and `medium` (1400px) derivatives in both JPEG and WebP for every photo, alongside the untouched full-resolution original — the gallery grid and lightbox load these small derivatives instead of the source file, and only reach for the full original when the viewport genuinely needs it.
5. Removes any previously generated file in `docs/images/` that no longer corresponds to a current source photo, so renamed/deleted source images don't leave orphaned derivatives behind.
6. Writes the resulting array to `docs/images.js` as `photoList`.

**HEIC/HEIF photos** (e.g. iPhone originals) are skipped by default — set `INCLUDE_HEIC=1` to convert and publish them:
```bash
INCLUDE_HEIC=1 npm run update-images
```
This is opt-in deliberately: converting adds previously-unpublished photos to a *public* gallery, which is worth a conscious choice per batch rather than an automatic one.

> **Tip:** If your filenames do not include timestamps in the expected format and a photo has no usable EXIF date, it will sort to the end of "Newest/Oldest First" and display its filename as the title. Edit `docs/images.js` manually if you want to override this for a specific photo.

### Customise the gallery
- **Styling:** Adjust colours, typography, and layout in [`docs/styles.css`](docs/styles.css).
- **Behaviour:** Tweak search, sorting, or modal behaviour in [`docs/script.js`](docs/script.js).
- **Metadata:** Extend the data model by adding fields to `photoList` in [`docs/images.js`](docs/images.js) and updating the rendering logic in `docs/script.js`.

## Deployment
The `docs/` directory is structured for GitHub Pages out of the box:
1. Push the latest changes to the `main` branch.
2. In your repository settings, enable GitHub Pages and point it at the `docs/` folder.
3. GitHub Pages will serve the gallery automatically at `https://<username>.github.io/<repo>/`.

You can deploy to any other static host (Netlify, Vercel, S3, etc.) by uploading the contents of `docs/`.

## Contributing
Contributions are welcome! Feel free to fork the repository and submit pull requests. For significant changes, please open an issue first to discuss what you would like to change. When contributing code, follow the existing formatting and include screenshots for visual updates whenever possible.

## License
This project is licensed under the [MIT License](LICENSE).
