const state = {
  pin: "",
  userId: null,
  account: null,
  others: [],
  selectedRecipient: null,
  view: "home"
};

const $ = (id) => document.getElementById(id);

/* ============ PIN ============ */
const pinDots = document.querySelectorAll("#pinDots span");
const pinError = $("pinError");

document.querySelectorAll(".numpad button").forEach(btn => {
  btn.addEventListener("click", () => {
    const key = btn.dataset.num;
    if (key === "del") { state.pin = state.pin.slice(0, -1); renderPin(); return; }
    if (key === "face") { showToast("Face ID недоступен", "error"); return; }
    if (state.pin.length >= 4) return;
    state.pin += key;
    renderPin();
    if (state.pin.length === 4) setTimeout(checkPin, 200);
  });
});

function renderPin() {
  pinDots.forEach((dot, i) => dot.classList.toggle("filled", i < state.pin.length));
  pinError.classList.add("hidden");
}

async function checkPin() {
  try {
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: state.pin })
    });
    const data = await res.json();
    if (!res.ok) {
      pinError.classList.remove("hidden");
      state.pin = "";
      setTimeout(renderPin, 400);
      const dots = $("pinDots");
      dots.style.animation = "shake 0.3s";
      setTimeout(() => dots.style.animation = "", 300);
      return;
    }
    state.userId = data.userId;
    await loadAccount();
    showApp();
  } catch (e) {
    showToast("Ошибка сети", "error");
    state.pin = "";
    renderPin();
  }
}

const st = document.createElement("style");
st.textContent = `@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-8px)}75%{transform:translateX(8px)}}`;
document.head.appendChild(st);

function showApp() {
  $("loginScreen").classList.add("hidden");
  $("app").classList.remove("hidden");
  switchView("home");
}

/* ============ АККАУНТ ============ */
async function loadAccount() {
  const res = await fetch(`/api/accounts?userId=${state.userId}`);
  const data = await res.json();
  state.account = data.account;
  state.others = data.others;

  $("balanceAmount").textContent = formatMoney(state.account.balance);
  $("cardNumber").textContent = state.account.cardNumber;
  if ($("infoName")) $("infoName").textContent = state.account.name;
  if ($("infoIIN")) $("infoIIN").textContent = state.account.iin;
  if ($("infoPhone")) $("infoPhone").textContent = state.account.phone;

  renderContacts();
}

function renderContacts() {
  const list = $("contactsList");
  if (!list) return;
  list.innerHTML = state.others.map(u => `
    <div class="contact-item" data-id="${u.id}">
      <div class="contact-avatar">${u.avatar}</div>
      <div class="contact-info">
        <div class="contact-name">${u.name}</div>
        <div class="contact-phone">${u.phone}</div>
      </div>
    </div>
  `).join("");

  list.querySelectorAll(".contact-item").forEach(el => {
    el.addEventListener("click", () => {
      list.querySelectorAll(".contact-item").forEach(i => i.classList.remove("selected"));
      el.classList.add("selected");
      state.selectedRecipient = state.others.find(u => u.id === el.dataset.id);
      $("selectedRecipient").textContent = state.selectedRecipient.name;
    });
  });
}

/* ============ НАВИГАЦИЯ ============ */
function switchView(view) {
  state.view = view;
  document.querySelectorAll(".view, .view-home").forEach(v => v.classList.add("hidden"));

  if (view === "home") {
    $("view-home").classList.remove("hidden");
  } else {
    const el = $("view-" + view);
    if (el) el.classList.remove("hidden");
    else {
      $("placeholderTitle").textContent = {
        qr: "Kaspi QR", payments: "Платежи", shop: "Магазин",
        promo: "Акции", travel: "Travel", gov: "Госуслуги",
        messages: "Сообщения", services: "Сервисы"
      }[view] || "Сервис";
      $("view-placeholder").classList.remove("hidden");
    }
  }

  document.querySelectorAll(".nav-item").forEach(n =>
    n.classList.toggle("active", n.dataset.nav === view));

  if (view === "history") loadHistory();
  if (view === "mybank") loadAccount();
}

document.querySelectorAll("[data-nav]").forEach(el => {
  el.addEventListener("click", (e) => {
    e.preventDefault();
    switchView(el.dataset.nav);
  });
});

