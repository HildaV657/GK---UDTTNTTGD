// =============================================
//   CHATBOT HỌC TIẾNG ANH — script.js
//   Có quản lý hội thoại: tạo mới, lưu, xóa
// =============================================

// =============================================
// 🔊 HỆ THỐNG ÂM THANH — Web Audio API
// =============================================
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playTone({ freq = 440, type = "sine", duration = 0.15, volume = 0.3, attack = 0.01, decay = 0.05, freqEnd = null }) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (freqEnd !== null) {
      osc.frequency.linearRampToValueAtTime(freqEnd, ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + attack);
    gain.gain.setValueAtTime(volume, ctx.currentTime + duration - decay);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {}
}

// 🎵 Nút GỬI — "Ting!" cao, gọn, dứt khoát
function soundSend() {
  playTone({ freq: 880, freqEnd: 1100, type: "sine", duration: 0.12, volume: 0.25, attack: 0.005, decay: 0.08 });
}

// 🎵 Bot TRẢ LỜI thành công — "Ting-ting" dịu, 2 nốt
function soundBotReply() {
  playTone({ freq: 660, type: "sine", duration: 0.10, volume: 0.20, attack: 0.005, decay: 0.06 });
  setTimeout(() => playTone({ freq: 880, type: "sine", duration: 0.12, volume: 0.22, attack: 0.005, decay: 0.07 }), 110);
}

// 🎵 Bot KHÔNG TÌM THẤY — "Hmm" trầm nghi vấn
function soundBotNotFound() {
  playTone({ freq: 350, freqEnd: 270, type: "triangle", duration: 0.22, volume: 0.20, attack: 0.01, decay: 0.10 });
}

// 🎵 Chip GỢI Ý — "Pop" nhanh, nhẹ
function soundChip() {
  playTone({ freq: 520, freqEnd: 700, type: "sine", duration: 0.08, volume: 0.18, attack: 0.003, decay: 0.05 });
}

// 🎵 LƯU & DẠY BOT — melody 3 nốt vui vẻ
function soundSaveLearn() {
  playTone({ freq: 523, type: "sine", duration: 0.12, volume: 0.25, attack: 0.005, decay: 0.06 });
  setTimeout(() => playTone({ freq: 659, type: "sine", duration: 0.12, volume: 0.25, attack: 0.005, decay: 0.06 }), 130);
  setTimeout(() => playTone({ freq: 784, type: "sine", duration: 0.18, volume: 0.28, attack: 0.005, decay: 0.08 }), 260);
}

// 🎵 BỎ QUA — click thấp, dứt
function soundSkip() {
  playTone({ freq: 300, type: "triangle", duration: 0.08, volume: 0.15, attack: 0.005, decay: 0.05 });
}

// 🎵 XÓA hội thoại — "thud" đổ, giảm dần
function soundDelete() {
  playTone({ freq: 200, freqEnd: 80, type: "sawtooth", duration: 0.20, volume: 0.18, attack: 0.005, decay: 0.12 });
}

// 🎵 TẠO MỚI hội thoại — "whoosh" vút lên
function soundNewChat() {
  playTone({ freq: 400, freqEnd: 900, type: "sine", duration: 0.18, volume: 0.20, attack: 0.01, decay: 0.08 });
}

// 🎵 XUẤT FILE — "zip" đôi
function soundExport() {
  playTone({ freq: 600, freqEnd: 1300, type: "sine", duration: 0.14, volume: 0.20, attack: 0.005, decay: 0.07 });
  setTimeout(() => playTone({ freq: 1300, freqEnd: 600, type: "sine", duration: 0.10, volume: 0.14, attack: 0.005, decay: 0.06 }), 140);
}

let knowledgeBase   = { questions: [] };
let conversations   = [];      // toàn bộ hội thoại đã lưu
let currentId       = null;    // id hội thoại đang mở
let learnedCount    = 0;
let pendingQuestion = "";

// =============================================
// KHỞI ĐỘNG
// =============================================
window.addEventListener("DOMContentLoaded", async () => {
  await loadKnowledgeBase();
  loadConversations();

  // Nếu chưa có hội thoại nào → tạo mới
  if (conversations.length === 0) {
    createNewConversation();
  } else {
    switchConversation(conversations[0].id);
  }
});

// =============================================
// KNOWLEDGE BASE
// =============================================
async function loadKnowledgeBase() {
  try {
    const res = await fetch("knowledge_base.json");
    knowledgeBase = await res.json();

    // Gộp thêm từ localStorage nếu có
    const saved = localStorage.getItem("knowledgeBase");
    if (saved) {
      const savedData = JSON.parse(saved);
      for (const sq of savedData.questions) {
        const exists = knowledgeBase.questions.find(q => q.question === sq.question);
        if (!exists) knowledgeBase.questions.push(sq);
      }
    }
    updateStats();
  } catch (err) {
    appendMessage("bot", "⚠️ Không tìm thấy file knowledge_base.json!");
  }
}

