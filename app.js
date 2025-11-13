const fileInput = document.getElementById("file");
const dropZone = document.getElementById("drop-zone");
const resultContainer = document.getElementById("result");
const copyButton = document.getElementById("copy");
const template = document.getElementById("result-template");

const placeholder = `<p class="placeholder">No file selected yet</p>`;

async function hashFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return [...new Uint8Array(hashBuffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function renderResult(fileName, hash) {
  resultContainer.innerHTML = "";
  const clone = template.content.cloneNode(true);
  clone.querySelector(".file-name").textContent = fileName;
  clone.querySelector(".hash-value").textContent = hash;
  resultContainer.appendChild(clone);
  copyButton.disabled = false;
  copyButton.dataset.hash = hash;
}

function renderPlaceholder(message) {
  resultContainer.innerHTML = `<p class="placeholder">${message}</p>`;
  copyButton.disabled = true;
  delete copyButton.dataset.hash;
}

async function handleFiles(files) {
  if (!files?.length) {
    renderPlaceholder("No file selected yet");
    return;
  }

  const file = files[0];
  renderPlaceholder("Calculating…");

  try {
    const hash = await hashFile(file);
    renderResult(file.name, hash);
  } catch (error) {
    console.error(error);
    renderPlaceholder("Something went wrong. Please try another file.");
  }
}

fileInput.addEventListener("change", (event) => handleFiles(event.target.files));

["dragenter", "dragover"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragging");
  });
});

dropZone.addEventListener("drop", (event) => {
  const files = event.dataTransfer?.files;
  if (files?.length) {
    fileInput.files = files;
    handleFiles(files);
  }
});

copyButton.addEventListener("click", async () => {
  const hash = copyButton.dataset.hash;
  if (!hash) {
    return;
  }

  try {
    await navigator.clipboard.writeText(hash);
    copyButton.textContent = "Copied!";
    setTimeout(() => (copyButton.textContent = "Copy hash"), 1200);
  } catch (error) {
    console.error("Clipboard error", error);
    copyButton.textContent = "Copy failed";
    setTimeout(() => (copyButton.textContent = "Copy hash"), 1200);
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .catch((error) => console.error("SW registration failed:", error));
  });
}

renderPlaceholder("No file selected yet");
