const API_BASE_URL = "https://uservision-api-adbfdya4b2e3brcr.switzerlandnorth-01.azurewebsites.net/api";

let mediaItems = [];

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

async function uploadMedia() {
  const titleInput = document.getElementById("titleInput");
  const tagsInput = document.getElementById("tagsInput");
  const fileInput = document.getElementById("fileInput");
  const status = document.getElementById("status");
  const uploadButton = document.querySelector(".upload-box button");

  const title = titleInput.value.trim();
  const tags = tagsInput.value.split(",").map(tag => tag.trim()).filter(Boolean);
  const file = fileInput.files[0];

  if (!title || !file) {
    status.textContent = "Please enter a title and choose a file.";
    status.style.color = "red";
    showToast("Missing title or file");
    return;
  }

  try {
    uploadButton.disabled = true;
    uploadButton.textContent = "Uploading...";
    status.textContent = "Uploading...";
    status.style.color = "#e5e7eb";

    const fileData = await fileToBase64(file);

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, tags, fileName: file.name, fileType: file.type, fileData })
    });

    const resultText = await response.text();

    if (!response.ok) {
      throw new Error(resultText || "Upload failed.");
    }

    status.textContent = "Upload successful!";
    status.style.color = "lightgreen";

    titleInput.value = "";
    tagsInput.value = "";
    fileInput.value = "";

    showToast("Upload successful");
    await loadMedia();
    document.getElementById("preview").innerHTML = "";
  } catch (error) {
    status.textContent = error.message || "Upload failed.";
    status.style.color = "red";
    showToast("Upload failed");
  } finally {
    uploadButton.disabled = false;
    uploadButton.textContent = "Upload";
  }
}

async function loadMedia() {
  try {
    const response = await fetch(`${API_BASE_URL}/media`);

    if (!response.ok) {
      throw new Error("Failed to load media.");
    }

    mediaItems = await response.json();
    applyFiltersAndSort();
  } catch (error) {
    console.error("Error loading media:", error);
    showToast("Could not load media");
  }
}

function displayMedia(items) {
  const mediaGrid = document.getElementById("mediaGrid");
  mediaGrid.innerHTML = "";

  if (items.length === 0) {
    mediaGrid.innerHTML = `
  <div class="empty-state">
    <h3>✨ No media found</h3>
    <p>Try changing your search, filters, or upload something new.</p>
  </div>
`;
    return;
  }

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "media-card";

    let preview = "";

    if (item.fileType && item.fileType.startsWith("image")) {
      preview = `<img src="${item.url}" alt="${item.fileName}" />`;
    } else if (item.fileType && item.fileType.startsWith("video")) {
      preview = `<video controls src="${item.url}"></video>`;
    } else if (item.fileType && item.fileType.startsWith("audio")) {
      preview = `<audio controls src="${item.url}"></audio>`;
    } else {
      preview = `<p>Preview not available</p>`;
    }

    card.innerHTML = `
      ${preview}
      <h3>${item.title || item.fileName}</h3>
      <p class="file-name" title="${item.fileName}">
        <strong>File:</strong> ${shortenFileName(item.fileName)}
      </p>
      <p><strong>Date:</strong> ${new Date(item.uploadDate).toLocaleDateString()}</p>

      <div>
        ${(item.tags || []).map(tag => `
          <span class="tag clickable-tag" onclick="searchByTag('${tag}')">${tag}</span>
        `).join("")}
      </div>

      <div class="card-actions">
        <button class="download-btn" onclick="downloadMedia('${item.url}')" title="Download">
          ⤓
        </button>

        <div class="dropdown">
          <button class="menu-btn" onclick="toggleMenu(event, '${item.id}')" title="More options">⋯</button>

          <div class="dropdown-content" id="menu-${item.id}">
            <button onclick="editMedia('${item.id}')">Edit</button>
            <button onclick="deleteMedia('${item.id}', '${item.blobName}')">Delete</button>
          </div>
        </div>
      </div>
    `;

    mediaGrid.appendChild(card);
  });
}

