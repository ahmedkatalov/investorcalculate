import { useState, useMemo } from "react";
import { useInvestData } from "./hooks/useInvestData";
import { generateInvestorPdfBlob } from "./utils/investorPdfReport";

import InvestorsTable from "./components/InvestorsTable";
import DeleteInvestorModal from "./components/modals/DeleteInvestorModal";
import PayoutModal from "./components/modals/PayoutModal";
import WithdrawCapitalModal from "./components/modals/WithdrawCapitalModal";
import ShareModal from "./components/modals/ShareModal";

// ===== ДЕБОУНС =====
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function App() {
  const {
    investors,
    payouts,
    percents,
    setPercents,
    addInvestor,
    savePayout,
    deleteInvestor,
    withdrawCapital,
    updateInvestor,
    getCapitalNow,
    getCurrentNetProfit,
    getTotalProfitAllTime,
    getWithdrawnCapitalTotal,
  } = useInvestData();

  const debouncedUpdateInvestor = useMemo(
    () => debounce(updateInvestor, 2000),
    [updateInvestor]
  );

  // ====== MODALS ======
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    investor: null,
    isDeleting: false,
  });

  const [payoutModal, setPayoutModal] = useState({
    open: false,
    investor: null,
    monthKey: "",
    reinvest: true,
    isSaving: false,
  });

  const [withdrawModal, setWithdrawModal] = useState({
    open: false,
    investor: null,
    monthKey: "",
    amount: "",
    isSaving: false,
  });

  // ===== SHARE MODAL (ONLY PC) =====
  const [shareModal, setShareModal] = useState({
    open: false,
    investor: null,
    pdfBlob: null,
  });

  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // =======================
  //       SHARE REPORT
  // =======================
  async function handleShareReport(inv) {
    if (!inv) return;

    const pdfBlob = await generateInvestorPdfBlob({
      investor: inv,
      payouts,
      getCapitalNow,
      getCurrentNetProfit,
      getTotalProfitAllTime,
      withdrawnTotal: getWithdrawnCapitalTotal(inv.id),
    });

    const pdfFile = new File([pdfBlob], `Отчёт_${inv.fullName}.pdf`, {
      type: "application/pdf",
    });

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // 📱 На телефоне — система Share API
    if (isMobile && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      await navigator.share({
        title: "Отчёт по инвестору",
        text: `PDF-отчёт по инвестору ${inv.fullName}`,
        files: [pdfFile],
      });
      return;
    }

    // 💻 ПК → Открываем модалку
    setShareModal({
      open: true,
      investor: inv,
      pdfBlob,
    });
  }

  function closeShareModal() {
    setShareModal({ open: false, investor: null, pdfBlob: null });
  }

  // ===== Скачивание PDF =====
  function handleDownloadPdf() {
    const blob = shareModal.pdfBlob;
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `Отчёт_${shareModal.investor.fullName}.pdf`;
    link.click();

    URL.revokeObjectURL(url);
  }

  // ===== Кнопка WhatsApp (ПК) =====
