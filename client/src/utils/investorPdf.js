// client/src/utils/investorPdf.js
import jsPDF from "jspdf";
import "jspdf-autotable";
import { saveAs } from "file-saver";
import ROBOTO_REGULAR_BASE64 from "../../public/fonts/robotoRegularBase64";

// формат числа с пробелами
const fmt = (v) =>
  typeof v === "number"
    ? new Intl.NumberFormat("ru-RU").format(v)
    : v ?? "";

// красивый формат месяца (2025-12 -> Дек 25)
const formatMonth = (periodMonth) => {
  if (!periodMonth) return "";
  const [y, m] = periodMonth.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("ru-RU", { month: "short", year: "2-digit" });
};

/**
 * Генерация PDF-отчёта по ОДНОМУ инвестору
 */
export function exportInvestorPdf({
  investor,
  payouts, // весь массив payouts
  getCapitalNow,
  getCurrentNetProfit,
  getTotalProfitAllTime,
  getWithdrawnTotal, // сумма снятого (прибыль + капитал)
}) {
  if (!investor) return;

  // ===== 1) создаём документ + шрифт =====
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // вшиваем шрифт с кириллицей
  doc.addFileToVFS("Roboto-Regular.ttf", ROBOTO_REGULAR_BASE64);
  doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
  doc.setFont("Roboto");

  // ===== 2) общие данные по инвестору =====
  const capitalNow = getCapitalNow(investor);
  const netProfit = getCurrentNetProfit(investor);
  const totalProfit = getTotalProfitAllTime(investor.id);
  const totalWithdrawn = getWithdrawnTotal(investor.id);

  let y = 15;

  doc.setFontSize(18);
  doc.text("Инвестиционный отчет", 14, y);
  y += 8;

  doc.setFontSize(12);
  doc.text(`Инвестор: ${investor.fullName || "Без имени"}`, 14, y);
  y += 7;

  doc.setFontSize(11);
  doc.text(`ID инвестора: ${investor.id}`, 14, y);
  y += 6;

  if (investor.createdAt) {
    const created = new Date(investor.createdAt).toLocaleDateString("ru-RU");
    doc.text(`Дата создания: ${created}`, 14, y);
    y += 6;
  }

  y += 4;
  doc.setLineWidth(0.3);
  doc.line(14, y, 195, y);
  y += 8;

  // Блок итогов
  doc.setFontSize(12);
  doc.text("Итоги по инвестору", 14, y);
  y += 7;

  doc.setFontSize(11);
  doc.text(`Вложено: ${fmt(investor.investedAmount)} ₽`, 14, y);
  y += 6;
  doc.text(`Капитал сейчас: ${fmt(capitalNow)} ₽`, 14, y);
  y += 6;
  doc.text(`Чистая прибыль сейчас: ${fmt(netProfit)} ₽`, 14, y);
  y += 6;
  doc.text(`Прибыль за всё время: ${fmt(totalProfit)} ₽`, 14, y);
  y += 6;
  doc.text(`Всего снято (прибыль + капитал): ${fmt(totalWithdrawn)} ₽`, 14, y);
  y += 10;

  // ===== 3) детальная таблица по операциям =====
  const investorPayouts = payouts
    .filter((p) => p.investorId === investor.id)
    .sort((a, b) => (a.periodMonth || "").localeCompare(b.periodMonth || ""));

  const rows = investorPayouts.map((p) => {
    let type = "";
    if (p.reinvest) type = "Реинвест";
    else if (p.isWithdrawalProfit) type = "Вывод прибыли";
    else if (p.isWithdrawalCapital) type = "Снятие капитала";
    else type = "Операция";

    const monthLabel = formatMonth(p.periodMonth);
    const sign =
      p.payoutAmount > 0 ? "+" : p.payoutAmount < 0 ? "-" : "";
    const abs = Math.abs(p.payoutAmount || 0);

    return [
      monthLabel,
      type,
      `${sign} ${fmt(abs)} ₽`,
    ];
  });

  doc.setFontSize(12);
  doc.text("Движение по месяцам", 14, y);
  y += 4;

  if (rows.length === 0) {
    doc.setFontSize(11);
    doc.text("Нет операций по этому инвестору.", 14, y + 6);
  } else {
    doc.autoTable({
      startY: y,
      head: [["Месяц", "Тип операции", "Сумма"]],
      body: rows,
      styles: {
        font: "Roboto",
        fontSize: 10,
      },
      headStyles: {
        fillColor: [15, 23, 42], // тёмно-синий как в UI
        textColor: 255,
      },
      columnStyles: {
        0: { cellWidth: 30 }, // месяц
        1: { cellWidth: 90 }, // тип
        2: { cellWidth: 40, halign: "right" }, // сумма
      },
      margin: { left: 14, right: 14 },
    });
  }

  // ===== 4) сохраняем PDF =====
  const safeName = (investor.fullName || `investor_${investor.id}`)
    .replace(/[\\/:*?"<>|]/g, "_");

  const fileName = `Отчет_${safeName}.pdf`;

  const blob = doc.output("blob");
  saveAs(blob, fileName);

  // ===== 5) открываем WhatsApp (без файла, но чат сразу) =====
  // можно добавить номер, например wa.me/79991234567
  window.open("https://wa.me/", "_blank");
}
