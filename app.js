const fileInputs = Array.from(document.querySelectorAll(".file-input"));
const dropZones = Array.from(document.querySelectorAll(".file-drop[data-index]"));
const slotResults = Array.from(document.querySelectorAll(".slot-result"));
const slotCopyFullButtons = Array.from(document.querySelectorAll(".slot-copy-full"));
const slotCopyPrefixButtons = Array.from(document.querySelectorAll(".slot-copy-prefix"));
const compareArea = document.getElementById("compare-area");
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

async function hashFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}

function setSlotPlaceholder(index, message) {
  const placeholders = ["Waiting for File A", "Waiting for File B"];
  slotResults[index].innerHTML = `<p class="placeholder">${message || placeholders[index]}</p>`;
  updateSlotCopyButtons(index);
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
  updateSlotCopyButtons(index);
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
}

function updateSlotCopyButtons(index) {
  const state = slotStates[index];
  const fullButton = slotCopyFullButtons[index];
  const prefixButton = slotCopyPrefixButtons[index];
  if (!fullButton || !prefixButton) {
    return;
  }

  if (!state) {
    [fullButton, prefixButton].forEach((button) => {
      button.disabled = true;
      delete button.dataset.hash;
      delete button.dataset.prefix;
      button.textContent =
        button.classList.contains("slot-copy-full") ? "Copy hash" : "Copy first 7";
    });
    return;
  }

  fullButton.disabled = false;
  fullButton.dataset.hash = state.hash;
  fullButton.textContent = "Copy hash";
  prefixButton.disabled = false;
  prefixButton.dataset.prefix = state.hash.slice(0, 7);
  prefixButton.textContent = "Copy first 7";
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
  compareArea.innerHTML = "";
  fileInputs.forEach((input) => {
    input.value = "";
  });
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

slotCopyFullButtons.forEach((button) => {
  const index = Number(button.dataset.index);
  button.addEventListener("click", async () => {
    const state = slotStates[index];
    if (!state) {
      return;
    }
    try {
      await navigator.clipboard.writeText(state.hash);
      button.textContent = "Copied!";
      setTimeout(() => updateSlotCopyButtons(index), 1200);
    } catch (error) {
      console.error("Clipboard error", error);
      button.textContent = "Copy failed";
      setTimeout(() => updateSlotCopyButtons(index), 1200);
    }
  });
});

slotCopyPrefixButtons.forEach((button) => {
  const index = Number(button.dataset.index);
  button.addEventListener("click", async () => {
    const state = slotStates[index];
    if (!state) {
      return;
    }
    const prefix = state.hash.slice(0, 7);
    try {
      await navigator.clipboard.writeText(prefix);
      button.textContent = "Copied!";
      setTimeout(() => updateSlotCopyButtons(index), 1200);
    } catch (error) {
      console.error("Clipboard error", error);
      button.textContent = "Copy failed";
      setTimeout(() => updateSlotCopyButtons(index), 1200);
    }
  });
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

resetHashPanel();
setKeyPlaceholder();
setActiveTab("hash");
