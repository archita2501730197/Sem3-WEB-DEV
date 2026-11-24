// ═══════════════════════════════════════════════════════════
//  SNAPCHAT FOR WEB - Client Application (Full Website)
// ═══════════════════════════════════════════════════════════

const socket = io();

// ─── Application State ───
let currentUser = null;
let allUsers = [];
let onlineUsers = [];
let chatPartner = null;
let conversations = {};
let unread = {};

// Media Recording & Camera
let mediaRecorder = null;
let recordedAudioChunks = [];
let recordingTimerInterval = null;
let recordingSeconds = 0;
let cameraStream = null;
let currentFacingMode = 'user';
let activeFilter = 'normal';
let isFlashActive = false;
let selectedRecipients = new Set();

// Snap Map (Leaflet)
let snapMap = null;
let mapMarkers = {};
let userLocation = { lat: 28.6139, lng: 77.2090 };

// WebRTC Calls
let peerConnection = null;
let localStream = null;
let activeCallType = null;
let callDurationTimer = null;
let callDurationSecs = 0;
let isAudioMuted = false;
let isVideoDisabled = false;

// Sticker Collection
const stickerLibrary = {
  emoji: ['😀','😂','🤣','😍','🥰','😘','😎','🤩','🥳','😇','🙃','😋','🤪','😜','🤑','🤗','🤔','😏','🙄','😬','😌','🥺','😢','😭','😤','😡','🤯','🥵','🥶','😱'],
  love: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💕','💞','💓','💗','💖','💘','💝','😍','🥰','😘','💋','💐','🌹','🌷','🌸','💮'],
  fun: ['🎉','🎊','🎈','🎁','🎀','🎪','🎨','🎬','🎤','🎧','🎵','🎶','🎸','🎲','🎯','🎳','🎮','🕹️','🎰','🏆','🥇','🍿','🍕','🌮'],
  animals: ['🐶','🐱','🐭','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦉','🦄','🐝','🦋'],
  food: ['🍕','🍔','🍟','🌭','🥪','🌮','🌯','🧁','🍰','🎂','🍩','🍪','🍫','🍬','🍭','☕','🧋','🥤','🍺','🥂','🍾','🍿','🥨','🥞'],
};

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ═══════════════════════════════════════════════════════════
//  1. ONBOARDING & LOGIN LOGIC
// ═══════════════════════════════════════════════════════════

// Clean stale or invalid snap_user cache on load
try {
  const saved = localStorage.getItem('snap_user');
  if (saved) {
    const parsed = JSON.parse(saved);
    if (!parsed || !parsed.displayName || parsed.displayName.toLowerCase().includes('snapchatter')) {
      localStorage.removeItem('snap_user');
    }
  }
} catch (e) {
  try { localStorage.removeItem('snap_user'); } catch (_) {}
}

// Avatar selection chips
$$('.avatar-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    $$('.avatar-chip').forEach(c => c.classList.remove('selected'));
    chip.classList.add('selected');
  });
});

$('#toggle-quick-users-btn')?.addEventListener('click', () => {
  $('#quick-users-drawer')?.classList.toggle('hidden');
});

$('#reg-name')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#signup-btn')?.click();
  }
});

$('#reg-username')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#signup-btn')?.click();
  }
});

$('#signup-btn')?.addEventListener('click', () => {
  const name = $('#reg-name').value.trim();
  const rawUsername = $('#reg-username').value.trim();
  const selectedChip = $('.avatar-chip.selected');

  if (!name) {
    showToast('Please enter your name! 😊');
    $('#reg-name').focus();
    return;
  }

  const username = rawUsername || name.toLowerCase().replace(/\s+/g, '_');
  const avatar = selectedChip?.dataset.avatar || '😎';
  const bitmoji = selectedChip?.dataset.bitmoji || '✨';

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        socket.emit('register-user', { name, username, avatar, bitmoji, ...userLocation });
      },
      () => {
        socket.emit('register-user', { name, username, avatar, bitmoji, ...userLocation });
      },
      { timeout: 2500 }
    );
  } else {
    socket.emit('register-user', { name, username, avatar, bitmoji, ...userLocation });
  }
});

function renderQuickUsers(users) {
  const grid = $('#user-grid');
  if (!grid) return;

  grid.innerHTML = users.slice(0, 20).map(u => `
    <div class="user-card" data-id="${u.id}">
      <span class="avatar">${u.avatar}</span>
      <span class="name">${u.displayName.split(' ')[0]}</span>
    </div>
  `).join('');

  grid.querySelectorAll('.user-card').forEach(card => {
    card.addEventListener('click', () => {
      socket.emit('login', card.dataset.id);
    });
  });
}

// ═══════════════════════════════════════════════════════════
//  2. SOCKET.IO EVENT HANDLERS
// ═══════════════════════════════════════════════════════════

// ─── Socket Connection ───
socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
  // Re-attach if already logged in during active session
  if (currentUser && currentUser.id) {
    socket.emit('reconnect-user', currentUser.id);
  }
});

socket.on('all-users', (users) => {
  allUsers = users;
  renderQuickUsers(users);
  renderChatList();
  renderStories();
  updateMapMarkers();
});

socket.on('online-users', (users) => {
  onlineUsers = users;
  renderChatList();
  updateMapMarkers();
});

socket.on('login-success', (user) => {
  currentUser = user;
  try {
    localStorage.setItem('snap_user', JSON.stringify(user));
  } catch (e) {}

  // Single Screen Website Switch: HIDE login page, SHOW web app
  $('#login-screen').classList.add('hidden');
  $('#app-screen').classList.remove('hidden');

  // Populate header profile
  $('#my-header-avatar').textContent = user.bitmoji || user.avatar;
  $('#my-header-name').textContent = user.displayName;
  $('#my-header-streak').textContent = user.streak || 64;
  $('#my-story-avatar').textContent = user.avatar;
  if ($('#sim-face-emoji')) $('#sim-face-emoji').textContent = user.avatar;
  updateProfile();

  showToast(`Welcome to Snapchat Web, ${user.displayName}! 👻`);

  // Default view: Chat
  switchWebPanel('chat-view');
  initSnapMap();
});

socket.on('user-joined', (name) => {
  showToast(`${name} is online 🟢`);
});

socket.on('user-left', (name) => {
  showToast(`${name} went offline`);
});

// Messages
socket.on('private-message', (data) => {
  if (!conversations[data.from]) conversations[data.from] = [];
  conversations[data.from].push({ ...data, direction: 'received' });

  if (chatPartner && (chatPartner.id === data.from || chatPartner.username === data.from)) {
    renderMessage(data, 'received');
    scrollToBottom();
  } else {
    unread[data.from] = (unread[data.from] || 0) + 1;
    showToast(`${data.fromName}: ${data.type === 'text' ? data.message : 'Sent you a media 📸'}`);
  }
  renderChatList();
});

