import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Загружаем шрифт Montserrat из public/fonts
async function loadFont() {
  const url = "/fonts/Montserrat.ttf";
  const buf = await fetch(url).then(r => r.arrayBuffer());
  let binary = "";
  const bytes = new Uint8Array(buf);
  bytes.forEach(b => (binary += String.fromCharCode(b)));
  return btoa(binary);
}

// Формат ₽
const fmt = (v) => new Intl.NumberFormat("ru-RU").format(v);

/**
 * Генерация красивого PDF отчёта одного инвестора
 */
export async function generateInvestorPdfBlob({
  investor,
  payouts,
  getCapitalNow,
  getCurrentNetProfit,
  getTotalProfitAllTime,
  withdrawnTotal,
  getTopupsTotal,    // ← ДОБАВИЛИ!
}) {
  const fontBase64 = await loadFont();

  const doc = new jsPDF("p", "pt", "a4");
  doc.addFileToVFS("Montserrat.ttf", fontBase64);
  doc.addFont("Montserrat.ttf", "Montserrat", "normal");
  doc.setFont("Montserrat");

  //
  // ===== ЗАГОЛОВОК =====
  //
  doc.setFontSize(22);
  doc.text("Отчёт по инвестору", 40, 60);

  doc.setFontSize(18);
  doc.text(investor.fullName || "Без имени", 40, 90);

  //
  // ===== РАСЧЁТЫ =====
  //
  const capital = getCapitalNow(investor);
  const netProfit = getCurrentNetProfit(investor); // ← уже без пополнений
  const totalProfitReal = getTotalProfitAllTime(investor.id); // чистая прибыль
  const withdrawn = withdrawnTotal(investor.id);
  const topups = getTopupsTotal(investor.id); // ← новые данные!

  //
  // ===== ОСНОВНАЯ ТАБЛИЦА =====
  //
  const summary = [
    ["Вложено", fmt(investor.investedAmount) + " ₽"],
    ["Пополнения капитала (все время)", fmt(topups) + " ₽"], // ← НОВОЕ
    ["Капитал сейчас", fmt(capital) + " ₽"],
    ["Чистая прибыль сейчас", fmt(netProfit) + " ₽"], // уже верно
    ["Прибыль за всё время", fmt(totalProfitReal) + " ₽"],
    ["Всего снято", fmt(withdrawn) + " ₽"],
  ];

  autoTable(doc, {
    startY: 140,
    head: [["Показатель", "Значение"]],
    body: summary,
    theme: "striped",
    headStyles: {
      fillColor: [34, 197, 94],
      font: "Montserrat",
    },
    styles: {
      font: "Montserrat",
      fontSize: 12,
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

      // тип операции
      if (p.isTopup) type = "Пополнение капитала";
      else if (p.reinvest) type = "Реинвест";
      else if (p.isWithdrawalCapital) type = "Снятие капитала";
      else if (p.isWithdrawalProfit) type = "Снятие прибыли";
      else type = "Операция";

      // красивый месяц
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

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 30,
    head: [["Месяц", "Тип операции", "Сумма"]],
    body: rows,
    theme: "grid",
    headStyles: {
      fillColor: [59, 130, 246],
      font: "Montserrat",
    },
    styles: {
      font: "Montserrat",
      fontSize: 12,
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 250 },
      2: { cellWidth: 80, halign: "right" },
    },
  });

  return doc.output("blob");
}
