const fields = {
  billingMonth: document.querySelector("#billingMonth"),
  mainUnits: document.querySelector("#mainUnits"),
  shopOld: document.querySelector("#shopOld"),
  shopNew: document.querySelector("#shopNew"),
  billAmount: document.querySelector("#billAmount"),
};

const output = {
  shopUsage: document.querySelector("#shopUsage"),
  resultMonth: document.querySelector("#resultMonth"),
  resultStatus: document.querySelector("#resultStatus"),
  totalBill: document.querySelector("#totalBill"),
  yourUnits: document.querySelector("#yourUnits"),
  otherUnits: document.querySelector("#otherUnits"),
  yourShare: document.querySelector("#yourShare"),
  otherShare: document.querySelector("#otherShare"),
  yourPercent: document.querySelector("#yourPercent"),
  otherPercent: document.querySelector("#otherPercent"),
  yourBar: document.querySelector("#yourBar"),
  otherBar: document.querySelector("#otherBar"),
  resultFootnote: document.querySelector("#resultFootnote"),
  formError: document.querySelector("#formError"),
  historyList: document.querySelector("#historyList"),
  historyCount: document.querySelector("#historyCount"),
};

const STORAGE_KEY = "metermate.savedBills";
const DRAFT_STORAGE_KEY = "metermate.currentDraft";
const formatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
let currentCalculation = null;
let toastTimer;

const currentMonth = new Date();
fields.billingMonth.value = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;

function restoreDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_STORAGE_KEY) || "null");
    if (!draft || typeof draft !== "object") return;

    if (typeof draft.month === "string" && /^\d{4}-\d{2}$/.test(draft.month)) {
      fields.billingMonth.value = draft.month;
    }
    fields.mainUnits.value = draft.mainUnits ?? "";
    fields.shopOld.value = draft.shopOld ?? "";
    fields.shopNew.value = draft.shopNew ?? "";
    fields.billAmount.value = draft.billAmount ?? "";
  } catch (error) {
    setDraftStatus("Saved entry could not be restored on this device.", true);
    console.error("Could not restore the current bill draft:", error);
  }
}

function saveDraft() {
  const draft = {
    month: fields.billingMonth.value,
    mainUnits: fields.mainUnits.value,
    shopOld: fields.shopOld.value,
    shopNew: fields.shopNew.value,
    billAmount: fields.billAmount.value,
  };

  try {
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
    setDraftStatus("Your current entry saves automatically on this device.");
  } catch (error) {
    setDraftStatus("Could not save your current entry on this device.", true);
    console.error("Could not save the current bill draft:", error);
  }
}

function setDraftStatus(message, isError = false) {
  const status = document.querySelector("#draftStatus");
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function numericValue(field) {
  if (field.value.trim() === "") return null;
  const value = Number(field.value);
  return Number.isFinite(value) ? value : null;
}

function formatUnits(value) {
  return `${formatter.format(value)} ${value === 1 ? "unit" : "units"}`;
}

function formatMoney(value) {
  return currencyFormatter.format(value);
}

function getMonthLabel(month) {
  if (!month) return "Select a month";
  const [year, number] = month.split("-").map(Number);
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(year, number - 1, 1));
}