socket.on('message-sent', (data) => {
  const list = conversations[data.to] || [];
  const exists = list.some(m => m.timestamp === data.timestamp && m.message === data.message);
  if (!exists) {
    if (!conversations[data.to]) conversations[data.to] = [];
    conversations[data.to].push({ ...data, direction: 'sent' });
    if (chatPartner && chatPartner.id === data.to) {
      renderMessage(data, 'sent');
      scrollToBottom();
    }
  }
  renderChatList();
});

// Snaps (Does NOT open fullscreen directly! Receiver sees "New Snap • Tap to View")
socket.on('receive-snap', (data) => {
  showToast(`📸 New Snap from ${data.fromName}! Click in chat to view`);
  const snapObj = {
    ...data,
    type: 'camera',
    message: data.imageData,
    direction: 'received',
    opened: false,
  };

  if (!conversations[data.from]) conversations[data.from] = [];
  conversations[data.from].push(snapObj);

  unread[data.from] = (unread[data.from] || 0) + 1;
  renderChatList();

  // If chat is currently open, render the unopened snap card
  if (chatPartner && (chatPartner.id === data.from || chatPartner.username === data.from)) {
    renderMessage(snapObj, 'received');
    scrollToBottom();
  }
});

socket.on('snap-sent', () => {
  showToast('Snap Delivered! 🔺');
});

// Typing
socket.on('user-typing', (data) => {
  if (chatPartner && chatPartner.id === data.from) {
    $('#typing-friend-name').textContent = data.fromName.split(' ')[0];
    $('#typing-indicator').classList.remove('hidden');
  }
});

socket.on('user-stop-typing', (data) => {
  if (chatPartner && chatPartner.id === data.from) {
    $('#typing-indicator').classList.add('hidden');
  }
});

// Calls (WebRTC)
socket.on('incoming-call', (data) => {
  playRingtone();
  $('#incoming-avatar').textContent = data.fromAvatar;
  $('#incoming-name').textContent = data.fromName;
  $('#incoming-type').textContent = data.callType === 'video' ? '📹 Incoming Video Call...' : '📞 Incoming Voice Call...';
  $('#incoming-call').classList.remove('hidden');
  activeCallType = data.callType;

  $('#incoming-call').dataset.from = data.from;
  $('#incoming-call').dataset.offer = JSON.stringify(data.offer);
});

socket.on('call-answered', async (data) => {
  stopRingtone();
  if (peerConnection) {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
    $('#call-status').textContent = 'Connected 🟢';
    startCallTimer();
  }
});

socket.on('ice-candidate', async (data) => {
  if (peerConnection && data.candidate) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
    } catch (e) {
      console.warn('ICE error', e);
    }
  }
});

socket.on('call-ended', () => {
  endCallSession();
  showToast('Call ended');
});

socket.on('call-rejected', () => {
  endCallSession();
  showToast('Friend declined call');
});

socket.on('call-unavailable', (data) => {
  $('#call-status').textContent = `${data.friendName} is away. Left missed call snap! 📸`;
  setTimeout(() => endCallSession(), 2500);
});

// ═══════════════════════════════════════════
//  3. WEBSITE PANEL NAVIGATION
// ═══════════════════════════════════════════

function switchWebPanel(panelId) {
  $$('.content-panel').forEach(p => p.classList.remove('active'));
  const target = $(`#${panelId}`);
  if (target) target.classList.add('active');

  $$('.nav-tab-btn').forEach(btn => btn.classList.remove('active'));
  const activeTab = $(`.nav-tab-btn[data-view="${panelId}"]`);
  if (activeTab) activeTab.classList.add('active');

  if (panelId === 'map-view') {
    setTimeout(() => {
      if (snapMap) snapMap.invalidateSize();
    }, 200);
  } else if (panelId === 'camera-view') {
    isSimulatedCamera = false;
    initLaptopCamera();
  } else {
    stopCameraStream();
  }
}

$$('.nav-tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    switchWebPanel(btn.dataset.view);
  });
});

$('#empty-open-camera')?.addEventListener('click', () => switchWebPanel('camera-view'));
$('#empty-open-map')?.addEventListener('click', () => switchWebPanel('map-view'));

// Profile Modal open / close
$('#open-profile-btn')?.addEventListener('click', () => {
  $('#profile-modal').classList.remove('hidden');
});

$('#close-profile-modal')?.addEventListener('click', () => {
  $('#profile-modal').classList.add('hidden');
});

function logoutUser() {
  try {
    localStorage.removeItem('snap_user');
    sessionStorage.clear();
  } catch (e) {}

  if (currentUser) {
    socket.emit('user-logout');
  }

  currentUser = null;
  chatPartner = null;
  conversations = {};
  unread = {};

  if ($('#reg-name')) $('#reg-name').value = '';
  if ($('#reg-username')) $('#reg-username').value = '';

  $('#profile-modal')?.classList.add('hidden');
  $('#call-screen')?.classList.add('hidden');
  $('#snap-viewer')?.classList.add('hidden');
  $('#app-screen')?.classList.add('hidden');
  $('#login-screen')?.classList.remove('hidden');

  showToast('Logged out successfully! 👋');
}

$('#logout-btn')?.addEventListener('click', logoutUser);
$('#logout-shortcut-btn')?.addEventListener('click', logoutUser);

// ═══════════════════════════════════════════
//  4. CHAT LIST (ALL 20 DEFAULT USERS)
// ═══════════════════════════════════════════