function applyFiltersAndSort() {
  const typeFilter = document.getElementById("typeFilter")?.value || "all";
  const sortOption = document.getElementById("sortOption")?.value || "newest";
  const searchTerm = document.getElementById("searchInput")?.value.toLowerCase().trim() || "";

  let filtered = [...mediaItems];

  if (typeFilter !== "all") {
    filtered = filtered.filter(item =>
      item.fileType && item.fileType.startsWith(typeFilter)
    );
  }

  if (searchTerm) {
    filtered = filtered.filter(item => {
      const title = (item.title || "").toLowerCase();
      const fileName = (item.fileName || "").toLowerCase();
      const tags = Array.isArray(item.tags)
        ? item.tags.map(tag => String(tag).toLowerCase().trim())
        : [];

      return title.includes(searchTerm) ||
        fileName.includes(searchTerm) ||
        tags.some(tag => tag.includes(searchTerm));
    });
  }

  if (sortOption === "newest") {
    filtered.sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate));
  }

  if (sortOption === "oldest") {
    filtered.sort((a, b) => new Date(a.uploadDate) - new Date(b.uploadDate));
  }

  if (sortOption === "az") {
    filtered.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }

  if (sortOption === "za") {
    filtered.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
  }

  displayMedia(filtered);
}

function searchMedia() {
  applyFiltersAndSort();
}

function toggleMenu(event, id) {
  event.stopPropagation();

  document.querySelectorAll(".dropdown-content").forEach(menu => {
    if (menu.id !== `menu-${id}`) {
      menu.classList.remove("show");
    }
  });

  const menu = document.getElementById(`menu-${id}`);
  menu.classList.toggle("show");
}

document.addEventListener("click", () => {
  document.querySelectorAll(".dropdown-content").forEach(menu => {
    menu.classList.remove("show");
  });
});

function searchByTag(tag) {
  document.getElementById("searchInput").value = tag;
  applyFiltersAndSort();
  showToast(`Showing results for "${tag}"`);
}

function downloadMedia(url) {
  const link = document.createElement("a");
  link.href = url;
  link.download = "";
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function editMedia(id) {
  const item = mediaItems.find(m => m.id === id);

  document.getElementById("editId").value = item.id;
  document.getElementById("editTitle").value = item.title || "";
  document.getElementById("editTags").value = (item.tags || []).join(", ");

  document.getElementById("editModal").classList.add("show");
}

function closeEditModal() {
  document.getElementById("editModal").classList.remove("show");
}

async function saveEdit() {
  const id = document.getElementById("editId").value;
  const title = document.getElementById("editTitle").value.trim();
  const tags = document.getElementById("editTags").value
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);

  if (!title) {
    showToast("Title cannot be empty");
    return;
  }

  await fetch(`${API_BASE_URL}/edit`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, title, tags })
  });

  closeEditModal();
  showToast("Media updated");
  await loadMedia();
}

async function deleteMedia(id, blobName) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  await fetch(`${API_BASE_URL}/delete`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, blobName })
  });

  showToast("Media deleted");
  await loadMedia();
}

function shortenFileName(fileName) {
  if (!fileName) return "";
  return fileName.length > 24 ? fileName.slice(0, 12) + "..." + fileName.slice(-8) : fileName;
}

window.onload = function () {
  setupDragAndDrop();
  loadMedia();
};

function setupDragAndDrop() {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", () => {
    showPreview(fileInput.files[0]);
  });

  dropZone.addEventListener("dragover", e => {
    e.preventDefault();
    dropZone.classList.add("dragging");
  });

  dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragging");
  });

  dropZone.addEventListener("drop", e => {
    e.preventDefault();
    dropZone.classList.remove("dragging");

    const file = e.dataTransfer.files[0];
    fileInput.files = e.dataTransfer.files;

    showPreview(file);
  });
}

function showPreview(file) {
  const preview = document.getElementById("preview");
  preview.innerHTML = "";

  if (!file) return;

  if (file.type.startsWith("image")) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    preview.appendChild(img);
  } else if (file.type.startsWith("video")) {
    const video = document.createElement("video");
    video.src = URL.createObjectURL(file);
    video.controls = true;
    preview.appendChild(video);
  } else {
    preview.innerHTML = "<p>Preview not available</p>";
  }
}
