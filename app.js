const fileInput = document.getElementById("file");
const dropZone = document.getElementById("drop-zone");
const resultContainer = document.getElementById("result");
const copyFullButton = document.getElementById("copy-full");
const copyPrefixButton = document.getElementById("copy-prefix");
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
  const codeEl = clone.querySelector(".hash-value");
  const firstSegment = hash.slice(0, 7);
  const remainder = hash.slice(7);
  codeEl.innerHTML = `<span class="hash-head">${firstSegment}</span>${remainder}`;
  resultContainer.appendChild(clone);
  copyFullButton.disabled = false;
  copyFullButton.dataset.hash = hash;
  copyFullButton.textContent = "Copy hash";
  copyPrefixButton.disabled = false;
  copyPrefixButton.dataset.prefix = firstSegment;
  copyPrefixButton.textContent = "Copy first 7";
}

function renderPlaceholder(message) {
  resultContainer.innerHTML = `<p class="placeholder">${message}</p>`;
  [copyFullButton, copyPrefixButton].forEach((button) => {
    button.disabled = true;
    delete button.dataset.hash;
    delete button.dataset.prefix;
    button.textContent = button.id === "copy-full" ? "Copy hash" : "Copy first 7";
  });
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

copyFullButton.addEventListener("click", async () => {
  const hash = copyFullButton.dataset.hash;
  if (!hash) {
    return;
  }

  try {
    await navigator.clipboard.writeText(hash);
    copyFullButton.textContent = "Copied!";
    setTimeout(() => (copyFullButton.textContent = "Copy hash"), 1200);
  } catch (error) {
    console.error("Clipboard error", error);
    copyFullButton.textContent = "Copy failed";
    setTimeout(() => (copyFullButton.textContent = "Copy hash"), 1200);
  }
});

copyPrefixButton.addEventListener("click", async () => {
  const prefix = copyPrefixButton.dataset.prefix;
  if (!prefix) {
    return;
  }

  try {
    await navigator.clipboard.writeText(prefix);
    copyPrefixButton.textContent = "Copied!";
    setTimeout(() => (copyPrefixButton.textContent = "Copy first 7"), 1200);
  } catch (error) {
    console.error("Clipboard error", error);
    copyPrefixButton.textContent = "Copy failed";
    setTimeout(() => (copyPrefixButton.textContent = "Copy first 7"), 1200);
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .catch((error) => console.error("SW registration failed:", error));
  });
}

renderPlaceholder("No file selected yet");