function renderChatList() {
  const container = $('#chat-list');
  if (!container) return;

  const search = $('#chat-search')?.value?.toLowerCase() || '';
  const friends = allUsers.filter(u => u.id !== currentUser?.id);
  $('#friends-count').textContent = friends.length;

  const filtered = friends.filter(u =>
    u.displayName.toLowerCase().includes(search) ||
    u.username.toLowerCase().includes(search)
  );

  // Sort online users to the top
  filtered.sort((a, b) => {
    const aOnline = onlineUsers.some(ou => ou.id === a.id);
    const bOnline = onlineUsers.some(ou => ou.id === b.id);
    if (aOnline && !bOnline) return -1;
    if (!aOnline && bOnline) return 1;
    return 0;
  });

  container.innerHTML = filtered.map(user => {
    const isOnline = onlineUsers.some(ou => ou.id === user.id);
    const unreadCount = unread[user.id] || 0;
    const msgs = conversations[user.id] || [];
    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;

    let statusText = isOnline ? '🟢 Online now' : 'Tap to chat';
    let statusIconHtml = isOnline
      ? `<span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:var(--snap-green); box-shadow:0 0 6px var(--snap-green);"></span>`
      : `<span class="snap-icon-square red-border"></span>`;

    if (lastMsg) {
      if (lastMsg.type === 'camera' || lastMsg.type === 'image') {
        statusIconHtml = `<span class="snap-icon-square red-filled"></span>`;
        statusText = lastMsg.direction === 'sent' ? 'Delivered snap' : 'New Snap';
      } else if (lastMsg.type === 'voice') {
        statusIconHtml = `<span class="snap-icon-square purple-filled"></span>`;
        statusText = 'Voice note';
      } else {
        statusIconHtml = `<i class="fas fa-comment" style="color:var(--snap-blue); font-size:11px;"></i>`;
        statusText = lastMsg.message.substring(0, 24) + (lastMsg.message.length > 24 ? '...' : '');
      }
    }

    const isActiveChat = chatPartner && chatPartner.id === user.id;

    return `
      <div class="friend-row ${isActiveChat ? 'active-chat' : ''}" data-id="${user.id}">
        <div class="avatar-wrapper">
          <span class="friend-avatar">${user.avatar}</span>
          ${isOnline ? '<span class="online-dot"></span>' : ''}
        </div>
        <div class="friend-row-info">
          <div class="friend-row-top">
            <span class="friend-name">${user.displayName}</span>
            <span class="friend-streak"><i class="fas fa-fire"></i> ${user.streak || 15}</span>
            ${isOnline ? '<span style="background:#E8F8F0; color:#10B981; font-size:10px; font-weight:700; padding:1px 6px; border-radius:10px;">LIVE</span>' : ''}
          </div>
          <div class="friend-status-text">
            ${statusIconHtml}
            <span>${statusText}</span>
            <span>• ${user.city ? user.city.split(' ')[0] : 'Nearby'}</span>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:4px;">
          ${isOnline ? `
            <button class="quick-call-shortcut-btn" data-call-id="${user.id}" data-type="video" title="Video Call" style="background:none; border:none; color:var(--snap-blue); font-size:16px; cursor:pointer; padding:6px; border-radius:50%;">
              <i class="fas fa-video"></i>
            </button>
          ` : ''}
          <button class="quick-snap-btn" data-snap-id="${user.id}" title="Snap friend">
            <i class="fas fa-camera"></i>
          </button>
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.friend-row').forEach(row => {
    row.addEventListener('click', (e) => {
      const callBtn = e.target.closest('.quick-call-shortcut-btn');
      if (callBtn) {
        const friend = allUsers.find(u => u.id === callBtn.dataset.callId);
        if (friend) {
          chatPartner = friend;
          initiateCall(callBtn.dataset.type);
        }
        return;
      }
      if (e.target.closest('.quick-snap-btn')) {
        const friendId = row.dataset.id;
        selectedRecipients.clear();
        selectedRecipients.add(friendId);
        switchWebPanel('camera-view');
        showToast('Take snap to send 📸');
        return;
      }
      openConversation(row.dataset.id);
    });
  });

  renderStoriesTray();
}

$('#chat-search')?.addEventListener('input', renderChatList);

function renderStoriesTray() {
  const tray = $('#friends-stories-tray');
  if (!tray) return;

  const friends = allUsers.filter(u => u.id !== currentUser?.id).slice(0, 10);
  tray.innerHTML = friends.map(u => `
    <div class="story-circle" data-id="${u.id}">
      <div class="story-avatar-wrap">
        <span>${u.bitmoji || u.avatar}</span>
      </div>
      <span>${u.displayName.split(' ')[0]}</span>
    </div>
  `).join('');

  tray.querySelectorAll('.story-circle').forEach(b => {
    b.addEventListener('click', () => {
      const u = allUsers.find(user => user.id === b.dataset.id);
      if (u) {
        openSnapViewer({
          fromName: u.displayName,
          fromAvatar: u.avatar,
          imageData: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80',
          caption: `${u.statusMsg || 'Vibing on Snapchat ✨'}`,
        });
      }
    });
  });
}

// ═══════════════════════════════════════════
//  5. CHAT CONVERSATION VIEW
// ═══════════════════════════════════════════

function openConversation(userId) {
  const friend = allUsers.find(u => u.id === userId);
  if (!friend) return;

  chatPartner = friend;
  unread[userId] = 0;

  // Make sure we are on Chat view
  switchWebPanel('chat-view');

  // Toggle from empty state to conversation panel
  $('#chat-empty-state').classList.add('hidden');
  $('#active-conversation').classList.remove('hidden');

  $('#chat-partner-name').textContent = friend.displayName;
  $('#chat-partner-avatar').textContent = friend.avatar;
  $('#chat-partner-streak').innerHTML = `<i class="fas fa-fire"></i> ${friend.streak || 24}`;

  const isOnline = onlineUsers.some(u => u.id === userId);
  $('#chat-partner-status').textContent = isOnline ? 'Active now 🟢' : (friend.statusMsg || 'Active 10m ago');

  const container = $('#chat-messages');
  container.innerHTML = '';

  const history = conversations[userId] || [];
  if (history.length === 0) {
    const welcome = document.createElement('div');
    welcome.style.cssText = 'text-align:center; padding: 40px; color:#888; font-size:13px; margin: auto;';
    welcome.innerHTML = `
      <div style="font-size:54px; margin-bottom:8px;">${friend.bitmoji || '👻'}</div>
      <p style="font-size:16px; font-weight:700; color:#111;">You and ${friend.displayName} are friends!</p>
      <p style="margin-top:4px;">Send a message, snap, or sticker to keep your 🔥 ${friend.streak || 14} streak!</p>
    `;
    container.appendChild(welcome);
  } else {
    history.forEach(m => renderMessage(m, m.direction));
  }

  renderChatList();
  scrollToBottom();
  $('#message-input').focus();
}

function renderMessage(data, direction) {
  const container = $('#chat-messages');
  const time = new Date(data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (data.type === 'sticker') {
    const bubble = document.createElement('div');
    bubble.className = `bubble bubble-sticker ${direction}`;
    bubble.innerHTML = `${data.message}`;
    container.appendChild(bubble);
  } else if (data.type === 'camera') {
    // Exact Snapchat Snap card: Doesn't open automatically! Receiver taps to view.
    const snapCard = document.createElement('div');
    if (direction === 'sent') {
      snapCard.className = 'snap-bubble-card sent';
      snapCard.innerHTML = `
        <div class="snap-card-icon delivered">
          <i class="fas fa-play"></i>
        </div>
        <div class="snap-card-text">
          <strong>Delivered Snap</strong>
          <span>Sent • ${time} (Click to preview)</span>
        </div>
      `;
      snapCard.onclick = () => openImageViewer(data.message);
    } else {
      snapCard.className = `snap-bubble-card received ${data.opened ? 'opened' : 'unopened'}`;
      snapCard.id = `snap-item-${data.timestamp}`;
      snapCard.innerHTML = `
        <div class="snap-card-icon ${data.opened ? 'red-hollow' : 'red-solid'}">
          <i class="fas ${data.opened ? 'fa-square' : 'fa-fire'}"></i>
        </div>
        <div class="snap-card-text">
          <strong>${data.opened ? 'Opened Snap' : 'New Snap 🔥'}</strong>
          <span>${data.opened ? 'Opened • ' + time : 'Tap to open • 10s'}</span>
        </div>
      `;
      snapCard.onclick = () => {
        data.opened = true;
        snapCard.className = 'snap-bubble-card received opened';
        const iconDiv = snapCard.querySelector('.snap-card-icon');
        if (iconDiv) {
          iconDiv.className = 'snap-card-icon red-hollow';
          iconDiv.innerHTML = '<i class="fas fa-square"></i>';
        }
        const textSpan = snapCard.querySelector('.snap-card-text');
        if (textSpan) {
          textSpan.innerHTML = `<strong>Opened Snap</strong><span>Opened • ${time}</span>`;
        }
        openSnapViewer(data);
      };
    }
    container.appendChild(snapCard);
  } else if (data.type === 'image') {
    const bubble = document.createElement('div');
    bubble.className = `bubble ${direction}`;
    bubble.innerHTML = `
      <img src="${data.message}" alt="Picture" onclick="openImageViewer('${data.message}')" />
      <span class="bubble-time">${time}</span>
    `;
    container.appendChild(bubble);
  } else if (data.type === 'voice') {
    const bubble = document.createElement('div');
    bubble.className = `bubble ${direction}`;
    bubble.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <i class="fas fa-play-circle" style="font-size:24px; cursor:pointer;" onclick="this.nextElementSibling.play()"></i>
        <audio controls src="${data.message}" style="max-width:200px; height:32px;"></audio>
      </div>
      <span class="bubble-time">${time}</span>
    `;
    container.appendChild(bubble);
  } else {
    const bubble = document.createElement('div');
    bubble.className = `bubble ${direction}`;
    bubble.innerHTML = `
      <span>${data.message}</span>
      <span class="bubble-time">${time}</span>
    `;
    container.appendChild(bubble);
  }
}

function scrollToBottom() {
  setTimeout(() => {
    const el = $('#chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }, 50);
}

// Send Text - Optimistic Instant Rendering
function sendTextMessage() {
  const input = $('#message-input');
  const text = input.value.trim();
  if (!text || !chatPartner) return;

  const msgData = {
    from: currentUser ? currentUser.id : 'me',
    fromName: currentUser ? currentUser.displayName : 'Me',
    fromAvatar: currentUser ? currentUser.avatar : '😎',
    to: chatPartner.id,
    message: text,
    type: 'text',
    timestamp: Date.now(),
    direction: 'sent',
  };

  // 1. Immediately store in conversation
  if (!conversations[chatPartner.id]) conversations[chatPartner.id] = [];
  conversations[chatPartner.id].push(msgData);

  // 2. Immediately render on screen
  renderMessage(msgData, 'sent');
  scrollToBottom();
  renderChatList();

  // 3. Reset input field
  input.value = '';
  $('#send-msg-btn').classList.add('hidden');
  $('#voice-msg-btn').classList.remove('hidden');

  // 4. Send over WebSocket
  socket.emit('private-message', msgData);
}

$('#send-msg-btn')?.addEventListener('click', sendTextMessage);
$('#message-input')?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendTextMessage();
});

$('#message-input')?.addEventListener('input', () => {
  const val = $('#message-input').value.trim();
  if (val) {
    $('#send-msg-btn').classList.remove('hidden');
    $('#voice-msg-btn').classList.add('hidden');
  } else {
    $('#send-msg-btn').classList.add('hidden');
    $('#voice-msg-btn').classList.remove('hidden');
  }

  if (chatPartner) {
    socket.emit('typing', { to: chatPartner.id });
    clearTimeout($('#message-input')._typingTimeout);
    $('#message-input')._typingTimeout = setTimeout(() => {
      socket.emit('stop-typing', { to: chatPartner.id });
    }, 1200);
  }
});

// Attach Picture from Device
$('#attach-btn')?.addEventListener('click', () => {
  $('#image-file-input').click();
});

$('#image-file-input')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file || !chatPartner) return;

  const reader = new FileReader();
  reader.onload = () => {
    socket.emit('private-message', {
      to: chatPartner.id,
      message: reader.result,
      type: 'image',
    });
  };
  reader.readAsDataURL(file);
  $('#image-file-input').value = '';
});

