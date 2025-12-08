import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Загружаем шрифт Montserrat из public/fonts
async function loadFont() {
  const url = "/fonts/Montserrat.ttf";
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  let binary = "";
  new Uint8Array(buf).forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

// формат ₽
const fmt = (v) =>
  new Intl.NumberFormat("ru-RU").format(Number(v || 0));

/**
 * Генерация PDF отчёта для инвестора
 */
export async function generateInvestorPdfBlob({
  investor,
  payouts,
  getCapitalNow,
  getCurrentNetProfit,
  getTotalProfitAllTime,
  withdrawnTotal,
  getTopupsTotal,
}) {
  if (!investor) return null;

  // загрузка шрифта
  const fontBase64 = await loadFont();

  const doc = new jsPDF("p", "pt", "a4");
  doc.addFileToVFS("Montserrat.ttf", fontBase64);
  doc.addFont("Montserrat.ttf", "Montserrat", "normal");
  doc.setFont("Montserrat");

  //
  // ===== ШАПКА =====
  //
  doc.setFontSize(22).text("Отчёт по инвестору", 40, 60);
  doc.setFontSize(17).text(investor.fullName || "Без имени", 40, 95);

  doc.setFontSize(12);
  doc.text(`ID: ${investor.id}`, 40, 125);

  if (investor.createdAt) {
    const created = new Date(investor.createdAt).toLocaleDateString("ru-RU");
    doc.text(`Создан: ${created}`, 40, 145);
  }

  //
  // ===== ФИНАНСЫ =====
  //
  const capital = getCapitalNow(investor);
  const netProfit = getCurrentNetProfit(investor); // чистая прибыль
  const profitReal = getTotalProfitAllTime(investor.id); // начисленная прибыль
  const withdrawn = withdrawnTotal(investor.id); // снятые деньги
  const topups = getTopupsTotal(investor.id); // пополнения

  const summary = [
    ["Вложено", fmt(investor.investedAmount) + " ₽"],
    ["Пополнения за всё время", fmt(topups) + " ₽"],
    ["Капитал сейчас", fmt(capital) + " ₽"],
    ["Чистая прибыль сейчас", fmt(netProfit) + " ₽"],
    ["Прибыль за всё время (без пополнений)", fmt(profitReal) + " ₽"],
    ["Всего снято", fmt(withdrawn) + " ₽"],
  ];

  autoTable(doc, {
    startY: 180,
    head: [["Показатель", "Значение"]],
    body: summary,
    theme: "striped",
    styles: {
      font: "Montserrat",
      fontSize: 12,
    },
    headStyles: {
      fillColor: [34, 197, 94], // зелёный
      fontSize: 13,
      textColor: 255,
    },
    columnStyles: {
      0: { cellWidth: 260 },
      1: { cellWidth: 180, halign: "right" },
    },
    margin: { left: 40, right: 40 },
  });

  //
  // ===== ИСТОРИЯ ОПЕРАЦИЙ =====
  //
  const rows = payouts
    .filter((p) => p.investorId === investor.id)
    .sort((a, b) => {
      if (a.periodMonth < b.periodMonth) return -1;
      if (a.periodMonth > b.periodMonth) return 1;
      return a.id - b.id;
    })
    .map((p) => {
      let type = p.isTopup
        ? "Пополнение капитала"
        : p.reinvest
        ? "Реинвест"
        : p.isWithdrawalCapital
        ? "Снятие капитала"
        : p.isWithdrawalProfit
        ? "Снятие прибыли"
        : "Операция";

      const date = p.periodMonth
        ? new Date(p.periodMonth + "-01").toLocaleDateString("ru-RU", {
            month: "short",
            year: "2-digit",
          })
        : "";

      const amount =
        (p.payoutAmount > 0 ? "+" : "") +
        fmt(Math.abs(p.payoutAmount)) +
        " ₽";

      return [date, type, amount];
    });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 40,
    head: [["Месяц", "Тип операции", "Сумма"]],
    body: rows,
    theme: "grid",
    styles: { font: "Montserrat", fontSize: 12 },
    headStyles: {
      fillColor: [59, 130, 246], // синий
      textColor: 255,
    },
    columnStyles: {
      0: { cellWidth: 90 },
      1: { cellWidth: 260 },
      2: { cellWidth: 100, halign: "right" },
    },
    margin: { left: 40, right: 40 },
  });

  return doc.output("blob");
}
