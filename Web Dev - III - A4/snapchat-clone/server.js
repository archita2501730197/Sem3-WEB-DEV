// ─── Snapchat Clone Server (Enhanced v2) ───
const express = require("express");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

const app = express();
const httpserver = http.createServer(app);
const io = new Server(httpserver, {
  maxHttpBufferSize: 50 * 1024 * 1024, // 50MB for photos/audio
  cors: { origin: "*" },
});

app.use(express.static(path.join(__dirname, "public")));

// ─── Pre-default 20 Users with Real Locations & Streaks ───
const defaultUsers = [
  { id: "user1",  username: "archita",     displayName: "Archita ✨",       avatar: "👩",  bitmoji: "🦋", score: 28400, streak: 64, statusMsg: "Designing web apps 💻",  lat: 28.6139, lng: 77.2090, city: "Connaught Place", battery: 94, isDefault: true },
  { id: "user2",  username: "rahul_dev",   displayName: "Rahul 🔥",        avatar: "👨",  bitmoji: "🏄", score: 19400, streak: 42, statusMsg: "Chilling at cafe ☕",      lat: 28.5355, lng: 77.3910, city: "Noida Sector 18", battery: 78, isDefault: true },
  { id: "user3",  username: "priya.snap",  displayName: "Priya 💫",        avatar: "👩‍💻", bitmoji: "💃", score: 34900, streak: 89, statusMsg: "Listening to Spotify 🎧", lat: 28.4595, lng: 77.0266, city: "Cyber City Gurugram", battery: 65, isDefault: true },
  { id: "user4",  username: "amit_k",      displayName: "Amit 🎮",         avatar: "🧑",  bitmoji: "🎸", score: 14800, streak: 21, statusMsg: "Gaming online 🕹️",        lat: 28.5700, lng: 77.3200, city: "Noida", battery: 88, isDefault: true },
  { id: "user5",  username: "sneha_art",   displayName: "Sneha 🎨",        avatar: "👧",  bitmoji: "🎨", score: 27100, streak: 53, statusMsg: "Painting new sketches 🖌️", lat: 28.5244, lng: 77.1855, city: "Hauz Khas Village", battery: 82, isDefault: true },
  { id: "user6",  username: "vikram99",    displayName: "Vikram 💪",       avatar: "🧔",  bitmoji: "🏋️", score: 12600, streak: 15, statusMsg: "At the gym 🏋️‍♂️",           lat: 28.6500, lng: 77.2300, city: "Old Delhi", battery: 52, isDefault: true },
  { id: "user7",  username: "neha.music",  displayName: "Neha 🎵",         avatar: "👩‍🎤", bitmoji: "🎤", score: 23300, streak: 72, statusMsg: "Jamming on guitar 🎸",    lat: 28.5494, lng: 77.2001, city: "IIT Delhi", battery: 91, isDefault: true },
  { id: "user8",  username: "rohan_fit",   displayName: "Rohan 🏃",        avatar: "🧑‍🦱", bitmoji: "⚽", score: 16200, streak: 30, statusMsg: "Evening run in park 🌳",  lat: 28.5900, lng: 77.2200, city: "Lodhi Garden", battery: 74, isDefault: true },
  { id: "user9",  username: "kavita_s",    displayName: "Kavita 📸",       avatar: "👩‍🦰", bitmoji: "📷", score: 21700, streak: 47, statusMsg: "Clicking aesthetic snaps 🌇", lat: 28.6129, lng: 77.2295, city: "India Gate", battery: 69, isDefault: true },
  { id: "user10", username: "arjun.code",  displayName: "Arjun 💻",        avatar: "👨‍💻", bitmoji: "🖥️", score: 31500, streak: 95, statusMsg: "Debugging Socket.IO ⚡",   lat: 28.4900, lng: 77.0800, city: "DLF Phase 2", battery: 98, isDefault: true },
  { id: "user11", username: "divya_star",  displayName: "Divya ⭐",        avatar: "👸",  bitmoji: "🌟", score: 15900, streak: 18, statusMsg: "Shopping day! 🛍️",        lat: 28.5284, lng: 77.2185, city: "Select Citywalk", battery: 45, isDefault: true },
  { id: "user12", username: "manish_vfx",  displayName: "Manish 🎬",       avatar: "🧑‍🎨", bitmoji: "🎥", score: 18600, streak: 39, statusMsg: "Watching movies 🍿",       lat: 28.6304, lng: 77.2177, city: "Barakhamba", battery: 83, isDefault: true },
  { id: "user13", username: "pooja.yoga",  displayName: "Pooja 🧘",        avatar: "🧘‍♀️", bitmoji: "🌸", score: 24400, streak: 61, statusMsg: "Sunset meditation 🧘‍♀️",     lat: 28.5833, lng: 77.2333, city: "Humayun Tomb", battery: 77, isDefault: true },
  { id: "user14", username: "sanjay_biz",  displayName: "Sanjay 📊",       avatar: "👨‍💼", bitmoji: "📈", score: 11500, streak: 12, statusMsg: "Startup meetings 💼",     lat: 28.4700, lng: 77.0300, city: "Golf Course Rd", battery: 60, isDefault: true },
  { id: "user15", username: "ritu_dance",  displayName: "Ritu 💃",         avatar: "💁‍♀️", bitmoji: "💃", score: 26800, streak: 77, statusMsg: "Dance rehearsals 💃",     lat: 28.5400, lng: 77.2500, city: "Greater Kailash", battery: 95, isDefault: true },
  { id: "user16", username: "karan_mma",   displayName: "Karan 🥊",        avatar: "🧑‍🦲", bitmoji: "🥋", score: 17100, streak: 28, statusMsg: "Boxing session 🥊",       lat: 28.6400, lng: 77.1200, city: "Rajouri Garden", battery: 70, isDefault: true },
  { id: "user17", username: "ananya.pix",  displayName: "Ananya 📱",       avatar: "👩‍🎓", bitmoji: "🤳", score: 32300, streak: 104, statusMsg: "College fest hype! 🎓",    lat: 28.6900, lng: 77.2100, city: "North Campus DU", battery: 86, isDefault: true },
  { id: "user18", username: "deepak_dj",   displayName: "Deepak 🎧",       avatar: "🧑‍🎤", bitmoji: "🎶", score: 22800, streak: 49, statusMsg: "Mixing new tracks 🎵",     lat: 28.5600, lng: 77.1600, city: "Vasant Kunj", battery: 67, isDefault: true },
  { id: "user19", username: "meera.cook",  displayName: "Meera 🍳",        avatar: "👩‍🍳", bitmoji: "🍕", score: 19900, streak: 35, statusMsg: "Baking pizza 🍕🤤",        lat: 28.6200, lng: 77.0800, city: "Janakpuri", battery: 89, isDefault: true },
  { id: "user20", username: "raj_travel",  displayName: "Raj 🌍",          avatar: "🧳",  bitmoji: "✈️", score: 38400, streak: 120, statusMsg: "Exploring new roads 🛣️",   lat: 28.5562, lng: 77.1000, city: "IGI Airport T3", battery: 92, isDefault: true },
];

