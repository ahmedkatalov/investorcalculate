// client/src/utils/investorPdfReport.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Загружаем Montserrat из public/fonts/Montserrat.ttf
async function loadFont() {
  const url = "/fonts/Montserrat.ttf";
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  let binary = "";
  const bytes = new Uint8Array(buf);
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

// Формат ₽
const fmt = (v) => new Intl.NumberFormat("ru-RU").format(v);

// Универсальный парсер даты
function parseAnyDate(str) {
  if (!str) return null;

  // Полный формат YYYY-MM-DD
  if (str.length === 10) return new Date(str);

  // Только YYYY-MM
  if (str.length === 7) return new Date(str + "-01");

  return null;
}

export async function generateInvestorPdfBlob({
  investor,
  payouts,
  getCapitalNow,
  getCurrentNetProfit,
  withdrawnTotal,
  getTopupsTotal,
}) {
  const fontBase64 = await loadFont();

  const doc = new jsPDF("p", "pt", "a4");
  doc.addFileToVFS("Montserrat.ttf", fontBase64);
  doc.addFont("Montserrat.ttf", "Montserrat", "normal");
  doc.setFont("Montserrat", "normal");

  //
  // ===== ЗАГОЛОВОК =====
  //
  doc.setFontSize(22);
  doc.text("Отчёт по инвестору", 40, 60);

  doc.setFontSize(18);
  doc.text(investor.fullName || "Без имени", 40, 95);

  // Дата создания инвестора
  if (investor.createdAt) {
    const created = new Date(investor.createdAt).toLocaleDateString("ru-RU");
    doc.setFontSize(11);
    doc.text(`Создан: ${created}`, 40, 120);
  }

  //
  // ===== РАСЧЁТЫ =====
  //
  const invested = investor.investedAmount;
  const capital = getCapitalNow(investor);
  const profitNow = getCurrentNetProfit(investor);
  const topups = getTopupsTotal(investor.id);
  const withdrawn = withdrawnTotal(investor.id);

  //
  // ===== ТАБЛИЦА ИТОГОВ =====
  //
  const summary = [
    ["Вложено", `${fmt(invested)} ₽`],
    ["Пополнения за всё время", `${fmt(topups)} ₽`],
    ["Капитал сейчас", `${fmt(capital)} ₽`],
    ["Чистая прибыль сейчас", `${fmt(profitNow)} ₽`],
    ["Всего снято", `${fmt(withdrawn)} ₽`],
  ];

  autoTable(doc, {
    startY: 150,
    head: [["Показатель", "Значение"]],
    body: summary,
    theme: "striped",
    margin: { left: 40, right: 40 },
    headStyles: {
      fillColor: [34, 197, 94],
      font: "Montserrat",
      fontStyle: "normal",
      textColor: 255,
    },
    styles: {
      font: "Montserrat",
      fontStyle: "normal",
      fontSize: 12,
    },
    columnStyles: {
      0: { cellWidth: 260 },
      1: { cellWidth: 200 },
    },
  });

  //
  // ===== ТАБЛИЦА ОПЕРАЦИЙ =====
  //
  const rows = payouts
    .filter((p) => p.investorId === investor.id)
    .sort((a, b) => (a.periodMonth < b.periodMonth ? -1 : 1))
    .map((p) => {
      let type = "";
      if (p.isTopup) type = "Пополнение капитала";
      else if (p.reinvest) type = "Реинвест";
      else if (p.isWithdrawalCapital) type = "Снятие капитала";
      else if (p.isWithdrawalProfit) type = "Снятие прибыли";
      else type = "Операция";

      const date = parseAnyDate(p.periodMonth);
      const formatted = date
        ? date.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short",
            year: "2-digit",
          })
        : "";

      const sign = p.payoutAmount > 0 ? "+" : "";
      const amount = `${sign}${fmt(Math.abs(p.payoutAmount))} ₽`;

      return [formatted, type, amount];
    });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 40,
    head: [["Дата", "Тип операции", "Сумма"]],
    body: rows,
    theme: "grid",
    margin: { left: 40, right: 40 },

    headStyles: {
      fillColor: [59, 130, 246],
      font: "Montserrat",
      fontStyle: "normal",
      textColor: 255,
    },
    styles: {
      font: "Montserrat",
      fontStyle: "normal",
      fontSize: 12,
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 250 },
      2: { cellWidth: 80, halign: "right" },
    },
  });

  return doc.output("blob");
}