// Quick Camera snap button in chat
$('#camera-msg-btn')?.addEventListener('click', () => {
  if (chatPartner) {
    selectedRecipients.clear();
    selectedRecipients.add(chatPartner.id);
  }
  switchWebPanel('camera-view');
});

// ═══════════════════════════════════════════
//  6. VOICE RECORDING
// ═══════════════════════════════════════════

$('#voice-msg-btn')?.addEventListener('click', async () => {
  if (!chatPartner) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    recordedAudioChunks = [];
    recordingSeconds = 0;

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedAudioChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      if (recordedAudioChunks.length > 0) {
        const audioBlob = new Blob(recordedAudioChunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          socket.emit('private-message', {
            to: chatPartner.id,
            message: reader.result,
            type: 'voice',
          });
        };
        reader.readAsDataURL(audioBlob);
      }
      $('#voice-recording-overlay').classList.add('hidden');
      clearInterval(recordingTimerInterval);
    };

    mediaRecorder.start();
    $('#voice-recording-overlay').classList.remove('hidden');

    recordingTimerInterval = setInterval(() => {
      recordingSeconds++;
      const mins = Math.floor(recordingSeconds / 60);
      const secs = recordingSeconds % 60;
      $('#recording-time').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    }, 1000);
  } catch (err) {
    showToast('Please allow microphone access in your browser settings.');
  }
});

$('#finish-recording')?.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') mediaRecorder.stop();
});

$('#cancel-recording')?.addEventListener('click', () => {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    recordedAudioChunks = [];
    mediaRecorder.stop();
  }
  $('#voice-recording-overlay').classList.add('hidden');
  clearInterval(recordingTimerInterval);
});

// ═══════════════════════════════════════════
//  7. STICKERS
// ═══════════════════════════════════════════

$('#sticker-btn')?.addEventListener('click', () => {
  $('#sticker-picker').classList.toggle('hidden');
  loadStickerCategory('emoji');
});

$('#close-stickers')?.addEventListener('click', () => {
  $('#sticker-picker').classList.add('hidden');
});

$$('.sticker-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('.sticker-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    loadStickerCategory(tab.dataset.tab);
  });
});

