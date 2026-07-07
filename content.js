// Volume Booster Content Script
// by Ayush Acharya — ayushacharya5.com.np

(function () {
  if (window.__volumeBoosterInjected) return;
  window.__volumeBoosterInjected = true;

  let audioCtx = null;
  let gainNodes = new WeakMap();
  let processedElements = new Set();
  let globalGain = 1.0;
  let boosterEnabled = true;

  function getOrCreateAudioCtx() {
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  function boostElement(el) {
    if (processedElements.has(el)) {
      // Update existing gain node
      if (gainNodes.has(el)) {
        const gain = gainNodes.get(el);
        gain.gain.setTargetAtTime(
          boosterEnabled ? globalGain : 1.0,
          audioCtx.currentTime,
          0.05
        );
      }
      return;
    }

    try {
      const ctx = getOrCreateAudioCtx();
      const source = ctx.createMediaElementSource(el);
      const gainNode = ctx.createGain();
      gainNode.gain.value = boosterEnabled ? globalGain : 1.0;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      gainNodes.set(el, gainNode);
      processedElements.add(el);
    } catch (e) {
      // Element may already have a source node — ignore
    }
  }

  function applyToAll() {
    const elements = document.querySelectorAll('audio, video');
    elements.forEach(boostElement);
  }

  // Intercept dynamically created media elements
  const OrigHTMLMediaElement = HTMLMediaElement;
  const origPlay = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    boostElement(this);
    return origPlay.apply(this, arguments);
  };

  // MutationObserver to catch late-injected media
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeName === 'AUDIO' || node.nodeName === 'VIDEO') {
          boostElement(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll('audio, video').forEach(boostElement);
        }
      });
    });
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // Message listener from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'setVolume') {
      globalGain = message.volume;
      boosterEnabled = message.enabled;
      applyToAll();

      // Also update any already processed elements
      processedElements.forEach(el => {
        if (gainNodes.has(el)) {
          const ctx = getOrCreateAudioCtx();
          gainNodes.get(el).gain.setTargetAtTime(
            boosterEnabled ? globalGain : 1.0,
            ctx.currentTime,
            0.05
          );
        }
      });

      sendResponse({ success: true, volume: globalGain });
    }
    return true;
  });

  // Initial scan
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyToAll);
  } else {
    applyToAll();
  }
})();
