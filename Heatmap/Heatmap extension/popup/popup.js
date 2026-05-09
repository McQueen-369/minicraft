'use strict';

const dot = document.getElementById('dot');
const stateIdle = document.getElementById('state-idle');
const stateRecording = document.getElementById('state-recording');
const stateReady = document.getElementById('state-ready');

function showState(state) {
  stateIdle.classList.add('hidden');
  stateRecording.classList.add('hidden');
  stateReady.classList.add('hidden');
  dot.classList.remove('recording');

  if (state === 'idle') {
    stateIdle.classList.remove('hidden');
  } else if (state === 'recording') {
    stateRecording.classList.remove('hidden');
    dot.classList.add('recording');
  } else if (state === 'ready') {
    stateReady.classList.remove('hidden');
  }
}

async function loadState() {
  try {
    const resp = await chrome.runtime.sendMessage({ type: 'GET_STATE' });
    if (resp && resp.isRecording) {
      showState('recording');
    } else if (resp && resp.hasSession) {
      showState('ready');
    } else {
      showState('idle');
    }
  } catch {
    showState('idle');
  }
}

document.getElementById('btn-start').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  await chrome.runtime.sendMessage({ type: 'START_SESSION', tabId: tab.id });
  showState('recording');
});

document.getElementById('btn-stop').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'STOP_SESSION' });
  showState('ready');
});

document.getElementById('btn-start-new').addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) return;
  await chrome.runtime.sendMessage({ type: 'START_SESSION', tabId: tab.id });
  showState('recording');
});

document.getElementById('btn-view').addEventListener('click', () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('viewer/viewer.html') });
});

document.getElementById('btn-download').addEventListener('click', async () => {
  await chrome.runtime.sendMessage({ type: 'DOWNLOAD_ZIP' });
});

loadState();