function loadStickerCategory(category) {
  const items = stickerLibrary[category] || [];
  const grid = $('#sticker-grid');
  if (!grid) return;

  grid.innerHTML = items.map(s => `
    <div class="sticker-cell" data-sticker="${s}">${s}</div>
  `).join('');

  grid.querySelectorAll('.sticker-cell').forEach(item => {
    item.addEventListener('click', () => {
      if (!chatPartner) return;
      socket.emit('private-message', {
        to: chatPartner.id,
        message: item.dataset.sticker,
        type: 'sticker',
      });
      $('#sticker-picker').classList.add('hidden');
    });
  });
}

// ═══════════════════════════════════════════
//  8. SNAP MAP (LEAFLET INTERACTIVE MAP)
// ═══════════════════════════════════════════

function initSnapMap() {
  if (snapMap) return;

  const container = $('#snap-map');
  if (!container) return;

  snapMap = L.map('snap-map', {
    zoomControl: true,
    attributionControl: false,
  }).setView([userLocation.lat, userLocation.lng], 13);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
  }).addTo(snapMap);

  $('#recenter-map-btn')?.addEventListener('click', () => {
    if (snapMap) {
      snapMap.flyTo([userLocation.lat, userLocation.lng], 14, { duration: 1.2 });
      showToast('Centered on your location 📍');
    }
  });

  updateMapMarkers();
}

function updateMapMarkers() {
  if (!snapMap) return;

  Object.values(mapMarkers).forEach(m => snapMap.removeLayer(m));
  mapMarkers = {};

  // Current User Marker
  if (currentUser) {
    const userIcon = L.divIcon({
      className: 'custom-icon',
      html: `
        <div class="map-bitmoji-pin">
          <div class="bitmoji-bubble me">${currentUser.bitmoji || '👻'}</div>
          <span class="pin-name-label">Me 📍</span>
        </div>
      `,
      iconSize: [46, 56],
      iconAnchor: [23, 56],
    });

    mapMarkers['me'] = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
      .addTo(snapMap)
      .bindPopup(`<b>You (${currentUser.displayName})</b><br>${currentUser.statusMsg}`);
  }

  // 20 Default Friends on Map
  allUsers.forEach((user, idx) => {
    if (currentUser && user.id === currentUser.id) return;

    const lat = user.lat || (userLocation.lat + (Math.sin(idx * 0.8) * 0.04));
    const lng = user.lng || (userLocation.lng + (Math.cos(idx * 0.8) * 0.05));

    const friendIcon = L.divIcon({
      className: 'custom-icon',
      html: `
        <div class="map-bitmoji-pin">
          <div class="bitmoji-bubble">${user.bitmoji || user.avatar || '👤'}</div>
          <span class="pin-name-label">${user.displayName.split(' ')[0]} 🔥${user.streak || 15}</span>
        </div>
      `,
      iconSize: [44, 54],
      iconAnchor: [22, 54],
    });

    const marker = L.marker([lat, lng], { icon: friendIcon }).addTo(snapMap);
    marker.on('click', () => openMapFriendCard(user));
    mapMarkers[user.id] = marker;
  });
}

function openMapFriendCard(user) {
  $('#sheet-avatar').textContent = user.avatar;
  $('#sheet-name').textContent = user.displayName;
  $('#sheet-status').textContent = `${user.statusMsg || 'Active now'} • ${user.city || 'Nearby'}`;
  $('#sheet-streak').innerHTML = `<i class="fas fa-fire"></i> ${user.streak || 24} streak`;
  $('#sheet-battery').innerHTML = `<i class="fas fa-battery-three-quarters"></i> ${user.battery || 85}%`;

  const modal = $('#map-friend-card');
  modal.classList.remove('hidden');

  $('#sheet-chat-btn').onclick = () => {
    modal.classList.add('hidden');
    openConversation(user.id);
  };

  $('#sheet-snap-btn').onclick = () => {
    modal.classList.add('hidden');
    selectedRecipients.clear();
    selectedRecipients.add(user.id);
    switchWebPanel('camera-view');
  };

  $('#sheet-call-btn').onclick = () => {
    modal.classList.add('hidden');
    chatPartner = user;
    initiateCall('voice');
  };
}

$('#close-sheet-btn')?.addEventListener('click', () => {
  $('#map-friend-card')?.classList.add('hidden');
});

// ═══════════════════════════════════════════════════════════
//  9. LAPTOP CAMERA, LENSES & LIVE SELFIE MODE
// ═══════════════════════════════════════════════════════════

let isSimulatedCamera = false;
let availableVideoDevices = [];
let selectedVideoDeviceId = null;

async function initLaptopCamera() {
  const videoEl = $('#camera-preview');
  const placeholder = $('#camera-placeholder');
  const simView = $('#simulated-viewfinder');
  const conflictBanner = $('#camera-conflict-banner');

  if (isSimulatedCamera) {
    stopCameraStream();
    videoEl.style.display = 'none';
    placeholder.style.display = 'none';
    simView.classList.remove('hidden');
    $('#camera-source-label').textContent = 'Live Selfie Mode';
    updateSimFilterProp();
    return;
  }

  simView.classList.add('hidden');

  try {
    stopCameraStream();

    // Query available video devices
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      availableVideoDevices = devices.filter(d => d.kind === 'videoinput');
    } catch (e) {}

    const constraints = {
      video: selectedVideoDeviceId
        ? { deviceId: { exact: selectedVideoDeviceId } }
        : { width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: false,
    };

    cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
    videoEl.srcObject = cameraStream;
    await videoEl.play();

    placeholder.style.display = 'none';
    videoEl.style.display = 'block';
    $('#camera-source-label').textContent = 'Webcam Active 🟢';
    conflictBanner.classList.add('hidden');

    // Check for black video frames (e.g. privacy shutter closed or another tab locking output)
    setTimeout(() => {
      checkWebcamBlackFrames();
    }, 1200);

  } catch (err) {
    console.warn('Camera initiation failed:', err);

    // Try fallback relaxed constraints
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      videoEl.srcObject = cameraStream;
      await videoEl.play();
      placeholder.style.display = 'none';
      videoEl.style.display = 'block';
      $('#camera-source-label').textContent = 'Webcam Active 🟢';
      conflictBanner.classList.add('hidden');
    } catch (fallbackErr) {
      console.warn('Webcam completely unavailable or blocked:', fallbackErr);
      videoEl.style.display = 'none';
      placeholder.style.display = 'flex';
      $('#camera-source-label').textContent = 'Webcam Blocked ⚠️';

      if (fallbackErr.name === 'NotReadableError') {
        $('#cam-status-title').textContent = 'Webcam in use by another tab!';
        $('#cam-status-desc').textContent = 'Another browser tab (e.g. Tab 3 "Snapchat Clone") or app has locked your webcam. Close it, or click "Use Live Interactive Selfie" below!';
        conflictBanner.classList.remove('hidden');
      } else if (fallbackErr.name === 'NotAllowedError') {
        $('#cam-status-title').textContent = 'Webcam Permission Blocked';
        $('#cam-status-desc').textContent = 'Please click the camera lock icon 🔒 in Chrome address bar to Allow Camera access.';
      }
    }
  }
}