function handleWhatsappSend() {
  handleDownloadPdf();

  // открываем промежуточную страницу с deep-link
  window.open(`/open-whatsapp.html?msg=${encodeURIComponent(
    `Отчёт по инвестору ${shareModal.investor.fullName} готов`
  )}`, "_blank");
}

  // ===== Кнопка Share API в модалке =====
  async function handleShareAPI() {
    const blob = shareModal.pdfBlob;

    const file = new File(
      [blob],
      `Отчёт_${shareModal.investor.fullName}.pdf`,
      { type: "application/pdf" }
    );

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({
        title: "Отчёт по инвестору",
        files: [file],
      });
    }

    alert("Share API не поддерживается в этом браузере.");
  }

  // =======================
  //     DELETE INVESTOR
  // =======================
  const openDeleteModal = (inv) =>
    setDeleteModal({ open: true, investor: inv, isDeleting: false });

  const closeDeleteModal = () =>
    setDeleteModal({ open: false, investor: null, isDeleting: false });

  async function confirmDelete() {
    try {
      await deleteInvestor(deleteModal.investor.id);
    } catch (err) {
      console.error("Ошибка удаления:", err);
    }
    closeDeleteModal();
  }

  // =======================
  //         PAYOUT
  // =======================
  const openPayoutModal = (inv) =>
    setPayoutModal({
      open: true,
      investor: inv,
      monthKey: currentMonthKey,
      reinvest: true,
      isSaving: false,
    });

  const closePayout = () =>
    setPayoutModal({
      open: false,
      investor: null,
      monthKey: "",
      reinvest: true,
      isSaving: false,
    });

  async function confirmPayout() {
    const { investor, reinvest, monthKey } = payoutModal;
    if (!investor) return;

    const percent = percents[investor.id] || 0;
    const capital = getCapitalNow(investor);
    const amount = Math.round((capital * percent) / 100);

    setPayoutModal((p) => ({ ...p, isSaving: true }));

    await savePayout({ investorId: investor.id, month: monthKey, amount, reinvest });

    setPercents((p) => {
      const copy = { ...p };
      delete copy[investor.id];
      return copy;
    });

    closePayout();
  }

  // =======================
  //      WITHDRAW CAPITAL
  // =======================
  const openWithdrawModal = (inv) =>
    setWithdrawModal({
      open: true,
      investor: inv,
      monthKey: currentMonthKey,
      amount: "",
      isSaving: false,
    });

  const closeWithdraw = () =>
    setWithdrawModal({
      open: false,
      investor: null,
      monthKey: "",
      amount: "",
      isSaving: false,
    });

  async function confirmWithdraw() {
    const inv = withdrawModal.investor;
    if (!inv) return;

    const amount = Number(withdrawModal.amount.replace(/\s/g, ""));

    if (!amount || amount <= 0) return closeWithdraw();

    setWithdrawModal((p) => ({ ...p, isSaving: true }));

    await withdrawCapital({
      investorId: inv.id,
      month: withdrawModal.monthKey,
      amount,
    });

    closeWithdraw();
  }

  // =======================
  //         RENDER
  // =======================
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 max-sm:p-2">
      <InvestorsTable
        investors={investors}
        payouts={payouts}
        percents={percents}
        setPercents={setPercents}
        getWithdrawnCapitalTotal={getWithdrawnCapitalTotal}
        onAddInvestor={addInvestor}
        onUpdateInvestor={debouncedUpdateInvestor}
        onOpenPayout={openPayoutModal}
        onOpenWithdraw={openWithdrawModal}
        onOpenDelete={openDeleteModal}
        onShareReport={handleShareReport}
        getCapitalNow={getCapitalNow}
        getCurrentNetProfit={getCurrentNetProfit}
        getTotalProfitAllTime={getTotalProfitAllTime}
      />

      <DeleteInvestorModal
        open={deleteModal.open}
        investor={deleteModal.investor}
        isDeleting={deleteModal.isDeleting}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />

      <PayoutModal
        open={payoutModal.open}
        investor={payoutModal.investor}
        monthKey={payoutModal.monthKey}
        setMonthKey={(v) => setPayoutModal((p) => ({ ...p, monthKey: v }))}
        reinvest={payoutModal.reinvest}
        setReinvest={(v) => setPayoutModal((p) => ({ ...p, reinvest: v }))}
        percent={percents[payoutModal.investor?.id] || 0}
        draftAmount={
          payoutModal.investor
            ? Math.round(
                (getCapitalNow(payoutModal.investor) *
                  (percents[payoutModal.investor.id] || 0)) /
                  100
              )
            : 0
        }
        isSaving={payoutModal.isSaving}
        onCancel={closePayout}
        onConfirm={confirmPayout}
      />

      <WithdrawCapitalModal
        open={withdrawModal.open}
        investor={withdrawModal.investor}
        monthKey={withdrawModal.monthKey}
        amount={withdrawModal.amount}
        setMonthKey={(v) => setWithdrawModal((p) => ({ ...p, monthKey: v }))}
        setAmount={(v) => setWithdrawModal((p) => ({ ...p, amount: v }))}
        isSaving={withdrawModal.isSaving}
        onCancel={closeWithdraw}
        onConfirm={confirmWithdraw}
      />

      <ShareModal
        open={shareModal.open}
        onClose={closeShareModal}
        onWhatsapp={handleWhatsappSend}
        onShareAPI={handleShareAPI}
      />
    </div>
  );
}
