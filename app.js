const fileInputs = Array.from(document.querySelectorAll(".file-input"));
const dropZones = Array.from(document.querySelectorAll(".file-drop[data-index]"));
const slotResults = Array.from(document.querySelectorAll(".slot-result"));
const compareArea = document.getElementById("compare-area");
const copyFullButton = document.getElementById("copy-full");
const copyPrefixButton = document.getElementById("copy-prefix");
const template = document.getElementById("result-template");
const compareTemplate = document.getElementById("compare-template");
const tabs = document.querySelectorAll("[data-tab]");
const panels = document.querySelectorAll("[data-panel]");
const keyOutput = document.getElementById("key-output");
const keyFilename = document.getElementById("key-filename");
const generateKeyButton = document.getElementById("generate-key");
const saveKeyButton = document.getElementById("save-key");
const clearHashButton = document.getElementById("clear-hash");
const clearKeyButton = document.getElementById("clear-key");
const keyHint = document.getElementById("key-hint");
const keyEntropy = document.getElementById("key-entropy");

const NAME_FRAGMENTS = ["zor", "lyn", "qu", "vex", "tal", "dra", "wex", "shi", "mek", "or", "phan", "kel", "zak", "ul", "rin", "vak", "eil", "dro", "gha", "vek"];
const KEY_BYTE_LENGTH = 48; // >32 and <64 bytes
const SLOT_COUNT = 2;
let keyState = null;
const slotStates = Array.from({ length: SLOT_COUNT }, () => null);
const fileInputMap = fileInputs.reduce((acc, input) => {
  acc[Number(input.dataset.index)] = input;
  return acc;
}, []);
let activeSlot = null;

async function hashFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}

function setSlotPlaceholder(index, message) {
  const placeholders = ["Waiting for File A", "Waiting for File B"];
  slotResults[index].innerHTML = `<p class="placeholder">${message || placeholders[index]}</p>`;
}

function renderSlotResult(index, { name, hash }) {
  const clone = template.content.cloneNode(true);
  clone.querySelector(".file-name").textContent = name;
  const codeEl = clone.querySelector(".hash-value");
  const firstSegment = hash.slice(0, 7);
  const remainder = hash.slice(7);
  codeEl.innerHTML = `<span class="hash-head">${firstSegment}</span>${remainder}`;
  slotResults[index].innerHTML = "";
  slotResults[index].appendChild(clone);
}

function updateCompareArea() {
  compareArea.innerHTML = "";
  if (slotStates.every(Boolean)) {
    const [first, second] = slotStates;
    const compareNode = compareTemplate.content.cloneNode(true);
    const match = first.hash === second.hash;
    const block = compareNode.querySelector(".compare-result");
    block.classList.add(match ? "match" : "mismatch");
    compareNode.querySelector(".compare-text").textContent = match
      ? "Hashes match"
      : "Hashes do not match";
    compareNode.querySelector(".compare-icon").textContent = match ? "✅" : "⚠️";
    const wrapper = document.createElement("div");
    wrapper.className = "compare-wrapper";
    wrapper.appendChild(block);
    compareArea.appendChild(wrapper);
  }
  updateCopyTargets();
}

function updateCopyTargets() {
  const source =
    (activeSlot !== null && slotStates[activeSlot]) || slotStates.find(Boolean);
  if (!source) {
    [copyFullButton, copyPrefixButton].forEach((button) => {
      button.disabled = true;
      delete button.dataset.hash;
      delete button.dataset.prefix;
      button.textContent = button.id === "copy-full" ? "Copy hash" : "Copy first 7";
    });
    return;
  }

  copyFullButton.disabled = false;
  copyFullButton.dataset.hash = source.hash;
  copyFullButton.textContent = "Copy hash";
  const firstSegment = source.hash.slice(0, 7);
  copyPrefixButton.disabled = false;
  copyPrefixButton.dataset.prefix = firstSegment;
  copyPrefixButton.textContent = "Copy first 7";
}

async function handleSlot(index, fileList) {
  const file = fileList?.[0];
  if (!file) {
    slotStates[index] = null;
    setSlotPlaceholder(index);
    updateCompareArea();
    return;
  }

  setSlotPlaceholder(index, "Calculating…");
  try {
    const hash = await hashFile(file);
    const result = { name: file.name, hash };
    slotStates[index] = result;
    activeSlot = index;
    renderSlotResult(index, result);
    updateCompareArea();
  } catch (error) {
    console.error(error);
    slotStates[index] = null;
    setSlotPlaceholder(index, "Failed to hash file.");
    updateCompareArea();
  }
}

