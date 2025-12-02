import * as XLSX from "xlsx";

export default function ExcelExporter({ investors, payouts, getCapitalNow, getCurrentNetProfit, getTotalProfitAllTime }) {

  const exportToExcel = () => {
    const data = investors.map(inv => {
      return {
        "ID": inv.id,
        "ФИО": inv.fullName,
        "Вложено": inv.investedAmount,
        "Капитал сейчас": getCapitalNow(inv),
        "Чистая прибыль сейчас": getCurrentNetProfit(inv),
        "Прибыль за всё время": getTotalProfitAllTime(inv.id),
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Инвесторы");

    XLSX.writeFile(wb, "investors_report.xlsx");
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
