// App.jsx

import AuthModal from "./AuthModal";


export  function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  const handleAuthenticated = (newToken) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
  };

  if (!token) {
    return <AuthModal onAuthenticated={handleAuthenticated} />;
  }

  return <MainApp logout={logout} />;
}
// MainApp.jsx
import { useState, useMemo } from "react";
import { useInvestData } from "./hooks/useInvestData";
import { generateInvestorPdfBlob } from "./utils/investorPdfReport";
import {
  createTopup,
  fetchPayouts
} from "./api/api";

import InvestorsTable from "./components/InvestorsTable";
import DeleteInvestorModal from "./components/modals/DeleteInvestorModal";
import PayoutModal from "./components/modals/PayoutModal";
import WithdrawCapitalModal from "./components/modals/WithdrawCapitalModal";
import ShareModal from "./components/modals/ShareModal";
import TopupModal from "./components/modals/TopupModal";  // 🔥 ТВОЙ ГОТОВЫЙ МОДАЛ
import TopupHistoryModal from "./components/modals/TopupHistoryModal";

// ===== ДЕБОУНС =====
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export default function MainApp({ logout }) {
  const {
    investors,
    payouts,
    setPayouts,
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

  // ====== текущий месяц ======
  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

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

  // 🔥 ПОПОЛНЕНИЕ КАПИТАЛА
  const [topupModal, setTopupModal] = useState({
    open: false,
    investor: null,
    monthKey: currentMonthKey,
    amount: "",
    isSaving: false,
  });
  const [topupHistoryModal, setTopupHistoryModal] = useState({
  open: false,
  investor: null,
});

function openTopupHistoryModal(inv) {
  setTopupHistoryModal({
    open: true,
    investor: inv
  });
}


  const openTopupModal = (inv) =>
    setTopupModal({
      open: true,
      investor: inv,
      monthKey: currentMonthKey,
      amount: "",
      isSaving: false,
    });

  const closeTopupModal = () =>
    setTopupModal({
      open: false,
      investor: null,
      monthKey: "",
      amount: "",
      isSaving: false,
    });


async function confirmTopup() {
  const inv = topupModal.investor;
  if (!inv) return;

  const clean = topupModal.amount.replace(/\s/g, "");
  const amount = Number(clean);
  if (!amount || amount <= 0) return;

  setTopupModal((p) => ({ ...p, isSaving: true }));

  try {
    await createTopup(inv.id, topupModal.monthKey, amount);

    const fresh = await fetchPayouts();

    // 💥 ПРАВИЛЬНО:
    setPayouts(fresh);

    closeTopupModal();
  } catch (err) {
    console.error("Ошибка пополнения:", err);
  }
}

  // ===== SHARE MODAL =====
  const [shareModal, setShareModal] = useState({
    open: false,
    investor: null,
    pdfBlob: null,
  });

async function handleShareReport(inv) {
  if (!inv) return;

  const pdfBlob = await generateInvestorPdfBlob({
    investor: inv,
    payouts,

    // передаём функции, а не значения
    getCapitalNow,
    getCurrentNetProfit,
    getTotalProfitAllTime,

    // ❗ ВАЖНО — здесь должна быть функция, а не вызов!
    withdrawnTotal: getWithdrawnCapitalTotal,

    // новая функция для подсчёта пополнений
    getTopupsTotal: (id) =>
      payouts
        .filter((p) => p.investorId === id && p.isTopup)
        .reduce((sum, p) => sum + (p.payoutAmount || 0), 0),
  });

  // показываем модалку с PDF
  setShareModal({
    open: true,
    investor: inv,
    pdfBlob,
  });
}

  function handleDownloadPdf() {
    const url = URL.createObjectURL(shareModal.pdfBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Отчёт_${shareModal.investor.fullName}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleWhatsappSend() {
    handleDownloadPdf();
    window.open(
      `/open-whatsapp.html?msg=${encodeURIComponent(
        `Отчёт по инвестору ${shareModal.investor.fullName} готов`
      )}`,
      "_blank"
    );
  }

  async function handleShareAPI() {
    const file = new File(
      [shareModal.pdfBlob],
      `Отчёт_${shareModal.investor.fullName}.pdf`,
      { type: "application/pdf" }
    );

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      return navigator.share({
        title: "Отчёт по инвестору",
        files: [file],
      });
    }

    alert("Share API не поддерживается вашим браузером.");
  }

  // ===== DELETE =====
  const openDeleteModal = (inv) =>
    setDeleteModal({ open: true, investor: inv, isDeleting: false });

  async function confirmDelete() {
    try {
      await deleteInvestor(deleteModal.investor.id);
    } catch (err) {
      console.error("Ошибка удаления:", err);
    }

    setDeleteModal({ open: false, investor: null, isDeleting: false });
  }

  // ===== PAYOUT =====
  const openPayoutModal = (inv) =>
    setPayoutModal({
      open: true,
      investor: inv,
      monthKey: currentMonthKey,
      reinvest: true,
      isSaving: false,
    });

  async function confirmPayout() {
    const { investor, reinvest, monthKey } = payoutModal;
    const percent = percents[investor.id] || 0;
    const capital = getCapitalNow(investor);
    const amount = Math.round((capital * percent) / 100);

    await savePayout({
      investorId: investor.id,
      month: monthKey,
      amount,
      reinvest,
    });

    setPercents((prev) => {
      const out = { ...prev };
      delete out[investor.id];
      return out;
    });

    setPayoutModal({ open: false, investor: null });
  }

  // ===== WITHDRAW =====
  const openWithdrawModal = (inv) =>
    setWithdrawModal({
      open: true,
      investor: inv,
      monthKey: currentMonthKey,
      amount: "",
      isSaving: false,
    });

  async function confirmWithdraw() {
    const inv = withdrawModal.investor;
    const amount = Number(withdrawModal.amount.replace(/\s/g, ""));

    if (!amount || amount <= 0) return;

    await withdrawCapital({
      investorId: inv.id,
      month: withdrawModal.monthKey,
      amount,
    });

    setWithdrawModal({ open: false, investor: null });
  }

  // ===== RENDER =====
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">

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

        onOpenTopup={openTopupModal}   // 🔥 ДОБАВЛЕНО

        onOpenTopupHistory={openTopupHistoryModal}  

        onOpenDelete={openDeleteModal}
        onShareReport={handleShareReport}
        getCapitalNow={getCapitalNow}
        getCurrentNetProfit={getCurrentNetProfit}
        getTotalProfitAllTime={getTotalProfitAllTime}
        logout={logout}
      />

      {/* DELETE */}
      <DeleteInvestorModal
        open={deleteModal.open}
        investor={deleteModal.investor}
        isDeleting={deleteModal.isDeleting}
        onCancel={() => setDeleteModal({ open: false, investor: null })}
        onConfirm={confirmDelete}
      />

      {/* PAYOUT */}
      <PayoutModal
        open={payoutModal.open}
        investor={payoutModal.investor}
        monthKey={payoutModal.monthKey}
        setMonthKey={(v) =>
          setPayoutModal((p) => ({ ...p, monthKey: v }))
        }
        reinvest={payoutModal.reinvest}
        setReinvest={(v) =>
          setPayoutModal((p) => ({ ...p, reinvest: v }))
        }
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
        onCancel={() => setPayoutModal({ open: false, investor: null })}
        onConfirm={confirmPayout}
      />

      {/* WITHDRAW */}
      <WithdrawCapitalModal
        open={withdrawModal.open}
        investor={withdrawModal.investor}
        monthKey={withdrawModal.monthKey}
        amount={withdrawModal.amount}
        setMonthKey={(v) =>
          setWithdrawModal((p) => ({ ...p, monthKey: v }))
        }
        setAmount={(v) =>
          setWithdrawModal((p) => ({ ...p, amount: v }))
        }
        isSaving={withdrawModal.isSaving}
        onCancel={() => setWithdrawModal({ open: false, investor: null })}
        onConfirm={confirmWithdraw}
      />
<TopupHistoryModal
  open={topupHistoryModal.open}
  investor={topupHistoryModal.investor}
  payouts={payouts}
  onClose={() =>
    setTopupHistoryModal({ open: false, investor: null })
  }
/>

      {/* 🔥 TOPUP (ПОПОЛНЕНИЕ) */}
      <TopupModal
        open={topupModal.open}
        investor={topupModal.investor}
        monthKey={topupModal.monthKey}
        amount={topupModal.amount}
        isSaving={topupModal.isSaving}
        setMonthKey={(v) =>
          setTopupModal((p) => ({ ...p, monthKey: v }))
        }
        setAmount={(v) =>
          setTopupModal((p) => ({ ...p, amount: v }))
        }
        onConfirm={confirmTopup}
        onCancel={closeTopupModal}
      />

      {/* SHARE */}
      <ShareModal
        open={shareModal.open}
        onClose={() => setShareModal({ open: false, investor: null })}
        onWhatsapp={handleWhatsappSend}
        onShareAPI={handleShareAPI}
      />
    </div>
  );
}