function getCalculation() {
  const mainUnits = numericValue(fields.mainUnits);
  const shopOld = numericValue(fields.shopOld);
  const shopNew = numericValue(fields.shopNew);
  const bill = numericValue(fields.billAmount);
  const anyReading = [mainUnits, shopOld, shopNew].some((value) => value !== null);

  if (!anyReading && bill === null) return { status: "empty" };
  if ([mainUnits, shopOld, shopNew].some((value) => value === null)) {
    return { status: "incomplete", message: "Enter this month’s main-meter units and both sub-meter readings." };
  }
  if (bill === null || bill < 0) {
    return { status: "incomplete", message: "Enter the total bill amount." };
  }
  if (!fields.billingMonth.value) {
    return { status: "incomplete", message: "Select the billing month." };
  }
  if ([mainUnits, shopOld, shopNew].some((value) => value < 0)) {
    return { status: "invalid", message: "Meter units and readings cannot be negative." };
  }

  const yourUnits = shopNew - shopOld;
  if (yourUnits < 0) {
    return { status: "invalid", message: "Your current sub-meter reading is below the previous reading. Check the readings or meter reset." };
  }
  if (yourUnits > mainUnits) {
    return { status: "invalid", message: "Your sub-meter usage cannot exceed the main-meter usage." };
  }
  if (mainUnits === 0 && bill > 0) {
    return { status: "invalid", message: "The main meter shows no usage, so the bill cannot be split. Check the readings." };
  }

  const otherUnits = mainUnits - yourUnits;
  const yourAmount = mainUnits === 0 ? 0 : Math.round((bill * yourUnits / mainUnits) * 100) / 100;
  const otherAmount = Math.round((bill - yourAmount) * 100) / 100;
  const yourPercent = mainUnits === 0 ? 0 : (yourUnits / mainUnits) * 100;
  return {
    status: "valid",
    month: fields.billingMonth.value,
    mainUnits,
    yourUnits,
    otherUnits,
    bill,
    yourAmount,
    otherAmount,
    yourPercent,
    otherPercent: mainUnits === 0 ? 0 : 100 - yourPercent,
  };
}

function render() {
  const result = getCalculation();
  currentCalculation = result.status === "valid" ? result : null;
  output.formError.textContent = result.message || "";
  output.shopUsage.innerHTML = result.yourUnits === undefined ? "— <small>units</small>" : `${formatter.format(result.yourUnits)} <small>units</small>`;
  output.resultMonth.textContent = getMonthLabel(fields.billingMonth.value);
  output.totalBill.textContent = result.bill === undefined ? "₹—" : formatMoney(result.bill);
  output.yourUnits.textContent = result.yourUnits === undefined ? "— units" : formatUnits(result.yourUnits);
  output.otherUnits.textContent = result.otherUnits === undefined ? "— units" : formatUnits(result.otherUnits);
  output.yourShare.textContent = result.yourAmount === undefined ? "₹—" : formatMoney(result.yourAmount);
  output.otherShare.textContent = result.otherAmount === undefined ? "₹—" : formatMoney(result.otherAmount);
  output.yourPercent.textContent = result.yourPercent === undefined ? "—%" : `${result.yourPercent.toFixed(1)}%`;
  output.otherPercent.textContent = result.otherPercent === undefined ? "—%" : `${result.otherPercent.toFixed(1)}%`;
  output.yourBar.style.width = `${result.yourPercent ?? 50}%`;
  output.otherBar.style.width = `${result.otherPercent ?? 50}%`;

  const ready = result.status === "valid";
  output.resultStatus.classList.toggle("ready", ready);
  output.resultStatus.innerHTML = `<span></span> ${ready ? "SPLIT READY" : result.status === "invalid" ? "CHECK READINGS" : "AWAITING READINGS"}`;
  document.querySelector("#downloadButton").disabled = !ready;

  output.resultFootnote.classList.toggle("warning", ready && result.otherUnits === 0);
  if (result.status === "valid") {
    output.resultFootnote.textContent = result.mainUnits === 0
      ? "There were no units used in this billing period."
      : result.otherUnits === 0
        ? "Your shop used all the units recorded by the main meter."
      : `The full bill is split across ${formatter.format(result.mainUnits)} main-meter units.`;
  } else {
    output.resultFootnote.textContent = result.message || "Enter both meters’ readings to see the split.";
  }
}

function readSavedBills() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter((entry) => entry && typeof entry.month === "string") : [];
  } catch (error) {
    showToast("Saved bills could not be read from this browser.");
    console.error("Could not read saved bills:", error);
    return [];
  }
}

function saveBills(bills) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
    return true;
  } catch (error) {
    showToast("Could not save this bill in your browser.");
    console.error("Could not save bill:", error);
    return false;
  }
}