function saveKnowledgeBase() {
  localStorage.setItem("knowledgeBase", JSON.stringify(knowledgeBase));
  updateStats();
}

// =============================================
// QUẢN LÝ HỘI THOẠI — LocalStorage
// =============================================
function loadConversations() {
  const saved = localStorage.getItem("conversations");
  conversations = saved ? JSON.parse(saved) : [];
  renderConvList();
}

function saveConversations() {
  localStorage.setItem("conversations", JSON.stringify(conversations));
}

function createNewConversation() {
  soundNewChat();
  const id   = "conv_" + Date.now();
  const name = "Hội thoại " + (conversations.length + 1);

  // Tin nhắn chào tự động từ bot
  const welcomeMsg = {
    role: "bot",
    text: "Xin chào! Mình là Bot học tiếng Anh của bạn 🎓\n\nMình có thể giúp bạn:\n• Giải thích ngữ pháp và các thì tiếng Anh\n• Học từ vựng theo chủ đề\n• Phân biệt các cấu trúc dễ nhầm\n• Mẹo học và thi tiếng Anh hiệu quả\n\nHãy thử hỏi mình hoặc bấm một gợi ý phía trên nhé! 😊",
    type: "greet"
  };

  conversations.unshift({ id, name, messages: [welcomeMsg] });
  saveConversations();
  switchConversation(id);
}

function switchConversation(id) {
  currentId = id;
  hideTeachBox();
  renderConvList();
  renderMessages();
  const conv = getConv(id);
  document.getElementById("chat-title").textContent = conv ? conv.name : "AI Học Tiếng Anh";
}

function getConv(id) {
  return conversations.find(c => c.id === id);
}

function deleteConversation(id) {
  soundDelete();
  conversations = conversations.filter(c => c.id !== id);
  saveConversations();

  if (currentId === id) {
    if (conversations.length === 0) {
      createNewConversation();
    } else {
      switchConversation(conversations[0].id);
    }
  } else {
    renderConvList();
  }
}

function deleteCurrentChat() {
  if (!currentId) return;
  const conv = getConv(currentId);
  if (confirm(`Xóa hội thoại "${conv?.name}"?`)) {
    deleteConversation(currentId);
  }
}

function newChat() {
  createNewConversation();
}

function renameChat() {
  const conv = getConv(currentId);
  if (!conv) return;
  const newName = prompt("Đổi tên hội thoại:", conv.name);
  if (newName && newName.trim()) {
    conv.name = newName.trim();
    saveConversations();
    document.getElementById("chat-title").textContent = conv.name;
    renderConvList();
  }
}

// =============================================
// RENDER SIDEBAR
// =============================================
function renderConvList() {
  const list = document.getElementById("conv-list");
  list.innerHTML = "";

  if (conversations.length === 0) {
    list.innerHTML = '<p style="font-size:12px;color:#b07080;text-align:center;padding:16px;">Chưa có hội thoại nào</p>';
    return;
  }

  conversations.forEach(conv => {
    const item = document.createElement("div");
    item.className = "conv-item" + (conv.id === currentId ? " active" : "");

    // Preview = tin nhắn cuối cùng của user
    const lastUserMsg = [...conv.messages].reverse().find(m => m.role === "user");
    const preview = lastUserMsg ? lastUserMsg.text : "Chưa có tin nhắn";

    item.innerHTML = `
      <span class="conv-icon">💬</span>
      <div class="conv-info">
        <div class="conv-name">${escHtml(conv.name)}</div>
        <div class="conv-preview">${escHtml(preview)}</div>
      </div>
      <button class="conv-delete" onclick="event.stopPropagation(); deleteConversation('${conv.id}')" title="Xóa">🗑️</button>
    `;
    item.addEventListener("click", () => switchConversation(conv.id));
    list.appendChild(item);
  });
}