// Black frame detector (detects physical laptop webcam slider closed or conflicting tab)
function checkWebcamBlackFrames() {
  const videoEl = $('#camera-preview');
  if (!videoEl || videoEl.videoWidth === 0 || !cameraStream) return;

  try {
    const testCanvas = document.createElement('canvas');
    testCanvas.width = 16;
    testCanvas.height = 16;
    const ctx = testCanvas.getContext('2d');
    ctx.drawImage(videoEl, 0, 0, 16, 16);
    const data = ctx.getImageData(0, 0, 16, 16).data;
    let totalLuma = 0;
    for (let i = 0; i < data.length; i += 4) {
      totalLuma += (data[i] + data[i+1] + data[i+2]) / 3;
    }
    const avgLuma = totalLuma / (data.length / 4);

    if (avgLuma < 2) {
      // Extremely black frames -> webcam shutter closed or another tab conflicting
      $('#camera-conflict-banner').classList.remove('hidden');
    }
  } catch (e) {}
}

function stopCameraStream() {
  if (cameraStream) {
    cameraStream.getTracks().forEach(t => t.stop());
    cameraStream = null;
  }
}

// Switch between webcam and Live Selfie Mode
function toggleSimulatedMode() {
  isSimulatedCamera = !isSimulatedCamera;
  showToast(isSimulatedCamera ? 'Switched to Live Selfie Mode ✨' : 'Switched to Webcam 📹');
  initLaptopCamera();
}

$('#toggle-sim-mode-btn')?.addEventListener('click', toggleSimulatedMode);
$('#use-live-selfie-btn')?.addEventListener('click', () => {
  isSimulatedCamera = true;
  initLaptopCamera();
});
$('#retry-camera-btn')?.addEventListener('click', () => {
  isSimulatedCamera = false;
  initLaptopCamera();
});
$('#dismiss-conflict-btn')?.addEventListener('click', () => {
  $('#camera-conflict-banner')?.classList.add('hidden');
});

// Flip camera button
$('#flip-camera-btn')?.addEventListener('click', () => {
  if (availableVideoDevices.length > 1) {
    const currIdx = availableVideoDevices.findIndex(d => d.deviceId === selectedVideoDeviceId);
    const nextIdx = (currIdx + 1) % availableVideoDevices.length;
    selectedVideoDeviceId = availableVideoDevices[nextIdx].deviceId;
    showToast(`Switched Camera: ${availableVideoDevices[nextIdx].label || 'Camera ' + (nextIdx+1)}`);
    initLaptopCamera();
  } else {
    toggleSimulatedMode();
  }
});

$('#switch-cam-alt')?.addEventListener('click', toggleSimulatedMode);

$('#sample-photo-btn')?.addEventListener('click', () => $('#laptop-snap-file').click());
$('#upload-snap-shortcut')?.addEventListener('click', () => $('#laptop-snap-file').click());

$('#laptop-snap-file')?.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    $('#snap-image').src = reader.result;
    $('#snap-preview').classList.remove('hidden');
    $('#snap-recipients').classList.add('hidden');
  };
  reader.readAsDataURL(file);
});

$('#flash-toggle')?.addEventListener('click', () => {
  isFlashActive = !isFlashActive;
  $('#flash-toggle').style.color = isFlashActive ? 'var(--snap-yellow)' : 'white';
  showToast(isFlashActive ? 'Flash ON ⚡' : 'Flash OFF');
});

// Update Simulated live props based on filter
function updateSimFilterProp() {
  const propEl = $('#sim-filter-prop');
  if (!propEl) return;
  if (activeFilter === 'puppy') propEl.textContent = '🐶';
  else if (activeFilter === 'sunglasses') propEl.textContent = '🕶️';
  else if (activeFilter === 'golden') propEl.textContent = '✨';
  else if (activeFilter === 'cyberpunk') propEl.textContent = '⚡';
  else propEl.textContent = '';
}

// Lenses Carousel
$$('.lens-pill').forEach(pill => {
  pill.addEventListener('click', () => {
    $$('.lens-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    activeFilter = pill.dataset.filter;

    const overlay = $('#filter-overlay');
    overlay.className = 'filter-overlay ' + (activeFilter !== 'normal' ? activeFilter : '');
    updateSimFilterProp();
  });
});

// Shutter Capture
$('#capture-btn')?.addEventListener('click', () => {
  const videoEl = $('#camera-preview');
  const canvas = $('#camera-canvas');
  const ctx = canvas.getContext('2d');

  if (!isSimulatedCamera && cameraStream && videoEl.videoWidth > 0) {
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    // Mirror horizontally so the saved selfie matches mirror viewfinder
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
    ctx.restore();
    applyFilterToCanvas(ctx, canvas, activeFilter);
    $('#snap-image').src = canvas.toDataURL('image/jpeg', 0.9);
  } else {
    generateSimulatedSnap(canvas, ctx);
    $('#snap-image').src = canvas.toDataURL('image/jpeg', 0.9);
  }

  $('#snap-preview').classList.remove('hidden');
  $('#snap-recipients').classList.add('hidden');
  $('#snap-caption').value = '';
});

function applyFilterToCanvas(ctx, canvas, filter) {
  if (filter === 'bw') {
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      const avg = (d[i] + d[i+1] + d[i+2]) / 3;
      d[i] = avg; d[i+1] = avg; d[i+2] = avg;
    }
    ctx.putImageData(imgData, 0, 0);
  } else if (filter === 'golden') {
    ctx.fillStyle = 'rgba(255, 180, 0, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else if (filter === 'cyberpunk') {
    ctx.fillStyle = 'rgba(0, 255, 255, 0.15)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function generateSimulatedSnap(canvas, ctx) {
  canvas.width = 1280;
  canvas.height = 720;
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#1c1e30');
  gradient.addColorStop(0.5, '#121422');
  gradient.addColorStop(1, '#0a0b14');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw user's avatar
  const avatar = currentUser?.avatar || '😎';
  ctx.font = '120px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(avatar, canvas.width / 2, canvas.height / 2 - 20);

  // Filter prop on snap
  if (activeFilter === 'puppy') {
    ctx.font = '80px sans-serif';
    ctx.fillText('🐶', canvas.width / 2, canvas.height / 2 - 130);
  } else if (activeFilter === 'sunglasses') {
    ctx.font = '80px sans-serif';
    ctx.fillText('🕶️', canvas.width / 2, canvas.height / 2 - 30);
  }

  ctx.fillStyle = 'white';
  ctx.font = 'bold 34px Poppins, sans-serif';
  ctx.fillText(currentUser ? `${currentUser.displayName}'s Snap` : 'Snapchat Moment', canvas.width / 2, canvas.height / 2 + 80);

  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.font = '20px Poppins, sans-serif';
  ctx.fillText(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), canvas.width / 2, canvas.height / 2 + 120);
}

