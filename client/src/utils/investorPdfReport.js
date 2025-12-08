// client/src/utils/investorPdfReport.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// загружаем Montserrat из public/fonts/Montserrat.ttf
async function loadFont() {
  const url = "/fonts/Montserrat.ttf";
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  let binary = "";
  const bytes = new Uint8Array(buf);
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

// Формат ₽ с пробелами
const fmt = (v) => new Intl.NumberFormat("ru-RU").format(v);

/**
 * Генерация красивого PDF отчёта для одного инвестора
 *
 * Обрати внимание: сюда должны приходить:
 * - withdrawnTotal: ФУНКЦИЯ (id) => число
 * - getTopupsTotal: ФУНКЦИЯ (id) => число
 */
export async function generateInvestorPdfBlob({
  investor,
  payouts,
  getCapitalNow,
  getCurrentNetProfit,
  getTotalProfitAllTime,
  withdrawnTotal,   // функция: (id) => сумма снятий
  getTopupsTotal,   // функция: (id) => сумма пополнений
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
  doc.text(investor.fullName || "Без имени", 40, 90);

  // 👉 ID убрали, оставляем только дату создания (если надо)
  let summaryStartY = 130;

  if (investor.createdAt) {
    const created = new Date(investor.createdAt).toLocaleDateString("ru-RU");
    doc.setFontSize(11);
    doc.text(`Создан: ${created}`, 40, 110);
    summaryStartY = 140;
  }

  //
  // ===== РАСЧЁТЫ =====
  //
  const capital = getCapitalNow(investor);                 // капитал с учётом пополнений
  const netProfit = getCurrentNetProfit(investor);         // чистая прибыль БЕЗ пополнений
  const totalProfitReal = getTotalProfitAllTime(investor.id); // прибыль за всё время (без пополнений)
  const withdrawn = withdrawnTotal(investor.id);           // всего снято (прибыль + капитал)
  const topups = getTopupsTotal(investor.id);              // сумма пополнений капитала

  //
  // ===== ОСНОВНАЯ ТАБЛИЦА =====
  //
  const summary = [
    ["Вложено", `${fmt(investor.investedAmount)} ₽`],
    ["Пополнения за всё время", `${fmt(topups)} ₽`],
    ["Капитал сейчас", `${fmt(capital)} ₽`],
    ["Чистая прибыль сейчас", `${fmt(netProfit)} ₽`],
    ["Прибыль за всё время (без пополнений)", `${fmt(totalProfitReal)} ₽`],
    ["Всего снято", `${fmt(withdrawn)} ₽`],
  ];

  autoTable(doc, {
    startY: summaryStartY,
    head: [["Показатель", "Значение"]],
    body: summary,
    theme: "striped",
    margin: { left: 40, right: 40 },

    // ❗ ВАЖНО: везде явно fontStyle: "normal",
    // чтобы не было кракозябр в шапках
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
  // ===== ТАБЛИЦА ОПЕРАЦИЙ ПО МЕСЯЦАМ =====
  //
  const rows = payouts
    .filter((p) => p.investorId === investor.id)
    .sort((a, b) => {
      if (a.periodMonth < b.periodMonth) return -1;
      if (a.periodMonth > b.periodMonth) return 1;
      return a.id - b.id;
    })
    .map((p) => {
      let type = "";

      if (p.isTopup) type = "Пополнение капитала";
      else if (p.reinvest) type = "Реинвест";
      else if (p.isWithdrawalCapital) type = "Снятие капитала";
      else if (p.isWithdrawalProfit) type = "Снятие прибыли";
      else type = "Операция";

      const formattedMonth = p.periodMonth
        ? new Date(p.periodMonth + "-01").toLocaleDateString("ru-RU", {
            month: "short",
            year: "2-digit",
          })
        : "";

      const sign = p.payoutAmount > 0 ? "+" : "";
      const amount = `${sign}${fmt(Math.abs(p.payoutAmount))} ₽`;

      return [formattedMonth, type, amount];
    });

  const operationsStartY =
    (doc.lastAutoTable && doc.lastAutoTable.finalY + 30) ||
    summaryStartY + 30;

  autoTable(doc, {
    startY: operationsStartY,
    head: [["Месяц", "Тип операции", "Сумма"]],
    body: rows,
    theme: "grid",
    margin: { left: 40, right: 40 },

    headStyles: {
      fillColor: [59, 130, 246],
      font: "Montserrat",
      fontStyle: "normal", // ❗ фикс кракозябр
      textColor: 255,
    },
    styles: {
      font: "Montserrat",
      fontStyle: "normal",
      fontSize: 12,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 260 },
      2: { cellWidth: 80, halign: "right" },
    },
  });

  return doc.output("blob");
}