/* ============ ИСТОРИЯ ============ */
async function loadHistory() {
  const res = await fetch(`/api/history?userId=${state.userId}`);
  const data = await res.json();
  const list = $("historyList");
  if (!data.transactions.length) {
    list.innerHTML = `<div style="opacity:.5;text-align:center;padding:20px">Пока нет операций</div>`;
    return;
  }
  list.innerHTML = Object.entries(data.grouped).map(([day, txs]) => `
    <div>
      <div class="history-day">${day}</div>
      ${txs.map(t => `
        <div class="tx-item">
          <div class="tx-icon ${t.type}">${t.type === "in" ? "↓" : "↑"}</div>
          <div class="tx-info">
            <div class="tx-name">${t.type === "in" ? t.from : t.to}</div>
            <div class="tx-time">${new Date(t.date).toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"})} · ${t.comment}</div>
          </div>
          <div class="tx-amount ${t.type}">${t.type === "in" ? "+" : "−"}${formatMoney(t.amount)}</div>
        </div>`).join("")}
    </div>`).join("");
}

/* ============ ПЕРЕВОД ============ */
$("sendTransferBtn").addEventListener("click", async () => {
  if (!state.selectedRecipient) return showToast("Выберите получателя", "error");
  const amount = Number($("amountInput").value);
  const comment = $("commentInput").value;
  if (!amount || amount <= 0) return showToast("Введите сумму", "error");

  const res = await fetch("/api/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fromId: state.userId, toId: state.selectedRecipient.id, amount, comment })
  });
  const data = await res.json();
  if (!res.ok) return showToast(data.error, "error");

  showReceipt(data.receipt);
  $("amountInput").value = "";
  $("commentInput").value = "";
  $("selectedRecipient").textContent = "Выберите получателя";
  state.selectedRecipient = null;
  document.querySelectorAll(".contact-item").forEach(i => i.classList.remove("selected"));
  await loadAccount();
});

function showReceipt(r) {
  $("receiptAmount").textContent = formatMoney(r.amount);
  $("receiptFrom").textContent = r.from;
  $("receiptFromCard").textContent = r.fromCard;
  $("receiptTo").textContent = r.to;
  $("receiptToCard").textContent = r.toCard;
  $("receiptPhone").textContent = r.toPhone;
  $("receiptComment").textContent = r.comment;
  $("receiptDate").textContent = new Date(r.date).toLocaleString("ru-RU");
  $("receiptId").textContent = r.txId;
  $("receiptModal").classList.remove("hidden");
}

$("closeReceipt").addEventListener("click", () => {
  $("receiptModal").classList.add("hidden");
});

/* ============ ПОПОЛНЕНИЕ ============ */
document.querySelectorAll("[data-action]").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.dataset.action === "topup") {
      $("topupModal").classList.remove("hidden");
    }
  });
});

$("cancelTopup").addEventListener("click", () => {
  $("topupModal").classList.add("hidden");
  $("topupAmount").value = "";
});

$("confirmTopup").addEventListener("click", async () => {
  const amount = Number($("topupAmount").value);
  if (!amount || amount <= 0) return showToast("Введите сумму", "error");

  const res = await fetch("/api/transfer", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fromId: state.others[0].id,
      toId: state.userId,
      amount,
      comment: "Пополнение"
    })
  });
  const data = await res.json();
  if (!res.ok) return showToast(data.error, "error");

  $("topupModal").classList.add("hidden");
  $("topupAmount").value = "";
  showToast(`Пополнено на ${formatMoney(amount)}`);
  await loadAccount();
});

/* ============ ВКЛАДКИ МОЙ БАНК ============ */
document.querySelectorAll(".bank-tab").forEach(tab => {
  tab.addEventListener("click", () => {
    if (tab.dataset.nav) return;
    document.querySelectorAll(".bank-tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    document.querySelectorAll(".bank-pane").forEach(p => p.classList.remove("active"));
    const pane = document.querySelector(`.bank-pane[data-pane="${tab.dataset.tab}"]`);
    if (pane) pane.classList.add("active");
  });
});

/* ============ ЛОГАУТ ============ */
$("logoutBtn").addEventListener("click", () => {
  state.pin = "";
  state.userId = null;
  state.account = null;
  renderPin();
  $("app").classList.add("hidden");
  $("loginScreen").classList.remove("hidden");
});

/* ============ УТИЛИТЫ ============ */
function formatMoney(n) {
  return new Intl.NumberFormat("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n) + " ₸";
}

function showToast(msg, type = "success") {
  const t = $("toast");
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove("hidden");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add("hidden"), 3000);
}