$('#snap-discard')?.addEventListener('click', () => {
  $('#snap-preview').classList.add('hidden');
});

$('#snap-send-btn')?.addEventListener('click', () => {
  renderSnapRecipients();
  $('#snap-recipients').classList.remove('hidden');
});

$('#close-recipients-btn')?.addEventListener('click', () => {
  $('#snap-recipients').classList.add('hidden');
});

function renderSnapRecipients() {
  const container = $('#snap-recipient-list');
  if (!container) return;

  const friends = allUsers.filter(u => u.id !== currentUser?.id);
  const search = $('#recipient-search')?.value?.toLowerCase() || '';
  const filtered = friends.filter(u => u.displayName.toLowerCase().includes(search));

  container.innerHTML = filtered.map(u => {
    const isChecked = selectedRecipients.has(u.id);
    return `
      <div class="recipient-item ${isChecked ? 'selected' : ''}" data-id="${u.id}">
        <span style="font-size:24px;">${u.avatar}</span>
        <div>
          <strong style="font-size:13px; display:block;">${u.displayName}</strong>
          <span style="font-size:11px; opacity:0.7;">🔥 ${u.streak || 15} streak • ${u.city || 'Nearby'}</span>
        </div>
        <div class="check-circle">
          ${isChecked ? '<i class="fas fa-check"></i>' : ''}
        </div>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.recipient-item').forEach(row => {
    row.addEventListener('click', () => {
      const id = row.dataset.id;
      if (selectedRecipients.has(id)) selectedRecipients.delete(id);
      else selectedRecipients.add(id);
      renderSnapRecipients();
    });
  });
}

$('#recipient-search')?.addEventListener('input', renderSnapRecipients);

$('#confirm-send-snap-btn')?.addEventListener('click', () => {
  if (selectedRecipients.size === 0) {
    showToast('Select at least one friend to send snap! 🎯');
    return;
  }

  const imageData = $('#snap-image').src;
  const caption = $('#snap-caption').value.trim();

  // Optimistically store "Delivered Snap" for each recipient
  selectedRecipients.forEach(targetId => {
    const snapMsg = {
      from: currentUser ? currentUser.id : 'me',
      fromName: currentUser ? currentUser.displayName : 'Me',
      to: targetId,
      message: imageData,
      caption: caption,
      type: 'camera',
      timestamp: Date.now(),
      direction: 'sent',
    };
    if (!conversations[targetId]) conversations[targetId] = [];
    conversations[targetId].push(snapMsg);
    if (chatPartner && (chatPartner.id === targetId || chatPartner.username === targetId)) {
      renderMessage(snapMsg, 'sent');
      scrollToBottom();
    }
  });

  socket.emit('send-snap', {
    to: Array.from(selectedRecipients),
    imageData,
    caption,
    filter: activeFilter,
  });

  $('#snap-recipients').classList.add('hidden');
  $('#snap-preview').classList.add('hidden');
  selectedRecipients.clear();
  switchWebPanel('chat-view');
  renderChatList();
  showToast('Snap Delivered! 🔺');
});

// Snap Viewer
function openSnapViewer(data) {
  $('#snap-viewer-image').src = data.imageData || data.message;
  $('#snap-viewer-caption').textContent = data.caption || '';
  $('#snap-viewer-name').textContent = data.fromName || 'Snap';
  $('#snap-viewer-avatar').textContent = data.fromAvatar || '👻';

  const bar = $('#snap-progress-bar');
  bar.style.transition = 'none';
  bar.style.width = '100%';

  $('#snap-viewer').classList.remove('hidden');

  setTimeout(() => {
    bar.style.transition = 'width 10s linear';
    bar.style.width = '0%';
  }, 50);

  clearTimeout(window._snapViewerTimer);
  window._snapViewerTimer = setTimeout(() => {
    $('#snap-viewer').classList.add('hidden');
  }, 10000);
}

$('#close-snap-viewer')?.addEventListener('click', () => {
  $('#snap-viewer').classList.add('hidden');
  clearTimeout(window._snapViewerTimer);
});

function openImageViewer(src) {
  openSnapViewer({
    imageData: src,
    caption: '',
    fromName: 'Shared Picture',
    fromAvatar: '🖼️',
  });
}
window.openImageViewer = openImageViewer;

// ═══════════════════════════════════════════════════════════
//  10. VOICE & VIDEO CALLING (WEBRTC WITH LAPTOP MULTI-TAB SUPPORT)
// ═══════════════════════════════════════════════════════════

const rtcConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

let ringtoneOscillator = null;

function playRingtone() {
  try {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.setValueAtTime(480, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    ringtoneOscillator = { osc, audioCtx };
  } catch (e) {}
}

function stopRingtone() {
  if (ringtoneOscillator) {
    try {
      ringtoneOscillator.osc.stop();
      ringtoneOscillator.audioCtx.close();
    } catch (e) {}
    ringtoneOscillator = null;
  }
}

// Fallback video stream for 2-tab laptop testing
function generateTabVideoStream(label = 'User') {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  let angle = 0;

  function loop() {
    ctx.fillStyle = '#0f111a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#FFFC00';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 + Math.sin(angle) * 12, 70, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '70px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('😎', canvas.width / 2, canvas.height / 2 + Math.sin(angle) * 12 + 24);

    ctx.fillStyle = 'white';
    ctx.font = 'bold 22px Poppins, sans-serif';
    ctx.fillText(label, canvas.width / 2, canvas.height / 2 + 120);

    angle += 0.04;
    requestAnimationFrame(loop);
  }
  loop();
  return canvas.captureStream(30);
}

function generateSilentAudioTrack() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const dst = ctx.createMediaStreamDestination();
    osc.connect(dst);
    osc.start();
    return dst.stream.getAudioTracks()[0];
  } catch (e) {
    return null;
  }
}

$('#voice-call-btn')?.addEventListener('click', () => initiateCall('voice'));
$('#video-call-btn')?.addEventListener('click', () => initiateCall('video'));

async function initiateCall(type) {
  if (!chatPartner) return;
  activeCallType = type;

  try {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: type === 'video',
      });
    } catch (hardwareErr) {
      console.warn('Hardware media locked by another tab, using virtual stream for call:', hardwareErr);
      const virtualStream = generateTabVideoStream(currentUser?.displayName || 'Caller');
      const audioTrack = generateSilentAudioTrack();
      if (audioTrack) virtualStream.addTrack(audioTrack);
      localStream = virtualStream;
    }

    $('#call-avatar').textContent = chatPartner.avatar;
    $('#call-name').textContent = chatPartner.displayName;
    $('#call-status').textContent = 'Ringing friend... 📞';
    $('#call-timer').textContent = '';
    $('#call-screen').classList.remove('hidden');

    if (type === 'video') {
      $('#local-video').srcObject = localStream;
      $('#call-video-container').classList.remove('hidden');
      $('#call-info').style.display = 'none';
    } else {
      $('#call-video-container').classList.add('hidden');
      $('#call-info').style.display = 'block';
    }

    peerConnection = new RTCPeerConnection(rtcConfiguration);

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
      $('#remote-video').srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: chatPartner.id,
          candidate: event.candidate,
        });
      }
    };

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    socket.emit('call-user', {
      to: chatPartner.id,
      offer,
      callType: type,
    });
  } catch (err) {
    showToast('Could not start call. Check permissions.');
    console.error(err);
  }
}

// Answering an incoming call
$('#accept-call-btn')?.addEventListener('click', async () => {
  stopRingtone();
  const fromId = $('#incoming-call').dataset.from;
  const offer = JSON.parse($('#incoming-call').dataset.offer);
  $('#incoming-call').classList.add('hidden');

  try {
    try {
      localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: activeCallType === 'video',
      });
    } catch (hardwareErr) {
      console.warn('Hardware locked by first tab, using virtual stream for answer:', hardwareErr);
      const virtualStream = generateTabVideoStream(currentUser?.displayName || 'User');
      const audioTrack = generateSilentAudioTrack();
      if (audioTrack) virtualStream.addTrack(audioTrack);
      localStream = virtualStream;
    }

    const friend = allUsers.find(u => u.id === fromId || u.username === fromId) || { displayName: 'Friend', avatar: '👤' };
    $('#call-avatar').textContent = friend.avatar;
    $('#call-name').textContent = friend.displayName;
    $('#call-status').textContent = 'Connecting...';
    $('#call-screen').classList.remove('hidden');

    if (activeCallType === 'video') {
      $('#local-video').srcObject = localStream;
      $('#call-video-container').classList.remove('hidden');
      $('#call-info').style.display = 'none';
    } else {
      $('#call-video-container').classList.add('hidden');
      $('#call-info').style.display = 'block';
    }

    peerConnection = new RTCPeerConnection(rtcConfiguration);

    localStream.getTracks().forEach(track => {
      peerConnection.addTrack(track, localStream);
    });

    peerConnection.ontrack = (event) => {
      $('#remote-video').srcObject = event.streams[0];
    };

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', {
          to: fromId,
          candidate: event.candidate,
        });
      }
    };

    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    socket.emit('answer-call', { to: fromId, answer });
    $('#call-status').textContent = 'Connected 🟢';
    startCallTimer();
  } catch (err) {
    showToast('Failed to connect call');
    console.error(err);
  }
});

$('#reject-call-btn')?.addEventListener('click', () => {
  stopRingtone();
  const fromId = $('#incoming-call').dataset.from;
  $('#incoming-call').classList.add('hidden');
  socket.emit('reject-call', { to: fromId });
});

$('#end-call-btn')?.addEventListener('click', () => {
  if (chatPartner) socket.emit('end-call', { to: chatPartner.id });
  endCallSession();
});

$('#toggle-mute')?.addEventListener('click', () => {
  if (localStream) {
    isAudioMuted = !isAudioMuted;
    localStream.getAudioTracks().forEach(t => t.enabled = !isAudioMuted);
    $('#toggle-mute').classList.toggle('muted', isAudioMuted);
    showToast(isAudioMuted ? 'Muted 🔇' : 'Unmuted 🎙️');
  }
});

$('#toggle-camera-call')?.addEventListener('click', () => {
  if (localStream) {
    isVideoDisabled = !isVideoDisabled;
    localStream.getVideoTracks().forEach(t => t.enabled = !isVideoDisabled);
    showToast(isVideoDisabled ? 'Camera Off' : 'Camera On');
  }
});

function endCallSession() {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  $('#call-screen').classList.add('hidden');
  $('#call-video-container').classList.add('hidden');
  clearInterval(callDurationTimer);
  callDurationSecs = 0;
  isAudioMuted = false;
  isVideoDisabled = false;
}

function startCallTimer() {
  callDurationSecs = 0;
  callDurationTimer = setInterval(() => {
    callDurationSecs++;
    const m = Math.floor(callDurationSecs / 60);
    const s = callDurationSecs % 60;
    $('#call-timer').textContent = `${m}:${s.toString().padStart(2, '0')}`;
  }, 1000);
}

// ═══════════════════════════════════════════
//  11. STORIES & PROFILE
// ═══════════════════════════════════════════

function renderStories() {
  const list = $('#stories-list');
  if (!list) return;

  const friends = allUsers.filter(u => u.id !== currentUser?.id);
  list.innerHTML = friends.map((u, i) => `
    <div class="story-card-grid" data-id="${u.id}">
      <div style="font-size:32px;">${u.avatar}</div>
      <div>
        <strong style="font-size:13.5px; display:block;">${u.displayName}</strong>
        <span style="font-size:11px; color:#888;">${(i + 1) * 2}h ago • ${u.city || 'Nearby'}</span>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.story-card-grid').forEach(item => {
    item.addEventListener('click', () => {
      const u = allUsers.find(x => x.id === item.dataset.id);
      if (u) {
        openSnapViewer({
          fromName: u.displayName,
          fromAvatar: u.avatar,
          imageData: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=800&q=80',
          caption: `${u.statusMsg || 'Vibing today ✨'}`,
        });
      }
    });
  });

  const discoverGrid = $('#discover-grid');
  if (!discoverGrid) return;
  const cards = [
    { title: 'Tech Trends 2026 💻', bg: 'linear-gradient(135deg, #FF6B6B, #FF8E53)' },
    { title: 'Delhi Food Stories 🍕', bg: 'linear-gradient(135deg, #a855f7, #6366f1)' },
    { title: 'Travel Diaries ✈️', bg: 'linear-gradient(135deg, #22c55e, #14b8a6)' },
    { title: 'Daily Memes 😂', bg: 'linear-gradient(135deg, #f59e0b, #ef4444)' },
  ];
  discoverGrid.innerHTML = cards.map(c => `
    <div class="discover-tile" style="background:${c.bg}">
      <span>${c.title}</span>
    </div>
  `).join('');
}

function updateProfile() {
  if (!currentUser) return;
  $('#profile-bitmoji').textContent = currentUser.bitmoji || currentUser.avatar;
  $('#profile-display-name').textContent = currentUser.displayName;
  $('#profile-username').textContent = `@${currentUser.username}`;
  $('#profile-score').textContent = currentUser.score?.toLocaleString() || '28,400';
  $('#profile-friends').textContent = (allUsers.length - 1).toString();
  $('#profile-streak-count').textContent = currentUser.streak || '64';
}

function showToast(msg) {
  const shelf = $('#toast-container');
  if (!shelf) return;
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  shelf.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}
