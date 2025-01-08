const photoGrid = document.getElementById("photo-grid");

// Fetch images from the /docs/images folder
fetch("images/")
  .then((response) => response.text())
  .then((text) => {
    const parser = new DOMParser();
    const htmlDoc = parser.parseFromString(text, "text/html");
    const imageFiles = Array.from(htmlDoc.querySelectorAll("a"))
      .map((link) => link.href)
      .filter((href) => href.match(/\.(jpg|jpeg|png|gif)$/i));

    imageFiles.forEach((imageUrl) => {
      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = "Photo";
      img.loading = "lazy";
      photoGrid.appendChild(img);
    });
  })
  .catch((error) => console.error("Error loading images:", error));