let allUsers = defaultUsers.map(u => ({ ...u }));
const onlineUsers = new Map();
const activeCalls = new Map();

function getSimulatedReply(user, type, text = "") {
  const replies = {
    text: [
      `Haha that's awesome! 😂🔥`,
      `Hey! Loved your message! ✨ How's your day going?`,
      `Omg yes! Exactly what I was thinking! 💯`,
      `Just saw this! So cool 🙌`,
      `Send me a snap soon! 📸`,
      `Check out my latest story! 🌟`,
      `Haha you're hilarious! 👻💛`,
      `Working on some cool stuff right now! 🚀`,
      `Heyyy! Great to connect with you on Snapchat! 💛`,
    ],
    image: [
      `Woah aesthetic photo! 🔥 Captured so well!`,
      `Love this snap! 📸💛 Saved to chat!`,
      `Super cool picture! Where was this? 😍`,
    ],
    camera: [
      `🔥 Snap received! Streak maintained!`,
      `Cute snap! 👻 Sent one back, check camera!`,
      `Ayy love the filter! ✨`,
    ],
    voice: [
      `🎧 Just listened to your voice note! Sounds great!`,
      `Haha your voice message made my day! 😂🙌`,
    ],
    sticker: [
      `🎉 Love this sticker!`,
      `💖 Super cute sticker!`,
      `🔥 Fire vibes!`,
    ],
  };

  const pool = replies[type] || replies.text;
  return pool[Math.floor(Math.random() * pool.length)];
}

