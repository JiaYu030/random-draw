// ⚠️ 重要：請將下方的網址替換成你在 SheetDB 取得的 API URL
// noprotect
const API_URL = "https://sheetdb.io/api/v1/g6bjy8vw4i86h";

let questionPool = [];

// 1. 從 Google 試算表讀取問題
async function loadQuestions() {
  updateStatus("loading", "同步中...");
  try {
    const response = await fetch(API_URL);
    const data = await response.json();

    // 轉換資料格式，確保 weight 是數字
    questionPool = data.map((q) => ({
      text: q.text,
      weight: parseInt(q.weight) || 1,
    }));

    const availableCount = questionPool.filter((q) => q.weight > 0).length;
    document.getElementById("draw-btn").disabled = false;
    updateStatus(
      "ready",
      `可抽取：${availableCount} / 總數：${questionPool.length}`,
    );
  } catch (e) {
    updateStatus("loading", "連線失敗");
  }
}

// 2. 隨機抽取邏輯
async function drawQuestion() {
  const availablePool = questionPool.filter((q) => q.weight > 0);
  const display = document.getElementById("result-display");

  if (availablePool.length === 0) {
    display.innerText = "💨 沒問題了！請點重製。";
    return;
  }

  display.classList.add("drawing");
  document.getElementById("draw-btn").disabled = true;

  // 模擬抽籤動畫感
  setTimeout(async () => {
    const totalWeight = availablePool.reduce((sum, q) => sum + q.weight, 0);
    let random = Math.random() * totalWeight;
    let winner = null;

    for (let q of availablePool) {
      random -= q.weight;
      if (random <= 0) {
        winner = q;
        break;
      }
    }

    if (winner) {
      display.innerText = winner.text;
      display.classList.remove("drawing");

      // 機制 1: 雲端權重變 0 (避免重複抽取)
      await updateWeight(winner.text, 0);
      winner.weight = 0; // 本地同步更新

      const remaining = questionPool.filter((q) => q.weight > 0).length;
      updateStatus("ready", `剩餘可抽：${remaining} 題`);
    }
    document.getElementById("draw-btn").disabled = false;
  }, 600);
}

// 3. 新增問題 (機率加權為 3)
async function addQuestion() {
  const input = document.getElementById("new-question-input");
  const text = input.value.trim();
  if (!text) return;

  updateStatus("loading", "傳送中...");
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: [{ text: text, weight: 3 }] }),
    });
    input.value = "";
    toggleAddSection();
    await loadQuestions();
  } catch (e) {
    alert("新增失敗");
  }
}

// 4. 重製所有問題權重
async function resetWeights() {
  if (!confirm("確定要重製嗎？")) return;

  // 防止重複觸發
  const btn = document.querySelector(".reset-btn");
  btn.disabled = true;

  updateStatus("loading", "重製中...");

  try {
    const response = await fetch(`${API_URL}/weight/0`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { weight: 1 } }),
    });

    if (response.ok) {
      await loadQuestions();
      document.getElementById("result-display").innerText = "已全部重製！";
    }
  } catch (e) {
    alert("重製失敗");
  } finally {
    btn.disabled = false; // 結束後解鎖
  }
}

// 工具：更新單一問題權重
async function updateWeight(text, val) {
  try {
    await fetch(`${API_URL}/text/${encodeURIComponent(text)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data: { weight: val } }),
    });
  } catch (e) {
    console.error("雲端同步失敗");
  }
}

function toggleAddSection() {
  document.getElementById("add-section").classList.toggle("hidden");
}

function updateStatus(type, msg) {
  const tag = document.getElementById("status-tag");
  tag.innerText = msg;
  tag.className = type === "ready" ? "status-ready" : "status-loading";
}

loadQuestions();
