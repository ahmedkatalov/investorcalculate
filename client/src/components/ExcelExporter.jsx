import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

export default function ExcelExporter({
  investors,
  payouts,
  getCapitalNow,
  getCurrentNetProfit,
  getTotalProfitAllTime,
}) {
  // ГРУППИРУЕМ ВСЕ payout по месяцам и слотам
  function buildMonthSlots() {
    const byMonthInv = new Map();

    payouts.forEach((p) => {
      if (!p.periodMonth) return;

      if (!byMonthInv.has(p.periodMonth)) {
        byMonthInv.set(p.periodMonth, new Map());
      }

      const invMap = byMonthInv.get(p.periodMonth);
      const list = invMap.get(p.investorId) || [];
      list.push(p);
      invMap.set(p.investorId, list);
    });

    const slots = [];
    const months = Array.from(byMonthInv.keys()).sort();

    months.forEach((month) => {
      const invMap = byMonthInv.get(month);
      let maxLen = 0;

      for (const list of invMap.values()) {
        if (list.length > maxLen) maxLen = list.length;
      }

      for (let i = 0; i < maxLen; i++) {
        slots.push({ month, index: i });
      }
    });

    return { slots, byMonthInv };
  }

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Инвесторы");

    // =============================
    //   СТИЛИ ДЛЯ ШАПКИ
    // =============================
    const headerStyle = {
      font: { bold: true, size: 12 },
      alignment: { vertical: "middle", horizontal: "center" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };

    const cellStyle = {
      alignment: { vertical: "middle", horizontal: "center" },
      border: {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      },
    };

    // =============================
    //   СТРОИМ СЛОТЫ МЕСЯЦЕВ B
    // =============================
    const { slots, byMonthInv } = buildMonthSlots();

    // =============================
    //   ШАПКА ТАБЛИЦЫ
    // =============================
    const baseColumns = [
      { header: "ID", key: "id", width: 10 },
      { header: "ФИО", key: "fullName", width: 30 },
      { header: "Вложено", key: "investedAmount", width: 15 },
      { header: "Капитал сейчас", key: "capitalNow", width: 18 },
      { header: "Чистая прибыль", key: "netProfit", width: 18 },
      { header: "Прибыль за всё время", key: "totalProfit", width: 22 },
      { header: "Всего снято капитала", key: "withdrawTotal", width: 20 },
    ];

    // Добавляем месячные слоты
    const dynamicColumns = slots.map((slot, i) => {
      const [y, m] = slot.month.split("-");
      const d = new Date(Number(y), Number(m) - 1, 1);

      return {
        header: `${d.toLocaleDateString("ru-RU", {
          month: "short",
          year: "2-digit",
        })} (${slot.index + 1})`,
        key: `slot_${i}`,
        width: 16,
      };
    });

    sheet.columns = [...baseColumns, ...dynamicColumns];

    // применяем стиль на шапку
    sheet.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });

    // =============================
    //   ЗАПОЛНЕНИЕ ДАННЫМИ
    // =============================
    investors.forEach((inv) => {
      const row = {
        id: inv.id,
        fullName: inv.fullName,
        investedAmount: inv.investedAmount,
        capitalNow: getCapitalNow(inv),
        netProfit: getCurrentNetProfit(inv),
        totalProfit: getTotalProfitAllTime(inv.id),
        withdrawTotal: payouts
          .filter((p) => p.investorId === inv.id && p.isWithdrawalCapital)
          .reduce((s, p) => s + Math.abs(p.payoutAmount), 0),
      };

      // месячные слоты
      slots.forEach((slot, idx) => {
        const invMap = byMonthInv.get(slot.month);
        if (!invMap) return;

        const list = invMap.get(inv.id) || [];
        const p = list[slot.index];

        if (!p) {
          row[`slot_${idx}`] = "";
          return;
        }

        const abs = Math.abs(p.payoutAmount);
        const sign =
          p.reinvest ? "+" : p.isWithdrawalCapital || p.isWithdrawalProfit ? "-" : "";

        row[`slot_${idx}`] = `${sign} ${abs} ₽`;
      });

      sheet.addRow(row);
    });

    // Цвета и стили
    sheet.eachRow((row, rowIndex) => {
      row.eachCell((cell, colIndex) => {
        cell.style = { ...cell.style, ...cellStyle };

        if (rowIndex === 1) return; // пропускаем шапку

        const header = sheet.getRow(1).getCell(colIndex).value;

        if (typeof header !== "string") return;

        // ищем ячейки месячных слотов
        if (header.includes("(")) {
          const value = cell.value || "";

          if (value.startsWith("+")) {
            cell.font = { color: { argb: "00AA00" }, bold: true }; // зелёный
          } else if (value.startsWith("-")) {
            if (value.includes("₽")) {
              cell.font = {
                color: { argb: "CC0000" },
                bold: true,
              }; // красный (капитал)
            } else {
              cell.font = { color: { argb: "666666" } }; // серый (прибыль)
            }
          }
        }
      });
    });

    // =============================
    //   СОХРАНЕНИЕ
    // =============================
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), "investors_report.xlsx");
  };

  return (
    <button
      onClick={exportToExcel}
      className="
        px-3 py-2 text-sm
        bg-emerald-600 hover:bg-emerald-700 
        rounded-lg text-white font-semibold
        shadow shadow-emerald-900/30
      "
    >
      📥 Экспорт в Excel
    </button>
  );
}