function renderHistory() {
  const bills = readSavedBills().sort((a, b) => b.month.localeCompare(a.month));
  output.historyCount.textContent = String(bills.length);
  if (bills.length === 0) {
    output.historyList.innerHTML = '<p class="empty-history">Your saved bills will show up here.</p>';
    return;
  }

  output.historyList.innerHTML = "";
  for (const bill of bills) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "history-item";
    button.innerHTML = `<span><strong>${escapeHtml(getMonthLabel(bill.month))}</strong><small>${escapeHtml(formatUnits(bill.mainUnits))} · ${escapeHtml(bill.yourShopName)}</small></span><span class="history-share"><strong>${escapeHtml(formatMoney(bill.bill))}</strong><small>${escapeHtml(formatMoney(bill.yourAmount))} your share</small></span>`;
    button.addEventListener("click", () => loadBill(bill));
    output.historyList.append(button);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function loadBill(bill) {
  fields.billingMonth.value = bill.month;
  fields.mainUnits.value = bill.mainUnits;
  fields.shopOld.value = bill.shopOld;
  fields.shopNew.value = bill.shopNew;
  fields.billAmount.value = bill.bill;
  saveDraft();
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
  showToast(`${getMonthLabel(bill.month)} loaded.`);
}

function saveCurrentBill() {
  const result = getCalculation();
  if (result.status !== "valid") {
    render();
    showToast(result.message || "Enter the readings and bill amount first.");
    return;
  }

  const bills = readSavedBills();
  const entry = {
    ...result,
    shopOld: numericValue(fields.shopOld),
    shopNew: numericValue(fields.shopNew),
    yourShopName: "Your shop",
    otherShopName: "Other shop",
    savedAt: new Date().toISOString(),
  };
  const existingIndex = bills.findIndex((bill) => bill.month === entry.month);
  if (existingIndex >= 0) bills[existingIndex] = entry;
  else bills.push(entry);

  if (saveBills(bills)) {
    renderHistory();
    showToast(`${getMonthLabel(result.month)} bill saved.`);
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function drawText(context, text, x, y, font, color, align = "left") {
  context.font = font;
  context.fillStyle = color;
  context.textAlign = align;
  context.fillText(text, x, y);
}

function roundedRect(context, x, y, width, height, radius, fill) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
}

function downloadBillImage() {
  if (!currentCalculation) return;
  const result = currentCalculation;
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 1500;
  const context = canvas.getContext("2d");
  if (!context) {
    showToast("Your browser could not create the bill image.");
    return;
  }

  context.fillStyle = "#f4f6f2";
  context.fillRect(0, 0, canvas.width, canvas.height);
  roundedRect(context, 72, 70, 1056, 1360, 34, "#ffffff");
  roundedRect(context, 110, 108, 58, 58, 17, "#197355");
  context.save();
  context.translate(139, 137);
  context.fillStyle = "#fff";
  context.beginPath();
  context.moveTo(7, -20);
  context.lineTo(-11, 3);
  context.lineTo(1, 3);
  context.lineTo(-3, 23);
  context.lineTo(14, -5);
  context.lineTo(2, -5);
  context.closePath();
  context.fill();
  context.restore();
  drawText(context, "metermate.", 184, 147, "800 29px Manrope, Arial, sans-serif", "#172922");
  drawText(context, "ELECTRICITY BILL SPLIT", 1090, 143, "700 14px Arial, sans-serif", "#87928c", "right");
  context.strokeStyle = "#e9eee8";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(110, 198);
  context.lineTo(1090, 198);
  context.stroke();

  drawText(context, "MONTHLY SETTLEMENT", 110, 258, "700 15px Arial, sans-serif", "#197355");
  drawText(context, getMonthLabel(result.month), 110, 316, "700 38px Manrope, Arial, sans-serif", "#172922");
  drawText(context, "A clear breakdown of electricity usage for both shops.", 110, 355, "400 17px Arial, sans-serif", "#78847e");

  roundedRect(context, 110, 400, 980, 156, 18, "#f5f8f4");
  drawText(context, "TOTAL ELECTRICITY BILL", 144, 447, "700 13px Arial, sans-serif", "#89948e");
  drawText(context, formatMoney(result.bill), 144, 515, "700 43px Manrope, Arial, sans-serif", "#172922");
  drawText(context, `${formatUnits(result.mainUnits)} on main meter`, 1052, 505, "600 17px Arial, sans-serif", "#78847e", "right");

  drawText(context, "BILL SHARE", 110, 628, "700 13px Arial, sans-serif", "#89948e");
  context.strokeStyle = "#e9eee8";
  context.beginPath();
  context.moveTo(110, 656);
  context.lineTo(1090, 656);
  context.stroke();

  const shareRows = [
    { name: "Your shop", units: result.yourUnits, amount: result.yourAmount, percent: result.yourPercent, color: "#e9f4ee", ink: "#197355", letter: "Y" },
    { name: "Other shop", units: result.otherUnits, amount: result.otherAmount, percent: result.otherPercent, color: "#f8f1e9", ink: "#a9713e", letter: "2" },
  ];
  shareRows.forEach((row, index) => {
    const rowY = 725 + index * 153;
    roundedRect(context, 112, rowY - 29, 55, 55, 15, row.color);
    drawText(context, row.letter, 139, rowY + 8, "700 20px Manrope, Arial, sans-serif", row.ink, "center");
    drawText(context, row.name, 194, rowY - 3, "700 22px Manrope, Arial, sans-serif", "#304239");
    drawText(context, `${formatUnits(row.units)}  ·  ${row.percent.toFixed(1)}% of usage`, 194, rowY + 29, "400 16px Arial, sans-serif", "#89948e");
    drawText(context, formatMoney(row.amount), 1088, rowY + 3, "700 27px Manrope, Arial, sans-serif", "#172922", "right");
    context.strokeStyle = "#eef1ed";
    context.beginPath();
    context.moveTo(194, rowY + 62);
    context.lineTo(1090, rowY + 62);
    context.stroke();
  });

  roundedRect(context, 110, 1046, 980, 15, 8, "#e69a51");
  if (result.yourPercent > 0) {
    roundedRect(context, 110, 1046, Math.max(15, 980 * result.yourPercent / 100), 15, 8, "#197355");
  }

  roundedRect(context, 110, 1115, 980, 181, 18, "#f2f6f1");
  drawText(context, "HOW IT’S CALCULATED", 143, 1160, "700 13px Arial, sans-serif", "#197355");
  drawText(context, "Your shop’s units come from its sub-meter.", 143, 1201, "400 16px Arial, sans-serif", "#52635a");
  drawText(context, "Other shop’s units = main-meter units − your shop’s units.", 143, 1232, "400 16px Arial, sans-serif", "#52635a");
  drawText(context, "Each shop pays in proportion to the units it used.", 143, 1263, "400 16px Arial, sans-serif", "#52635a");

  drawText(context, "MeterMate  ·  Saved bill for your records", 110, 1364, "500 14px Arial, sans-serif", "#929c96");
  drawText(context, "Readings stay on your device", 1090, 1364, "500 14px Arial, sans-serif", "#929c96", "right");

  canvas.toBlob((blob) => {
    if (!blob) {
      showToast("The bill image could not be created. Please try again.");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `electricity-bill-${result.month || "split"}.jpg`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Your bill image is ready to share.");
  }, "image/jpeg", 0.95);
}

for (const field of Object.values(fields)) {
  field.addEventListener("input", () => {
    saveDraft();
    render();
  });
  field.addEventListener("change", () => {
    saveDraft();
    render();
  });
}
document.querySelector("#saveButton").addEventListener("click", saveCurrentBill);
document.querySelector("#downloadButton").addEventListener("click", downloadBillImage);
restoreDraft();
render();
renderHistory();
