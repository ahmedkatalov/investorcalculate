// client/src/utils/investorPdfReport.js
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ===============================
//   Подключение шрифта Montserrat
// ===============================
async function loadFont() {
  const url = "/fonts/Montserrat.ttf";
  const buf = await fetch(url).then((r) => r.arrayBuffer());
  return btoa(
    new Uint8Array(buf).reduce((acc, b) => acc + String.fromCharCode(b), "")
  );
}

// Формат ₽
const fmt = (v) => new Intl.NumberFormat("ru-RU").format(v);

// Универсальный парсер даты
function parseAnyDate(p) {
  if (!p) return null;

  if (typeof p === "string" && p.length === 10) return new Date(p);
  if (p.periodDate) return new Date(p.periodDate);
  if (p.periodMonth) return new Date(p.periodMonth + "-01");

  return null;
}

// ===============================
//   Основная функция генерации PDF
// ===============================
export async function generateInvestorPdfBlob({
  investor,
  payouts,
  getCapitalNow,
  getCurrentNetProfit,
  withdrawnTotal,
  getTopupsTotal,
}) {
  // Загружаем шрифт
  const fontBase64 = await loadFont();

  const doc = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });

  // Регистрируем Montserrat с поддержкой Identity-H (КИРИЛЛИЦА)
  doc.addFileToVFS("Montserrat.ttf", fontBase64);
  doc.addFont("Montserrat.ttf", "Montserrat", "normal", "Identity-H");
  doc.setFont("Montserrat", "normal");

  // =======================
  //   Заголовок
  // =======================
  doc.setFontSize(22);
  doc.text("Отчёт по инвестору", 40, 60);

  doc.setFontSize(18);
  doc.text(investor.fullName || "Без имени", 40, 95);

  if (investor.createdAt) {
    const created = new Date(investor.createdAt).toLocaleDateString("ru-RU");
    doc.setFontSize(11);
    doc.text(`Создан: ${created}`, 40, 120);
  }

  // =======================
  //   Рассчитанные показатели
  // =======================
  const invested = investor.investedAmount;
  const capital = getCapitalNow(investor);
  const profitNow = getCurrentNetProfit(investor);
  const topups = getTopupsTotal(investor.id);
  const withdrawn = withdrawnTotal(investor.id);

  const summary = [
    ["Вложено", `${fmt(invested)} ₽`],
    ["Пополнения за всё время", `${fmt(topups)} ₽`],
    ["Капитал сейчас", `${fmt(capital)} ₽`],
    ["Чистая прибыль сейчас", `${fmt(profitNow)} ₽`],
    ["Всего снято", `${fmt(withdrawn)} ₽`],
  ];

  // =======================
  //   Таблица СВОДКИ
  // =======================
  autoTable(doc, {
    startY: 150,
    head: [["Показатель", "Значение"]],
    body: summary,
    theme: "striped",
    margin: { left: 40, right: 40 },

    headStyles: {
      fillColor: [34, 197, 94], // зелёный
      textColor: 255,
      font: "Montserrat",
      fontStyle: "normal",
      encoding: "Identity-H",
    },

    styles: {
      font: "Montserrat",
      fontStyle: "normal",
      encoding: "Identity-H",
      fontSize: 12,
    },

    columnStyles: {
      0: { cellWidth: 260 },
      1: { cellWidth: 200 },
    },
  });

  // =======================
  //   Таблица ОПЕРАЦИЙ
  // =======================
  const rows = payouts
    .filter((p) => p.investorId === investor.id)
    .sort((a, b) => {
      const da = parseAnyDate(a);
      const db = parseAnyDate(b);
      return da - db;
    })
    .map((p) => {
      let type = "";
      if (p.isTopup) type = "Пополнение капитала";
      else if (p.reinvest) type = "Реинвест";
      else if (p.isWithdrawalCapital) type = "Снятие капитала";
      else if (p.isWithdrawalProfit) type = "Снятие прибыли";
      else type = "Операция";

      const d = parseAnyDate(p);
      const label = d
        ? d.toLocaleDateString("ru-RU", {
            day: "numeric",
            month: "short",
            year: "2-digit",
          })
        : "—";

      const sign = p.payoutAmount > 0 ? "+" : "-";

      return [label, type, `${sign}${fmt(Math.abs(p.payoutAmount))} ₽`];
    });

  autoTable(doc, {
    startY: doc.lastAutoTable.finalY + 40,
    head: [["Дата", "Тип операции", "Сумма"]],
    body: rows,
    theme: "grid",
    margin: { left: 40, right: 40 },

    headStyles: {
      fillColor: [59, 130, 246], // синий
      textColor: 255,
      font: "Montserrat",
      fontStyle: "normal",
      encoding: "Identity-H",
    },

    styles: {
      font: "Montserrat",
      fontStyle: "normal",
      encoding: "Identity-H",
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