io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Send full users list including all 20 default friends
  socket.emit("all-users", allUsers);
  socket.emit("online-users", Array.from(onlineUsers.values()));

  // ─── Register User (Name & Username Choice) ───
  socket.on("register-user", (userData) => {
    if (!userData) return;
    const displayName = (userData.displayName || userData.name || "").trim();
    if (!displayName) {
      console.log(`⚠️ Ignored registration without valid name from ${socket.id}`);
      return;
    }

    const rawUsername = (userData.username || displayName.toLowerCase().replace(/\s+/g, '_')).trim().toLowerCase();
    const username = rawUsername.replace(/[^a-z0-9_.]/g, "") || "user_" + Date.now().toString().slice(-4);
    const avatar = userData.avatar || "😎";
    const bitmoji = userData.bitmoji || "✨";

    // Check if user already exists
    let existingUser = allUsers.find((u) => u.username === username || (userData.id && u.id === userData.id));

    if (existingUser && !existingUser.isDefault) {
      existingUser.displayName = displayName;
      existingUser.avatar = avatar;
      existingUser.bitmoji = bitmoji;
      existingUser.socketId = socket.id;
      if (userData.lat) existingUser.lat = userData.lat;
      if (userData.lng) existingUser.lng = userData.lng;
      onlineUsers.set(socket.id, existingUser);
      socket.emit("login-success", existingUser);
      console.log(`🔄 Re-attached existing user: ${displayName} (@${username})`);
    } else {
      const newUser = {
        id: "u_" + socket.id.substring(0, 6) + "_" + Date.now().toString().slice(-4),
        username,
        displayName,
        avatar,
        bitmoji,
        score: Math.floor(Math.random() * 5000 + 1000),
        streak: 1,
        statusMsg: "Active on Snapchat 👻",
        lat: userData.lat || 28.6139 + (Math.random() - 0.5) * 0.05,
        lng: userData.lng || 77.2090 + (Math.random() - 0.5) * 0.05,
        city: "My Location",
        battery: Math.floor(Math.random() * 40 + 60),
        isDefault: false,
        socketId: socket.id,
      };

      allUsers.push(newUser);
      onlineUsers.set(socket.id, newUser);
      socket.emit("login-success", newUser);
      console.log(`🎉 Registered User: ${displayName} (@${username})`);
    }

    io.emit("all-users", allUsers);
    io.emit("online-users", Array.from(onlineUsers.values()));
    socket.broadcast.emit("user-joined", displayName);
  });

  // ─── Reconnect Existing Session ───
  socket.on("reconnect-user", (userId) => {
    if (!userId) return;
    const user = allUsers.find((u) => u.id === userId);
    if (user) {
      // Detach old socket if same user was mapped
      for (const [sid, u] of onlineUsers.entries()) {
        if (u.id === user.id) onlineUsers.delete(sid);
      }
      const sessionUser = { ...user, socketId: socket.id };
      onlineUsers.set(socket.id, sessionUser);
      socket.emit("login-success", sessionUser);
      io.emit("online-users", Array.from(onlineUsers.values()));
      console.log(`⚡ Reconnected: ${sessionUser.displayName}`);
    }
  });

  // ─── Login as Existing User ───
  socket.on("login", (userId) => {
    let user = allUsers.find((u) => u.id === userId);
    if (!user) user = defaultUsers[0];

    // Detach old socket if same user
    for (const [sid, u] of onlineUsers.entries()) {
      if (u.id === user.id) {
        onlineUsers.delete(sid);
      }
    }

    const sessionUser = { ...user, socketId: socket.id };
    onlineUsers.set(socket.id, sessionUser);
    socket.emit("login-success", sessionUser);

    io.emit("all-users", allUsers);
    io.emit("online-users", Array.from(onlineUsers.values()));
    socket.broadcast.emit("user-joined", sessionUser.displayName);
    console.log(`✅ ${sessionUser.displayName} logged in`);
  });

  // ─── Location Update ───
  socket.on("update-location", (loc) => {
    const user = onlineUsers.get(socket.id);
    if (user && loc && loc.lat && loc.lng) {
      user.lat = loc.lat;
      user.lng = loc.lng;
      io.emit("user-location-updated", {
        userId: user.id,
        lat: loc.lat,
        lng: loc.lng,
      });
    }
  });

  // ─── Chat Messages ───
  socket.on("private-message", (data) => {
    const sender = onlineUsers.get(socket.id);
    if (!sender) return;

    const msgData = {
      from: sender.id,
      fromName: sender.displayName,
      fromAvatar: sender.avatar,
      to: data.to,
      message: data.message,
      type: data.type || "text",
      timestamp: Date.now(),
    };

    // Find recipient socket (either by user ID or username)
    const recipientEntry = [...onlineUsers.entries()].find(
      ([, u]) => u.id === data.to || u.username === data.to
    );

    if (recipientEntry) {
      const [recipientSocketId] = recipientEntry;
      io.to(recipientSocketId).emit("private-message", msgData);
      socket.emit("message-sent", { ...msgData, to: data.to });
    } else {
      socket.emit("message-sent", { ...msgData, to: data.to });

      // Provide simulated reply ONLY if recipient is an offline default friend
      const targetFriend = allUsers.find((u) => u.id === data.to);
      if (targetFriend && targetFriend.isDefault) {
        setTimeout(() => {
          socket.emit("user-typing", { from: targetFriend.id, fromName: targetFriend.displayName });
        }, 700);

        setTimeout(() => {
          socket.emit("user-stop-typing", { from: targetFriend.id });
          const replyText = getSimulatedReply(targetFriend, data.type, data.message);
          const autoMsg = {
            from: targetFriend.id,
            fromName: targetFriend.displayName,
            fromAvatar: targetFriend.avatar,
            to: sender.id,
            message: replyText,
            type: "text",
            timestamp: Date.now(),
          };
          socket.emit("private-message", autoMsg);
        }, 2000);
      }
    }
  });

  // ─── Send Snap ───
  socket.on("send-snap", (data) => {
    const sender = onlineUsers.get(socket.id);
    if (!sender) return;

    const snapData = {
      from: sender.id,
      fromName: sender.displayName,
      fromAvatar: sender.avatar,
      imageData: data.imageData,
      caption: data.caption || "",
      filter: data.filter || "normal",
      timestamp: Date.now(),
    };

    const recipients = Array.isArray(data.to) ? data.to : [data.to];

    recipients.forEach((targetId) => {
      const recipientEntry = [...onlineUsers.entries()].find(
        ([, u]) => u.id === targetId
      );

      if (recipientEntry) {
        io.to(recipientEntry[0]).emit("receive-snap", snapData);
      } else {
        const friend = allUsers.find((u) => u.id === targetId);
        if (friend) {
          setTimeout(() => {
            const autoReply = {
              from: friend.id,
              fromName: friend.displayName,
              fromAvatar: friend.avatar,
              to: sender.id,
              message: `🔥 Opened your Snap! Loved it (${friend.streak + 1} streak!)`,
              type: "text",
              timestamp: Date.now(),
            };
            socket.emit("private-message", autoReply);
          }, 2000);
        }
      }
    });

    socket.emit("snap-sent", { to: data.to });
  });

  // ─── Calls (WebRTC) ───
  socket.on("call-user", (data) => {
    const caller = onlineUsers.get(socket.id);
    if (!caller) return;

    const recipientEntry = [...onlineUsers.entries()].find(
      ([, u]) => u.id === data.to || u.username === data.to
    );

    if (recipientEntry) {
      const [recipientSocketId] = recipientEntry;
      activeCalls.set(socket.id, recipientSocketId);
      activeCalls.set(recipientSocketId, socket.id);
      io.to(recipientSocketId).emit("incoming-call", {
        from: caller.id,
        fromName: caller.displayName,
        fromAvatar: caller.avatar,
        offer: data.offer,
        callType: data.callType,
        callerSocketId: socket.id,
      });
    } else {
      socket.emit("call-status-update", {
        status: "ringing",
        message: "Ringing friend...",
      });

      setTimeout(() => {
        socket.emit("call-unavailable", {
          friendName: allUsers.find((u) => u.id === data.to)?.displayName || "Friend",
        });
      }, 3500);
    }
  });

  socket.on("answer-call", (data) => {
    const recipientEntry = [...onlineUsers.entries()].find(
      ([, u]) => u.id === data.to || u.username === data.to
    );
    if (recipientEntry) {
      io.to(recipientEntry[0]).emit("call-answered", { answer: data.answer });
    }
  });

  socket.on("ice-candidate", (data) => {
    const recipientEntry = [...onlineUsers.entries()].find(
      ([, u]) => u.id === data.to || u.username === data.to
    );
    if (recipientEntry) {
      io.to(recipientEntry[0]).emit("ice-candidate", { candidate: data.candidate });
    }
  });

  socket.on("end-call", (data) => {
    if (data && data.to) {
      const recipientEntry = [...onlineUsers.entries()].find(
        ([, u]) => u.id === data.to || u.username === data.to
      );
      if (recipientEntry) {
        io.to(recipientEntry[0]).emit("call-ended");
      }
    }
    const otherId = activeCalls.get(socket.id);
    if (otherId) {
      io.to(otherId).emit("call-ended");
      activeCalls.delete(otherId);
    }
    activeCalls.delete(socket.id);
  });

  socket.on("reject-call", (data) => {
    const recipientEntry = [...onlineUsers.entries()].find(
      ([, u]) => u.id === data.to
    );
    if (recipientEntry) {
      io.to(recipientEntry[0]).emit("call-rejected");
    }
  });

  // ─── Typing ───
  socket.on("typing", (data) => {
    const sender = onlineUsers.get(socket.id);
    if (!sender) return;
    const recipientEntry = [...onlineUsers.entries()].find(
      ([, u]) => u.id === data.to
    );
    if (recipientEntry) {
      io.to(recipientEntry[0]).emit("user-typing", {
        from: sender.id,
        fromName: sender.displayName,
      });
    }
  });

  socket.on("stop-typing", (data) => {
    const sender = onlineUsers.get(socket.id);
    if (!sender) return;
    const recipientEntry = [...onlineUsers.entries()].find(
      ([, u]) => u.id === data.to
    );
    if (recipientEntry) {
      io.to(recipientEntry[0]).emit("user-stop-typing", { from: sender.id });
    }
  });

  // ─── User Logout ───
  socket.on("user-logout", () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      io.emit("online-users", Array.from(onlineUsers.values()));
      socket.broadcast.emit("user-left", user.displayName);
      console.log(`👋 ${user.displayName} logged out`);
    }
  });

  // ─── Disconnect ───
  socket.on("disconnect", () => {
    const user = onlineUsers.get(socket.id);
    if (user) {
      onlineUsers.delete(socket.id);
      io.emit("online-users", Array.from(onlineUsers.values()));
      socket.broadcast.emit("user-left", user.displayName);
      console.log(`❌ ${user.displayName} disconnected`);
    }

    if (activeCalls.has(socket.id)) {
      const other = activeCalls.get(socket.id);
      io.to(other).emit("call-ended");
      activeCalls.delete(socket.id);
    }
  });
});

const PORT = 8080;
httpserver.listen(PORT, () => {
  console.log(`\n👻 Snapchat Clone Server running at http://localhost:${PORT}\n`);
});
