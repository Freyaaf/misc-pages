(function () {
  'use strict';

  // ===== 输入模式切换 =====
  const inputTabs = document.querySelectorAll('.input-tab');
  const pasteArea = document.getElementById('paste-area');
  const fileArea = document.getElementById('file-area');
  const textInput = document.getElementById('text-input');
  const charCount = document.getElementById('char-count');

  inputTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      inputTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      if (tab.dataset.mode === 'paste') {
        pasteArea.classList.remove('hidden');
        fileArea.classList.add('hidden');
      } else {
        pasteArea.classList.add('hidden');
        fileArea.classList.remove('hidden');
      }
      updateGenerateBtn();
    });
  });

  textInput.addEventListener('input', () => {
    charCount.textContent = textInput.value.length;
    updateGenerateBtn();
  });

  // ===== 文件上传 =====
  const fileDrop = document.getElementById('file-drop');
  const fileInput = document.getElementById('file-input');
  const fileInfo = document.getElementById('file-info');
  const fileName = document.getElementById('file-name');
  const fileClear = document.getElementById('file-clear');
  let fileText = '';

  fileDrop.addEventListener('click', () => fileInput.click());

  fileDrop.addEventListener('dragover', e => {
    e.preventDefault();
    fileDrop.classList.add('dragover');
  });
  fileDrop.addEventListener('dragleave', () => fileDrop.classList.remove('dragover'));
  fileDrop.addEventListener('drop', e => {
    e.preventDefault();
    fileDrop.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleFile(fileInput.files[0]);
  });

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      fileText = reader.result;
      fileName.textContent = file.name + ' (' + fileText.length + ' 字)';
      fileInfo.classList.remove('hidden');
      fileDrop.classList.add('hidden');
      updateGenerateBtn();
    };
    reader.readAsText(file);
  }

  fileClear.addEventListener('click', () => {
    fileText = '';
    fileInput.value = '';
    fileInfo.classList.add('hidden');
    fileDrop.classList.remove('hidden');
    updateGenerateBtn();
  });

  // ===== 参数 =====
  const speedSlider = document.getElementById('speed');
  const speedVal = document.getElementById('speed-val');
  const pitchSlider = document.getElementById('pitch');
  const pitchVal = document.getElementById('pitch-val');

  speedSlider.addEventListener('input', () => {
    speedVal.textContent = parseFloat(speedSlider.value).toFixed(1) + 'x';
  });
  pitchSlider.addEventListener('input', () => {
    pitchVal.textContent = pitchSlider.value;
  });

  // ===== 生成按钮状态 =====
  const btnGenerate = document.getElementById('btn-generate');

  function getCurrentText() {
    const mode = document.querySelector('.input-tab.active').dataset.mode;
    return mode === 'paste' ? textInput.value.trim() : fileText.trim();
  }

  function updateGenerateBtn() {
    const text = getCurrentText();
    const hasSettings = localStorage.getItem('tts_api_key') && localStorage.getItem('tts_group_id') && localStorage.getItem('tts_voice_id');
    btnGenerate.disabled = !text || !hasSettings;
  }

  // ===== 设置 =====
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsArrow = document.getElementById('settings-arrow');
  const settingsBody = document.getElementById('settings-body');
  const apiKeyInput = document.getElementById('api-key');
  const groupIdInput = document.getElementById('group-id');
  const voiceIdInput = document.getElementById('voice-id');
  const btnSaveSettings = document.getElementById('btn-save-settings');

  const DEFAULTS = {
    key: 'sk-api-uLFf50ZWsgVKOruyDgepYwFGWVGyvwwTrObS5XiF6JdY7Qyr_rxgOC1267sT9kyqyMlLKbScYfacFWlwqASq0aam1OLA2mO9Yn-dvvJ3n5wrM1vb57NtbQA',
    group: '2039740218591944732',
    voice: 'moss_audio_97acfc72-2ea7-11f1-92d8-d6be2e254d77'
  };

  if (!localStorage.getItem('tts_api_key')) {
    localStorage.setItem('tts_api_key', DEFAULTS.key);
    localStorage.setItem('tts_group_id', DEFAULTS.group);
    localStorage.setItem('tts_voice_id', DEFAULTS.voice);
  }

  apiKeyInput.value = localStorage.getItem('tts_api_key') || '';
  groupIdInput.value = localStorage.getItem('tts_group_id') || '';
  voiceIdInput.value = localStorage.getItem('tts_voice_id') || '';

  if (!apiKeyInput.value) {
    settingsBody.classList.remove('hidden');
    settingsArrow.classList.add('open');
  }

  settingsToggle.addEventListener('click', () => {
    settingsBody.classList.toggle('hidden');
    settingsArrow.classList.toggle('open');
  });

  btnSaveSettings.addEventListener('click', () => {
    localStorage.setItem('tts_api_key', apiKeyInput.value.trim());
    localStorage.setItem('tts_group_id', groupIdInput.value.trim());
    localStorage.setItem('tts_voice_id', voiceIdInput.value.trim());
    showToast('设置已保存');
    settingsBody.classList.add('hidden');
    settingsArrow.classList.remove('open');
    updateGenerateBtn();
  });

  // ===== 生成语音 =====
  const playerCard = document.getElementById('player-card');
  const audio = document.getElementById('audio');
  const playBtn = document.getElementById('play-btn');
  const progressWrap = document.getElementById('progress-wrap');
  const progressBar = document.getElementById('progress-bar');
  const timeDisplay = document.getElementById('time-display');
  const btnDownload = document.getElementById('btn-download');
  const btnAgain = document.getElementById('btn-again');

  let currentBlob = null;
  let generating = false;

  btnGenerate.addEventListener('click', generate);
  btnAgain.addEventListener('click', generate);

  async function generate() {
    if (generating) return;
    const text = getCurrentText();
    if (!text) return;

    const apiKey = localStorage.getItem('tts_api_key');
    const groupId = localStorage.getItem('tts_group_id');
    const voiceId = localStorage.getItem('tts_voice_id');
    if (!apiKey || !groupId || !voiceId) {
      showToast('请先填写 API 设置');
      return;
    }

    generating = true;
    btnGenerate.disabled = true;
    btnGenerate.querySelector('.btn-text').classList.add('hidden');
    btnGenerate.querySelector('.btn-loading').classList.remove('hidden');

    try {
      const resp = await fetch(`https://api.minimax.chat/v1/t2a_v2?GroupId=${groupId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'speech-02-hd',
          text: text,
          stream: false,
          voice_setting: {
            voice_id: voiceId,
            speed: parseFloat(speedSlider.value),
            vol: 1.0,
            pitch: parseInt(pitchSlider.value)
          },
          audio_setting: {
            sample_rate: 32000,
            bitrate: 128000,
            format: 'mp3'
          }
        })
      });

      const data = await resp.json();

      if (data.base_resp && data.base_resp.status_code !== 0) {
        throw new Error(data.base_resp.status_msg || '生成失败');
      }

      if (!data.data || !data.data.audio) {
        throw new Error('返回数据中没有音频');
      }

      // MiniMax 返回的是 hex 编码的音频
      const hexStr = data.data.audio;
      const bytes = new Uint8Array(hexStr.length / 2);
      for (let i = 0; i < hexStr.length; i += 2) {
        bytes[i / 2] = parseInt(hexStr.substr(i, 2), 16);
      }

      currentBlob = new Blob([bytes], { type: 'audio/mpeg' });
      const url = URL.createObjectURL(currentBlob);
      audio.src = url;

      playerCard.classList.remove('hidden');
      audio.load();

      // 保存到历史
      addHistory(text);

      showToast('生成成功');
    } catch (err) {
      showToast('出错了：' + err.message);
    } finally {
      generating = false;
      btnGenerate.querySelector('.btn-text').classList.remove('hidden');
      btnGenerate.querySelector('.btn-loading').classList.add('hidden');
      updateGenerateBtn();
    }
  }

  // ===== 播放控制 =====
  let playing = false;

  playBtn.addEventListener('click', () => {
    if (playing) {
      audio.pause();
    } else {
      audio.play();
    }
  });

  audio.addEventListener('play', () => {
    playing = true;
    playBtn.innerHTML = '&#9646;&#9646;';
  });

  audio.addEventListener('pause', () => {
    playing = false;
    playBtn.innerHTML = '&#9654;';
  });

  audio.addEventListener('ended', () => {
    playing = false;
    playBtn.innerHTML = '&#9654;';
    progressBar.style.width = '0%';
  });

  audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
      progressBar.style.width = (audio.currentTime / audio.duration * 100) + '%';
      timeDisplay.textContent = formatTime(audio.currentTime) + ' / ' + formatTime(audio.duration);
    }
  });

  progressWrap.addEventListener('click', e => {
    if (audio.duration) {
      const rect = progressWrap.getBoundingClientRect();
      const pct = (e.clientX - rect.left) / rect.width;
      audio.currentTime = pct * audio.duration;
    }
  });

  function formatTime(s) {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return m + ':' + String(sec).padStart(2, '0');
  }

  // ===== 下载 =====
  btnDownload.addEventListener('click', () => {
    if (!currentBlob) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(currentBlob);
    const now = new Date();
    const ts = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
      '_',
      String(now.getHours()).padStart(2, '0'),
      String(now.getMinutes()).padStart(2, '0')
    ].join('');
    a.download = '傅副官_' + ts + '.mp3';
    a.click();
    URL.revokeObjectURL(a.href);
  });

  // ===== 历史记录 =====
  const historyList = document.getElementById('history-list');
  const btnClearHistory = document.getElementById('btn-clear-history');

  function getHistory() {
    try { return JSON.parse(localStorage.getItem('tts_history') || '[]'); }
    catch { return []; }
  }

  function saveHistory(list) {
    localStorage.setItem('tts_history', JSON.stringify(list.slice(0, 20)));
  }

  function addHistory(text) {
    const list = getHistory();
    list.unshift({
      text: text.slice(0, 100),
      time: new Date().toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    });
    saveHistory(list);
    renderHistory();
  }

  function renderHistory() {
    const list = getHistory();
    if (!list.length) {
      historyList.innerHTML = '<div class="empty-hint">还没有生成过语音</div>';
      btnClearHistory.classList.add('hidden');
      return;
    }
    btnClearHistory.classList.remove('hidden');
    historyList.innerHTML = list.map((item, i) => `
      <div class="history-item">
        <span class="history-text">${escapeHtml(item.text)}</span>
        <span class="history-time">${item.time}</span>
        <button class="history-play" data-index="${i}" title="填入文字">&#8617;</button>
      </div>
    `).join('');
  }

  historyList.addEventListener('click', e => {
    const btn = e.target.closest('.history-play');
    if (!btn) return;
    const list = getHistory();
    const item = list[btn.dataset.index];
    if (item) {
      textInput.value = item.text;
      charCount.textContent = item.text.length;
      document.querySelector('.input-tab[data-mode="paste"]').click();
      textInput.focus();
      updateGenerateBtn();
    }
  });

  btnClearHistory.addEventListener('click', () => {
    localStorage.removeItem('tts_history');
    renderHistory();
    showToast('已清空');
  });

  renderHistory();

  // ===== Toast =====
  const toast = document.getElementById('toast');
  let toastTimer;

  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.remove('hidden');
    toast.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
      toast.classList.add('hidden');
    }, 2500);
  }

  // ===== Utils =====
  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  updateGenerateBtn();
})();
