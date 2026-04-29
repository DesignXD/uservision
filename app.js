const API_BASE_URL = "https://uservision-api-adbfdya4b2e3brcr.switzerlandnorth-01.azurewebsites.net/api";

let mediaItems = [];

window.onload = function () {
  loadMedia();
};

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const base64 = reader.result.split(",")[1];
      resolve(base64);
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function uploadMedia() {
  const titleInput = document.getElementById("titleInput");
  const tagsInput = document.getElementById("tagsInput");
  const fileInput = document.getElementById("fileInput");
  const status = document.getElementById("status");

  const title = titleInput.value.trim();
  const tags = tagsInput.value
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);

  const file = fileInput.files[0];

  if (!title || !file) {
    status.textContent = "Please enter a title and choose a file.";
    status.style.color = "red";
    return;
  }

  try {
    status.textContent = "Converting file...";
    status.style.color = "black";

    const fileData = await fileToBase64(file);

    status.textContent = "Sending to backend...";

    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title,
        tags,
        fileName: file.name,
        fileType: file.type,
        fileData
      })
    });

    const resultText = await response.text();
    console.log("Upload response status:", response.status);
    console.log("Upload response body:", resultText);

    if (!response.ok) {
      throw new Error(resultText || "Upload failed.");
    }

    status.textContent = "Upload successful!";
    status.style.color = "green";

    titleInput.value = "";
    tagsInput.value = "";
    fileInput.value = "";

    await loadMedia();
  } catch (error) {
    console.error("Upload failed:", error);
    status.textContent = error.message || "Upload failed.";
    status.style.color = "red";
  }
}

async function loadMedia() {
  try {
    const response = await fetch(`${API_BASE_URL}/media`);

    if (!response.ok) {
      throw new Error("Failed to load media.");
    }

    const data = await response.json();

    mediaItems = data;
    displayMedia(mediaItems);
  } catch (error) {
    console.error("Error loading media:", error);
  }
}

card.innerHTML = `
  ${preview}
  <h3>${item.title || item.fileName}</h3>
  <p><strong>File:</strong> ${item.fileName}</p>
  <p><strong>Date:</strong> ${new Date(item.uploadDate).toLocaleDateString()}</p>

  <div>
    ${(item.tags || []).map(tag => `<span class="tag">${tag}</span>`).join("")}
  </div>

  <div class="card-actions">
    <button onclick="downloadMedia('${item.url}')">Download</button>
    <button onclick="editMedia('${item.id}')">Edit</button>
    <button onclick="deleteMedia('${item.id}', '${item.blobName}')">Delete</button>
  </div>
`;

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
      <p><strong>File:</strong> ${item.fileName}</p>
      <p><strong>Date:</strong> ${new Date(item.uploadDate).toLocaleDateString()}</p>
      <div>
        ${(item.tags || []).map(tag => `<span class="tag">${tag}</span>`).join("")}
      </div>
    `;

    mediaGrid.appendChild(card);
  });
}

function searchMedia() {
  const searchTerm = document.getElementById("searchInput").value.toLowerCase().trim();

  if (!searchTerm) {
    displayMedia(mediaItems);
    return;
  }

  const filtered = mediaItems.filter(item => {
    const title = (item.title || "").toLowerCase();
    const fileName = (item.fileName || "").toLowerCase();

    const tags = Array.isArray(item.tags)
      ? item.tags.map(tag => String(tag).toLowerCase().trim())
      : [];

    return (
      title.includes(searchTerm) ||
      fileName.includes(searchTerm) ||
      tags.some(tag => tag.includes(searchTerm))
    );
  });

  displayMedia(filtered);
}

function downloadMedia(url) {
  const link = document.createElement("a");
  link.href = url;
  link.download = "";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

async function editMedia(id) {
  const item = mediaItems.find(m => m.id === id);

  const newTitle = prompt("Edit title:", item.title);
  const newTags = prompt("Edit tags (comma separated):", item.tags.join(","));

  if (!newTitle) return;

  await fetch(`${API_BASE_URL}/edit`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id,
      title: newTitle,
      tags: newTags.split(",").map(t => t.trim())
    })
  });

  loadMedia();
}

async function deleteMedia(id, blobName) {
  if (!confirm("Are you sure you want to delete this item?")) return;

  try {
    await fetch(`${API_BASE_URL}/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, blobName })
    });

    loadMedia();
  } catch (error) {
    console.error("Delete failed:", error);
  }
}
