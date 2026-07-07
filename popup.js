// Volume Booster Popup Script
// by Ayush Acharya — ayushacharya5.com.np

const slider = document.getElementById('volSlider');
const volNumber = document.getElementById('volNumber');
const ringFill = document.getElementById('ringFill');
const ringGlow = document.getElementById('ringGlow');
const powerBtn = document.getElementById('powerBtn');
const statusPill = document.getElementById('statusPill');
const statusText = document.getElementById('statusText');
const eqBars = document.getElementById('eqBars');
const presetChips = document.querySelectorAll('.preset-chip');
const toast = document.getElementById('toast');

const CIRCUMFERENCE = 2 * Math.PI * 50; // r=50
let isActive = true;
let currentVolume = 100;

function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 1800);
}

function updateRing(value) {
  const pct = value / 600;
  const offset = CIRCUMFERENCE * (1 - pct);
  ringFill.style.strokeDashoffset = offset;
  ringGlow.style.strokeDashoffset = offset;

  // Color shift: indigo at low, pink at high
  if (value <= 100) {
    ringFill.style.stroke = 'url(#ringGrad)';
  } else if (value >= 400) {
    ringFill.style.stroke = '#f0468a';
  } else {
    ringFill.style.stroke = 'url(#ringGrad)';
  }
}

function updateVolume(value) {
  currentVolume = value;
  volNumber.textContent = value;
  updateRing(value);

  // Update EQ animation speed based on volume
  const bars = document.querySelectorAll('.eq-bar');
  const speedFactor = Math.max(0.2, 1 - (value / 600) * 0.7);
  bars.forEach(bar => {
    const baseDur = parseFloat(bar.style.getPropertyValue('--dur'));
    bar.style.animationDuration = (baseDur * speedFactor) + 's';
  });

  // Sync preset chips
  presetChips.forEach(chip => {
    chip.classList.toggle('active', parseInt(chip.dataset.val) === value);
  });
}

function applyVolumeToTab(volume) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      action: 'setVolume',
      volume: volume / 100,
      enabled: isActive
    }, (response) => {
      if (chrome.runtime.lastError) {
        // Inject content script if not loaded
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ['content.js']
        }, () => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tabs[0].id, {
              action: 'setVolume',
              volume: volume / 100,
              enabled: isActive
            });
          }, 200);
        });
      }
    });
  });
}

function setActive(active) {
  isActive = active;
  if (active) {
    powerBtn.classList.add('active');
    powerBtn.querySelector('svg').style.stroke = '#5b6ef5';
    statusPill.classList.remove('off');
    statusText.textContent = 'ACTIVE — TAB BOOSTED';
    eqBars.classList.remove('paused');
    applyVolumeToTab(currentVolume);
    showToast('⚡ Booster ON');
  } else {
    powerBtn.classList.remove('active');
    powerBtn.querySelector('svg').style.stroke = '#c0c8e0';
    statusPill.classList.add('off');
    statusText.textContent = 'INACTIVE — BYPASSED';
    eqBars.classList.add('paused');
    applyVolumeToTab(100); // reset to 100%
    showToast('⏸ Booster OFF');
  }
  chrome.storage.local.set({ isActive });
}

// Slider input
slider.addEventListener('input', () => {
  const val = parseInt(slider.value);
  updateVolume(val);
  if (isActive) applyVolumeToTab(val);
  chrome.storage.local.set({ volume: val });
});

// Power button
powerBtn.addEventListener('click', () => setActive(!isActive));

// Preset chips
presetChips.forEach(chip => {
  chip.addEventListener('click', () => {
    const val = parseInt(chip.dataset.val);
    slider.value = val;
    updateVolume(val);
    if (isActive) applyVolumeToTab(val);
    chrome.storage.local.set({ volume: val });
    showToast(`Set to ${val}%`);
  });
});

// Load saved state
chrome.storage.local.get(['volume', 'isActive'], (data) => {
  const savedVol = data.volume ?? 100;
  const savedActive = data.isActive ?? true;
  slider.value = savedVol;
  updateVolume(savedVol);
  isActive = !savedActive; // toggle to trigger proper UI update
  setActive(savedActive);
});