function resetHashPanel() {
  slotStates.forEach((_, index) => {
    slotStates[index] = null;
    setSlotPlaceholder(index);
  });
  activeSlot = null;
  compareArea.innerHTML = "";
  fileInputs.forEach((input) => {
    input.value = "";
  });
  updateCopyTargets();
}

fileInputs.forEach((input) => {
  const index = Number(input.dataset.index);
  input.addEventListener("change", (event) => handleSlot(index, event.target.files));
});

dropZones.forEach((zone) => {
  const index = Number(zone.dataset.index);
  ["dragenter", "dragover"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((eventName) => {
    zone.addEventListener(eventName, (event) => {
      event.preventDefault();
      zone.classList.remove("dragging");
    });
  });
  zone.addEventListener("drop", (event) => {
    const files = event.dataTransfer?.files;
    if (files?.length) {
      if (typeof DataTransfer !== "undefined") {
        const dt = new DataTransfer();
        dt.items.add(files[0]);
        fileInputMap[index].files = dt.files;
        handleSlot(index, dt.files);
      } else {
        handleSlot(index, files);
      }
    }
  });
});

clearHashButton.addEventListener("click", () => {
  resetHashPanel();
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

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveTab(tab.dataset.tab));
});

function setActiveTab(target) {
  tabs.forEach((tab) => {
    const isActive = tab.dataset.tab === target;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-selected", String(isActive));
  });
  panels.forEach((panel) => {
    const isActive = panel.dataset.panel === target;
    panel.hidden = !isActive;
    panel.classList.toggle("active", isActive);
  });
}

function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function gibberishName() {
  const length = 4 + Math.floor(Math.random() * 3);
  let result = "";
  for (let i = 0; i < length; i += 1) {
    result += NAME_FRAGMENTS[Math.floor(Math.random() * NAME_FRAGMENTS.length)];
  }
  return result;
}

function setKeyPlaceholder(message = "No key generated yet") {
  keyOutput.innerHTML = `<p class="placeholder">${message}</p>`;
  keyFilename.textContent = "—";
  saveKeyButton.disabled = true;
  saveKeyButton.textContent = "Save file";
  keyHint.textContent = "Keys never leave this device.";
  keyEntropy.textContent = `${KEY_BYTE_LENGTH} bytes (${KEY_BYTE_LENGTH * 8}-bit)`;
  keyState = null;
}

function generateKeyMaterial() {
  const bytes = new Uint8Array(KEY_BYTE_LENGTH);
  crypto.getRandomValues(bytes);
  const hex = bytesToHex(bytes);
  const fileName = gibberishName();

  keyState = { bytes, hex, fileName };
  keyOutput.innerHTML = `<code class="hash-value">${hex}</code>`;
  keyFilename.textContent = fileName;
  saveKeyButton.disabled = false;
  saveKeyButton.textContent = "Save file";
  keyEntropy.textContent = `${bytes.length} bytes (${bytes.length * 8}-bit)`;
  keyHint.textContent = "New key ready. Raw binary with no extension.";
}

async function saveKeyToFile() {
  if (!keyState) {
    return;
  }

  const blob = new Blob([keyState.bytes], { type: "application/octet-stream" });
  const fileName = keyState.fileName;

  try {
    if (window.showSaveFilePicker) {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } else {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    }
    keyHint.textContent = "Key saved to a local file.";
    saveKeyButton.textContent = "Saved!";
    setTimeout(() => {
      saveKeyButton.textContent = "Save file";
    }, 1400);
  } catch (error) {
    console.error("Save failed", error);
    keyHint.textContent = "Unable to save file. Please try again.";
  }
}

generateKeyButton.addEventListener("click", generateKeyMaterial);
saveKeyButton.addEventListener("click", saveKeyToFile);
clearKeyButton.addEventListener("click", () => setKeyPlaceholder());

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("sw.js")
      .catch((error) => console.error("SW registration failed:", error));
  });
}

resetHashPanel();
setKeyPlaceholder();
setActiveTab("hash");