// =============================================
// RENDER TIN NHẮN
// =============================================
function renderMessages() {
  const container = document.getElementById("messages");
  container.innerHTML = "";

  const conv = getConv(currentId);
  if (!conv) return;

  if (conv.messages.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="es-icon">🐱</div>
        <p>Hội thoại mới!<br>Hãy đặt câu hỏi hoặc chọn gợi ý phía trên nhé 😊</p>
      </div>`;
    return;
  }

  conv.messages.forEach(msg => {
    _renderMsg(msg.role, msg.text, msg.type || "");
  });
}

function _renderMsg(role, text, type = "") {
  const container = document.getElementById("messages");

  // Xóa empty state nếu có
  const es = container.querySelector(".empty-state");
  if (es) es.remove();

  const div = document.createElement("div");
  div.className = `message ${role} fade-in`;

  const av = document.createElement("span");
  av.className = "msg-avatar-icon";
  av.textContent = role === "user" ? "🐶" : "🎓";

  const bubble = document.createElement("div");
  bubble.className = "bubble";

  if (role === "bot" && type === "found") {
    const tag = document.createElement("span");
    tag.className = "msg-tag tag-found";
    tag.textContent = "✅ Tìm thấy trong kho";
    bubble.appendChild(tag);
    bubble.appendChild(document.createElement("br"));
  } else if (role === "bot" && type === "learned") {
    const tag = document.createElement("span");
    tag.className = "msg-tag tag-learned";
    tag.textContent = "🧠 Đã học thêm!";
    bubble.appendChild(tag);
    bubble.appendChild(document.createElement("br"));
  }

  bubble.appendChild(document.createTextNode(text));
  div.appendChild(av);
  div.appendChild(bubble);
  container.appendChild(div);
  container.scrollTop = container.scrollHeight;
}

// =============================================
// THUẬT TOÁN TÌM KIẾM
// =============================================
function similarity(str1, str2) {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  const w1 = new Set(s1.split(/\s+/));
  const w2 = new Set(s2.split(/\s+/));
  const intersection = [...w1].filter(w => w2.has(w)).length;
  const union = new Set([...w1, ...w2]).size;
  return union === 0 ? 0 : intersection / union;
}

function findBestMatch(userQuestion) {
  let bestMatch = null, bestScore = 0;
  const CUTOFF = 0.35;
  for (const item of knowledgeBase.questions) {
    const score = similarity(userQuestion, item.question);
    if (score > bestScore && score >= CUTOFF) {
      bestScore = score;
      bestMatch = item.question;
    }
  }
  return bestMatch;
}

function getAnswerForQuestion(question) {
  const item = knowledgeBase.questions.find(
    q => q.question.toLowerCase() === question.toLowerCase()
  );
  return item ? item.answer : null;
}

// =============================================
// GỬI TIN NHẮN
// =============================================
function sendMessage() {
  const input = document.getElementById("user-input");
  const userText = input.value.trim();
  if (!userText) return;
  soundSend();

  const conv = getConv(currentId);
  if (!conv) return;

  // Lưu và hiển thị tin nhắn user
  conv.messages.push({ role: "user", text: userText, type: "" });
  saveConversations();
  _renderMsg("user", userText);
  input.value = "";
  hideTeachBox();

  // Cập nhật sidebar preview
  renderConvList();

  // Tìm câu trả lời
  const bestMatch = findBestMatch(userText);

  if (bestMatch) {
    const answer = getAnswerForQuestion(bestMatch);
    conv.messages.push({ role: "bot", text: answer, type: "found" });
    saveConversations();
    soundBotReply();
    _renderMsg("bot", answer, "found");
  } else {
    pendingQuestion = userText;
    const botText = `Mình chưa biết câu trả lời cho câu này 😅\n\nBạn có thể dạy mình không? 👇`;
    conv.messages.push({ role: "bot", text: botText, type: "" });
    saveConversations();
    soundBotNotFound();
    _renderMsg("bot", botText);
    showTeachBox();
  }
}

// =============================================
// DẠY BOT
// =============================================
function saveNewAnswer() {
  const teachInput = document.getElementById("teach-input");
  const newAnswer = teachInput.value.trim();
  if (!newAnswer) {
    teachInput.style.borderColor = "#ffb6c1";
    teachInput.placeholder = "⚠️ Nhập câu trả lời trước!";
    return;
  }

  knowledgeBase.questions.push({ question: pendingQuestion.toLowerCase(), answer: newAnswer });
  saveKnowledgeBase();
  learnedCount++;
  updateStats();

  soundSaveLearn();
  const msg = `✅ Cảm ơn! Mình đã học được câu mới:\n❓ "${pendingQuestion}"\n💡 "${newAnswer}"`;
  const conv = getConv(currentId);
  if (conv) {
    conv.messages.push({ role: "bot", text: msg, type: "learned" });
    saveConversations();
  }
  _renderMsg("bot", msg, "learned");

  teachInput.value = "";
  pendingQuestion = "";
  hideTeachBox();
}

function skipTeach() {
  soundSkip();
  const msg = "Không sao! Lần sau bạn có thể dạy mình nhé 😊";
  const conv = getConv(currentId);
  if (conv) {
    conv.messages.push({ role: "bot", text: msg, type: "" });
    saveConversations();
  }
  _renderMsg("bot", msg);
  pendingQuestion = "";
  hideTeachBox();
}

// =============================================
// HELPERS
// =============================================
function showTeachBox() {
  const box = document.getElementById("teach-box");
  box.classList.add("show");
  document.getElementById("teach-input").value = "";
}

function hideTeachBox() {
  document.getElementById("teach-box").classList.remove("show");
}

function quickSend(text) {
  soundChip();
  document.getElementById("user-input").value = text;
  sendMessage();
}

function exportKB() {
  soundExport();
  const blob = new Blob([JSON.stringify(knowledgeBase, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url; a.download = "knowledge_base.json"; a.click();
  URL.revokeObjectURL(url);
}

function updateStats() {
  document.getElementById("kb-count").textContent = knowledgeBase.questions.length;
  document.getElementById("learned-count").textContent = learnedCount;
}

function handleKey(event) {
  if (event.key === "Enter") { event.preventDefault(); sendMessage(); }
}

function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}