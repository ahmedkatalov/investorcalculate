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
  .sort((a, b) => {
    // сортируем сначала по месяцу
    if (a.periodMonth < b.periodMonth) return -1;
    if (a.periodMonth > b.periodMonth) return 1;
    // затем по ID (порядок операций внутри месяца)
    return a.id - b.id;
  })
  .map(p => {
    let type = "";

    if (!p.reinvest && !p.isWithdrawalCapital && !p.isWithdrawalProfit && p.payoutAmount > 0) {
      type = "Пополнение капитала";
    } else if (p.reinvest) {
      type = "Реинвест";
    } else if (p.isWithdrawalCapital) {
      type = "Снятие капитала";
    } else if (p.isWithdrawalProfit) {
      type = "Снятие прибыли";
    } else {
      type = "Операция";
    }

    const formattedMonth = p.periodMonth
      ? new Date(p.periodMonth + "-01").toLocaleDateString("ru-RU", {
          month: "short",
          year: "2-digit",
        })
      : "";

    const sign = p.payoutAmount > 0 ? "+" : "";
    const fmt = v => new Intl.NumberFormat("ru-RU").format(v);

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
      fontStyle: "normal",
    },
    styles: {
      font: "Montserrat",
      fontStyle: "normal",
    }
  });

  return doc.output("blob");
}
