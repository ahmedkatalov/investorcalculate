// investorPdfReport.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Загружаем шрифт Montserrat из public/fonts
async function loadFont() {
  const url = "/fonts/Montserrat.ttf";
  const buf = await fetch(url).then(r => r.arrayBuffer());
  let binary = "";
  const bytes = new Uint8Array(buf);
  bytes.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

// Генерация PDF и возврат Blob (для Share API)
export async function generateInvestorPdfBlob({
  investor,
  payouts,
  getCapitalNow,
  getCurrentNetProfit,
  getTotalProfitAllTime,
  withdrawnTotal,
}) {
  const fontBase64 = await loadFont();

  const doc = new jsPDF("p", "pt", "a4");
  doc.addFileToVFS("Montserrat.ttf", fontBase64);
  doc.addFont("Montserrat.ttf", "Montserrat", "normal");
  doc.setFont("Montserrat");

  // Заголовок
  doc.setFontSize(22);
  doc.text("Отчёт по инвестору", 40, 60);

  doc.setFontSize(18);
  doc.text(investor.fullName || "Без имени", 40, 90);

  const capital = getCapitalNow(investor);
  const netProfit = getCurrentNetProfit(investor);
  const totalProfitAll = getTotalProfitAllTime(investor.id);

  // Основная таблица
  const summary = [
    ["Вложено", investor.investedAmount + " ₽"],
    ["Капитал сейчас", capital + " ₽"],
    ["Чистая прибыль сейчас", netProfit + " ₽"],
    ["Прибыль за всё время", totalProfitAll + " ₽"],
    ["Всего снято", withdrawnTotal + " ₽"],
  ];

  autoTable(doc, {
    startY: 140,
    head: [["Показатель", "Значение"]],
    body: summary,
    theme: "striped",
    headStyles: {
      fillColor: [34, 197, 94],
      font: "Montserrat",
      fontStyle: "normal",
    },
    styles: {
      font: "Montserrat",
      fontStyle: "normal",
    }
  });

  // Таблица месяцев
  const rows = payouts
    .filter(p => p.investorId === investor.id)
    .map(p => [
      p.periodMonth,
      p.reinvest
        ? "Реинвест"
        : p.isWithdrawalCapital
        ? "Снятие капитала"
        : "Снятие прибыли",
      (p.payoutAmount > 0 ? "+" : "") + p.payoutAmount + " ₽",
    ]);

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 30,
    head: [["Месяц", "Тип операции", "Сумма"]],
    body: rows,
    theme: "grid",
    headStyles: {
      fillColor: [59, 130, 246],
      font: "Montserrat",
      fontStyle: "normal",
    },
    styles: {
      font: "Montserrat",
      fontStyle: "normal",
    }
  });

  return doc.output("blob");
}
