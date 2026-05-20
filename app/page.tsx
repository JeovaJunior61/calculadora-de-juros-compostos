"use client";

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  TrendingUp,
  Coins,
  Calendar,
  DollarSign,
  RotateCcw,
  FileText,
  LineChart,
  Table,
  Download,
  Info,
  Sparkles,
  BookOpen,
  Briefcase,
  Layers,
  ArrowRightLeft,
  GraduationCap,
  Percent,
  CheckCircle2,
  ChevronRight,
  HelpCircle,
  PiggyBank
} from 'lucide-react';

export default function Home() {
  // Input states - initialized to the exact parameters of the 20-year 8% example in the prompt
  const [valorInicial, setValorInicial] = useState<number>(1000);
  const [valorMensal, setValorMensal] = useState<number>(1000);
  const [taxaJuros, setTaxaJuros] = useState<number>(8);
  const [taxaTipo, setTaxaTipo] = useState<'anual' | 'mensal'>('anual');
  const [periodo, setPeriodo] = useState<number>(20);
  const [periodoTipo, setPeriodoTipo] = useState<'anos' | 'meses'>('anos');
  const [tributacao, setTributacao] = useState<'isento' | 'regressiva'>('isento');

  // Advanced Retiradas simulation state
  const [showRetiradas, setShowRetiradas] = useState(false);
  const [valorRetirada, setValorRetirada] = useState<number>(2500);

  // States to hold the COMMITTED calculation parameters (the ones calculated and rendered)
  const [committedParams, setCommittedParams] = useState({
    valorInicial: 1000,
    valorMensal: 1000,
    taxaJuros: 8,
    taxaTipo: 'anual' as 'anual' | 'mensal',
    periodo: 20,
    periodoTipo: 'anos' as 'anos' | 'meses',
    valorRetirada: 2500,
    showRetiradas: false,
    tributacao: 'isento' as 'isento' | 'regressiva'
  });

  // Highlight presets for quick configuration matching real scenario types
  interface Preset {
    label: string;
    valorInicial: number;
    valorMensal: number;
    taxaJuros: number;
    taxaTipo: 'anual' | 'mensal';
    periodo: number;
    periodoTipo: 'anos' | 'meses';
    tributacao: 'isento' | 'regressiva';
  }

  const PRESETS: Preset[] = [
    {
      label: '👵 Aposentadoria',
      valorInicial: 5000,
      valorMensal: 800,
      taxaJuros: 10,
      taxaTipo: 'anual',
      periodo: 25,
      periodoTipo: 'anos',
      tributacao: 'regressiva'
    },
    {
      label: '🚨 Reserva de Emergência',
      valorInicial: 1000,
      valorMensal: 400,
      taxaJuros: 10.75,
      taxaTipo: 'anual',
      periodo: 2,
      periodoTipo: 'anos',
      tributacao: 'isento'
    },
    {
      label: '🏖️ Viver de Renda',
      valorInicial: 50000,
      valorMensal: 2000,
      taxaJuros: 11,
      taxaTipo: 'anual',
      periodo: 15,
      periodoTipo: 'anos',
      tributacao: 'regressiva'
    },
    {
      label: '🚗 Meta de Carro/Casa',
      valorInicial: 3000,
      valorMensal: 600,
      taxaJuros: 9,
      taxaTipo: 'anual',
      periodo: 4,
      periodoTipo: 'anos',
      tributacao: 'regressiva'
    }
  ];

  const applyPreset = (preset: Preset) => {
    setValorInicial(preset.valorInicial);
    setValorMensal(preset.valorMensal);
    setTaxaJuros(preset.taxaJuros);
    setTaxaTipo(preset.taxaTipo);
    setPeriodo(preset.periodo);
    setPeriodoTipo(preset.periodoTipo);
    setTributacao(preset.tributacao);

    setCommittedParams({
      valorInicial: preset.valorInicial,
      valorMensal: preset.valorMensal,
      taxaJuros: preset.taxaJuros,
      taxaTipo: preset.taxaTipo,
      periodo: preset.periodo,
      periodoTipo: preset.periodoTipo,
      valorRetirada: valorRetirada,
      showRetiradas: showRetiradas,
      tributacao: preset.tributacao
    });
    setAiInsight('');
    setHoverIdx(null);
    setCurrentPage(1);
  };

  // Table & Chart visual preferences
  const [activeTab, setActiveTab] = useState<'grafico' | 'tabela'>('grafico');
  const [selectedViewMode, setSelectedViewMode] = useState<'anual' | 'mensal'>('anual');

  // Resolve viewMode dynamically to avoid synchronous updates inside React useEffect
  const viewMode = committedParams.periodoTipo === 'meses' ? 'mensal' : selectedViewMode;

  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 12;

  // AI Insight states
  const [aiInsight, setAiInsight] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string>('');

  // Tooltip tracking on SVG graph
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Ref to result section for scrolling
  const resultadoRef = useRef<HTMLDivElement>(null);

  // Math engine
  const calculated = useMemo(() => {
    const {
      valorInicial: vInicial,
      valorMensal: vMensal,
      taxaJuros: tJuros,
      taxaTipo: tTipo,
      periodo: pVal,
      periodoTipo: pTipo,
      valorRetirada: vRetirada,
      showRetiradas: sRetiradas,
      tributacao: tTrib
    } = committedParams;

    const nMonths = pTipo === 'anos' ? pVal * 12 : pVal;
    
    // Convert to monthly rate compounding: (1 + i_annual)^(1/12) - 1
    const iMonthly = tTipo === 'mensal'
      ? (tJuros / 100)
      : (Math.pow(1 + tJuros / 100, 1 / 12) - 1);

    let balance = vInicial;
    let investedCumulative = vInicial;
    let interestCumulative = 0;

    const monthlyRecords: Array<{
      monthIndex: number;
      periodText: string;
      balance: number;
      balanceNet: number;
      taxPaid: number;
      invested: number;
      interestAccrued: number;
      interestCumulative: number;
    }> = [];

    // Month 0
    monthlyRecords.push({
      monthIndex: 0,
      periodText: 'Início',
      balance: vInicial,
      balanceNet: vInicial,
      taxPaid: 0,
      invested: vInicial,
      interestAccrued: 0,
      interestCumulative: 0
    });

    for (let m = 1; m <= nMonths; m++) {
      const interestEarnedThisMonth = balance * iMonthly;
      interestCumulative += interestEarnedThisMonth;
      investedCumulative += vMensal;
      // standard postfixed balance compound:
      balance = balance + interestEarnedThisMonth + vMensal;

      // Calculate IR regressiva for this specific month index
      let irRate = 0;
      if (tTrib === 'regressiva') {
        if (m <= 6) irRate = 0.225;
        else if (m <= 12) irRate = 0.20;
        else if (m <= 24) irRate = 0.175;
        else irRate = 0.15;
      }
      const taxAmount = interestCumulative * irRate;
      const balanceNet = balance - taxAmount;

      monthlyRecords.push({
        monthIndex: m,
        periodText: pTipo === 'anos' 
          ? `Ano ${Math.floor((m - 1) / 12) + 1}, Mês ${m % 12 === 0 ? 12 : m % 12}`
          : `Mês ${m}`,
        balance,
        balanceNet,
        taxPaid: taxAmount,
        invested: investedCumulative,
        interestAccrued: interestEarnedThisMonth,
        interestCumulative: interestCumulative
      });
    }

    // Aggregate Yearly Records
    const yearlyRecords: Array<{
      periodIndex: number;
      periodText: string;
      balance: number;
      balanceNet: number;
      taxPaid: number;
      invested: number;
      interestCumulative: number;
      interestPeriodEarned: number;
    }> = [];

    // Year 0
    yearlyRecords.push({
      periodIndex: 0,
      periodText: '0',
      balance: vInicial,
      balanceNet: vInicial,
      taxPaid: 0,
      invested: vInicial,
      interestCumulative: 0,
      interestPeriodEarned: 0
    });

    if (pTipo === 'anos') {
      for (let y = 1; y <= pVal; y++) {
        const monthTarget = y * 12;
        const record = monthlyRecords[monthTarget];
        if (record) {
          let yearInterestEarned = 0;
          for (let m = (y - 1) * 12 + 1; m <= y * 12; m++) {
            yearInterestEarned += monthlyRecords[m]?.interestAccrued || 0;
          }

          yearlyRecords.push({
            periodIndex: y,
            periodText: `Ano ${y}`,
            balance: record.balance,
            balanceNet: record.balanceNet,
            taxPaid: record.taxPaid,
            invested: record.invested,
            interestCumulative: record.interestCumulative,
            interestPeriodEarned: yearInterestEarned
          });
        }
      }
    } else {
      // If months, yearlyRecords is just decimation of monthly ticks or direct copy
      monthlyRecords.forEach((mItem) => {
        if (mItem.monthIndex > 0) {
          yearlyRecords.push({
            periodIndex: mItem.monthIndex,
            periodText: `Mês ${mItem.monthIndex}`,
            balance: mItem.balance,
            balanceNet: mItem.balanceNet,
            taxPaid: mItem.taxPaid,
            invested: mItem.invested,
            interestCumulative: mItem.interestCumulative,
            interestPeriodEarned: mItem.interestAccrued
          });
        }
      });
    }

    // Simple Interest Comparison
    const simpleInterestAccrued = (vInicial * iMonthly * nMonths) + (vMensal * iMonthly * (nMonths * (nMonths - 1) / 2));
    const simpleInterestBalance = investedCumulative + simpleInterestAccrued;
    const compoundDiff = balance - simpleInterestBalance;

    // Withdrawals (Retirada) calculations
    const infiniteMonthlySalary = balance * iMonthly;
    let customWithdrawalMonths = 0;
    let customWithdrawalPossible = false;

    if (sRetiradas && vRetirada > 0) {
      if (vRetirada <= infiniteMonthlySalary) {
        customWithdrawalPossible = true; // lasts forever
      } else {
        let tempBalance = balance;
        while (tempBalance > 0 && customWithdrawalMonths < 1200) { // cap at 100 years
          const mInterest = tempBalance * iMonthly;
          tempBalance = tempBalance + mInterest - vRetirada;
          if (tempBalance > 0) {
            customWithdrawalMonths++;
          } else {
            break;
          }
        }
      }
    }

    const finalTaxPaid = monthlyRecords[nMonths]?.taxPaid || 0;
    const finalNet = balance - finalTaxPaid;

    return {
      totalFinal: balance,
      totalFinalNet: finalNet,
      totalTaxPaid: finalTaxPaid,
      totalInvestido: investedCumulative,
      totalJuros: interestCumulative,
      monthlyRecords,
      yearlyRecords,
      iMonthlyPercentage: iMonthly * 100,
      
      // Simple vs Compound
      simpleInterestTotal: simpleInterestBalance,
      simpleInterestEarned: simpleInterestAccrued,
      compoundDifference: compoundDiff,

      // Retirada
      infiniteMonthlySalary,
      customWithdrawalPossible,
      customWithdrawalMonths
    };
  }, [committedParams]);

  // Handle calculator triggers
  const executeCalculation = () => {
    setCommittedParams({
      valorInicial,
      valorMensal,
      taxaJuros,
      taxaTipo,
      periodo,
      periodoTipo,
      valorRetirada,
      showRetiradas,
      tributacao
    });
    setAiInsight(''); // Reset insights for rerun
    setCurrentPage(1);

    // Smooth scroll to resultados
    setTimeout(() => {
      resultadoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };

  const handleReset = () => {
    setValorInicial(1000);
    setValorMensal(1000);
    setTaxaJuros(8);
    setTaxaTipo('anual');
    setPeriodo(20);
    setPeriodoTipo('anos');
    setTributacao('isento');
    setShowRetiradas(false);
    setValorRetirada(2500);

    setCommittedParams({
      valorInicial: 1000,
      valorMensal: 1000,
      taxaJuros: 8,
      taxaTipo: 'anual',
      periodo: 20,
      periodoTipo: 'anos',
      valorRetirada: 2500,
      showRetiradas: false,
      tributacao: 'isento'
    });
    setAiInsight('');
    setHoverIdx(null);
    setCurrentPage(1);
  };

  // Helper formats
  const formatBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatShortBRL = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(2)}M`;
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  // CSV Generator downloader
  const handleDownloadCSV = () => {
    const list = viewMode === 'anual' ? calculated.yearlyRecords : calculated.monthlyRecords;
    const isAnual = viewMode === 'anual';
    
    let csv = "data:text/csv;charset=utf-8,";
    csv += `${isAnual ? "Periodo (Ano)" : "Periodo (Mes)"},Capital Investido (R$),Rendimento do Periodo (R$),Total Acumulado de Juros (R$),Montante Completo Bruto (R$),Imposto de Renda Projetado (R$),Montante Liquido (R$)\n`;
    
    list.forEach((item: any) => {
      const pIndex = 'periodIndex' in item ? item.periodIndex : item.monthIndex;
      if (pIndex === 0) return; // Skip base row for clean CSV timeline

      const invested = item.invested.toFixed(2);
      const interestEarned = (item.interestPeriodEarned !== undefined ? item.interestPeriodEarned : item.interestAccrued).toFixed(2);
      const interestCumulative = item.interestCumulative.toFixed(2);
      const balance = item.balance.toFixed(2);
      const taxPaid = (item.taxPaid || 0).toFixed(2);
      const balanceNet = (item.balanceNet || item.balance).toFixed(2);

      csv += `"${item.periodText}",${invested},${interestEarned},${interestCumulative},${balance},${taxPaid},${balanceNet}\n`;
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `simulacao_juros_compostos_${viewMode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // API Call helper for AI Insights
  const handleGetAiInsights = async () => {
    setLoadingAi(true);
    setAiError('');
    setAiInsight('');

    try {
      const response = await fetch('/api/analise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          valorInicial: committedParams.valorInicial,
          valorMensal: committedParams.valorMensal,
          taxaJuros: committedParams.taxaJuros,
          taxaTipo: committedParams.taxaTipo,
          periodo: committedParams.periodo,
          periodoTipo: committedParams.periodoTipo,
          tributacao: committedParams.tributacao,
          totalFinal: formatBRL(calculated.totalFinal),
          totalFinalNet: formatBRL(calculated.totalFinalNet),
          totalTaxPaid: formatBRL(calculated.totalTaxPaid),
          totalInvestido: formatBRL(calculated.totalInvestido),
          totalJuros: formatBRL(calculated.totalJuros)
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ocorreu um erro ao gerar relatórios com inteligência artificial.");
      }

      setAiInsight(data.insight);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || 'Falha ao se conectar com a inteligência artificial.');
    } finally {
      setLoadingAi(false);
    }
  };

  // Markdown inline renderer
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split('\n').map((paragraph, idx) => {
      const trimmed = paragraph.trim();
      if (trimmed === '') {
        return <div key={idx} className="h-2" />;
      }
      
      // Inline parser for lists
      if (trimmed.startsWith('* **') || trimmed.startsWith('- **') || trimmed.startsWith('**') && trimmed.endsWith(':')) {
        return (
          <p key={idx} className="text-slate-700 text-sm leading-relaxed mb-2.5">
            {parseBoldStr(trimmed.replace(/^[*-\s]+/, ''))}
          </p>
        );
      }

      // Headers check
      if (trimmed.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-sm font-bold text-[#801D1A] mt-4 mb-2">
            {parseBoldStr(trimmed.replace('### ', ''))}
          </h4>
        );
      }
      if (trimmed.startsWith('## ')) {
        return (
          <h3 key={idx} className="text-base font-bold text-slate-800 mt-5 mb-2.5 border-b border-rose-100 pb-1">
            {parseBoldStr(trimmed.replace('## ', ''))}
          </h3>
        );
      }

      return (
        <p key={idx} className="text-slate-700 text-sm leading-relaxed mb-3">
          {parseBoldStr(trimmed)}
        </p>
      );
    });
  };

  const parseBoldStr = (str: string) => {
    const parts = str.split(/\*\*([^*]+)\*\*/g);
    return parts.map((chunk, index) => {
      if (index % 2 === 1) {
        return <strong key={index} className="font-semibold text-slate-900">{chunk}</strong>;
      }
      return chunk;
    });
  };

  // Chart values calculation
  const plotData = calculated.yearlyRecords;
  const maxVal = Math.max(...plotData.map(d => d.balance));
  const maxScale = maxVal * 1.05; // 5% cushion

  // Hover detection logic on SVG Chart
  const handleMouseMoveSVG = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current || plotData.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const xMouse = e.clientX - rect.left;

    const paddingLeft = 70;
    const paddingRight = 30;
    const plotWidth = 800 - paddingLeft - paddingRight;

    // Calculate percentage relative to plotted area width
    const mouseProp = xMouse / rect.width;
    const plotXCoord = mouseProp * 800; // Map back to 0-800 scale of viewBox
    const relativeXPercent = (plotXCoord - paddingLeft) / plotWidth;

    if (relativeXPercent < -0.05 || relativeXPercent > 1.05) {
      setHoverIdx(null);
      return;
    }

    const approxIndex = Math.round(relativeXPercent * (plotData.length - 1));
    const validIndex = Math.max(0, Math.min(plotData.length - 1, approxIndex));
    setHoverIdx(validIndex);
  };

  const handleMouseLeaveSVG = () => {
    setHoverIdx(null);
  };

  // Table pagination selectors
  const tableList = viewMode === 'anual' ? calculated.yearlyRecords : calculated.monthlyRecords;
  // Strip off Month/Year 0 for human readable list, but keep it in math
  const displayTableList = tableList.filter((item) => {
    const periodValue = 'periodIndex' in item ? item.periodIndex : item.monthIndex;
    return periodValue > 0;
  });

  const totalPages = Math.ceil(displayTableList.length / rowsPerPage);
  const paginatedRows = useMemo(() => {
    const startIdx = (currentPage - 1) * rowsPerPage;
    return displayTableList.slice(startIdx, startIdx + rowsPerPage);
  }, [displayTableList, currentPage]);

  return (
    <div className="min-h-screen bg-[#F9FBFC] text-slate-900 selection:bg-[#801D1A]/10 selection:text-[#801D1A]">
      
      {/* Decorative top bar */}
      <div className="h-1.5 w-full bg-[#801D1A]" />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-8 md:gap-11">
        
        {/* Header Section */}
        <section id="header-section" className="text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-center md:justify-start gap-2.5 mb-1">
              <span className="p-2 bg-[#801D1A]/10 text-[#801D1A] rounded-lg">
                <PiggyBank className="w-6 h-6" />
              </span>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 font-sans">
                Simulador de Juros Compostos
              </h1>
            </div>
            <p className="text-slate-500 text-sm max-w-lg">
              Estime o crescimento de seus bens e descubra o efeito multiplicador dos juros sobre juros no tempo.
            </p>
          </div>
          
          <div className="flex items-center justify-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200 shadow-sm">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Grátis & Sem Anúncios
            </span>
            <span className="text-xs text-slate-400 font-mono">
              v1.1.0 • Seguro
            </span>
          </div>
        </section>

        {/* Dynamic Simulator Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Input Card Container - 5 columns */}
          <section id="input-container-card" className="lg:col-span-5 bg-white border border-slate-200/90 shadow-sm rounded-xl p-6 flex flex-col gap-6">
            
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-[#801D1A] flex items-center gap-2">
                <Coins className="w-4 h-4" /> Parâmetros do Investimento
              </h2>
            </div>

            {/* Presets Bar */}
            <div id="quick-presets-bar" className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl flex flex-col gap-2 shadow-inner">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                ⭐ Carregar Simulações Prontas
              </span>
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
                {PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="px-2.5 py-1.5 bg-white hover:bg-[#801D1A]/5 border border-slate-200 hover:border-[#801D1A] rounded-lg text-xs font-semibold text-slate-700 hover:text-[#801D1A] transition-all cursor-pointer shadow-sm active:scale-95 text-left sm:text-center"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              
              {/* Row 1: Valor Inicial & Valor Mensal */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Valor Inicial */}
                <div id="wrapper-valor-inicial" className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    Valor inicial
                    <span className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                      <span className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded shadow-md w-48 opacity-0 group-hover:opacity-100 transition-opacity z-10 font-normal leading-normal">
                        O montante principal que você aportará para iniciar a sua aplicação.
                      </span>
                    </span>
                  </span>
                  <div className="flex rounded-md border border-slate-300 bg-white overflow-hidden focus-within:border-[#801D1A] focus-within:ring-1 focus-within:ring-[#801D1A] transition-all">
                    <span className="inline-flex items-center px-3 bg-slate-50 text-slate-500 text-sm border-r border-slate-200 font-mono">
                      R$
                    </span>
                    <input
                      id="input_valor_inicial"
                      type="number"
                      step="any"
                      min="0"
                      value={valorInicial === 0 ? '' : valorInicial}
                      onChange={(e) => setValorInicial(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-3 py-2.5 text-slate-800 outline-none w-full text-left font-semibold font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                {/* Valor Mensal */}
                <div id="wrapper-valor-mensal" className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    Valor mensal
                    <span className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                      <span className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded shadow-md w-48 opacity-0 group-hover:opacity-100 transition-opacity z-10 font-normal leading-normal">
                        A quantia aproximada que você planeja economizar e depositar recorrentemente todo mês.
                      </span>
                    </span>
                  </span>
                  <div className="flex rounded-md border border-slate-300 bg-white overflow-hidden focus-within:border-[#801D1A] focus-within:ring-1 focus-within:ring-[#801D1A] transition-all">
                    <span className="inline-flex items-center px-3 bg-slate-50 text-slate-500 text-sm border-r border-slate-200 font-mono">
                      R$
                    </span>
                    <input
                      id="input_valor_mensal"
                      type="number"
                      step="any"
                      min="0"
                      value={valorMensal === 0 ? '' : valorMensal}
                      onChange={(e) => setValorMensal(parseFloat(e.target.value) || 0)}
                      className="flex-1 px-3 py-2.5 text-slate-800 outline-none w-full text-left font-semibold font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0,00"
                    />
                  </div>
                </div>

              </div>

              {/* Row 2: Taxa de juros & Período */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Taxa de juros */}
                <div id="wrapper-taxa-juros" className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    Taxa de juros
                    <span className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                      <span className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded shadow-md w-48 opacity-0 group-hover:opacity-100 transition-opacity z-10 font-normal leading-normal">
                        A taxa de rendimento estimada. Pode configurar com base anual ou mensal.
                      </span>
                    </span>
                  </span>
                  <div className="flex rounded-md border border-slate-300 bg-white overflow-hidden focus-within:border-[#801D1A] focus-within:ring-1 focus-within:ring-[#801D1A] transition-all">
                    <span className="inline-flex items-center px-3 bg-slate-50 text-slate-500 text-sm border-r border-slate-200 font-mono">
                      %
                    </span>
                    <input
                      id="input_taxa_juros"
                      type="number"
                      step="any"
                      min="0"
                      value={taxaJuros === 0 ? '' : taxaJuros}
                      onChange={(e) => setTaxaJuros(parseFloat(e.target.value) || 0)}
                      className="flex-1 min-w-0 px-2 py-2.5 text-slate-800 outline-none text-left font-semibold font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="0"
                    />
                    <select
                      id="select_taxa_tipo"
                      value={taxaTipo}
                      onChange={(e) => setTaxaTipo(e.target.value as 'anual' | 'mensal')}
                      className="px-2.5 py-2.5 bg-slate-50 text-slate-700 font-medium text-xs border-l border-slate-200 outline-none cursor-pointer hover:bg-slate-100 transition-all focus:bg-white"
                    >
                      <option value="anual">anual</option>
                      <option value="mensal">mensal</option>
                    </select>
                  </div>
                </div>

                {/* Período */}
                <div id="wrapper-periodo" className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    Período
                    <span className="group relative">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                      <span className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded shadow-md w-48 opacity-0 group-hover:opacity-100 transition-opacity z-10 font-normal leading-normal">
                        O horizonte temporal planejado para manter o seu capital investido.
                      </span>
                    </span>
                  </span>
                  <div className="flex rounded-md border border-slate-300 bg-white overflow-hidden focus-within:border-[#801D1A] focus-within:ring-1 focus-within:ring-[#801D1A] transition-all">
                    <input
                      id="input_periodo"
                      type="number"
                      min="1"
                      value={periodo === 0 ? '' : periodo}
                      onChange={(e) => setPeriodo(parseInt(e.target.value) || 0)}
                      className="flex-1 min-w-0 px-3 py-2.5 text-slate-800 outline-none text-left font-semibold font-mono text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      placeholder="1"
                    />
                    <select
                      id="select_periodo_tipo"
                      value={periodoTipo}
                      onChange={(e) => setPeriodoTipo(e.target.value as 'anos' | 'meses')}
                      className="px-2.5 py-2.5 bg-slate-50 text-slate-700 font-medium text-xs border-l border-slate-200 outline-none cursor-pointer hover:bg-slate-100 transition-all focus:bg-white"
                    >
                      <option value="anos">ano(s)</option>
                      <option value="meses">mes(es)</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Tributação (Imposto de Renda brasileiro) */}
              <div id="wrapper-tributacao" className="flex flex-col gap-1.5 pt-2">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                  Tributação (Imposto de Renda)
                  <span className="group relative">
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-help" />
                    <span className="pointer-events-none absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] p-2 rounded shadow-md w-56 opacity-0 group-hover:opacity-100 transition-opacity z-10 font-normal leading-normal">
                      No Brasil, investimentos de renda fixa como CDB e Tesouro Direto seguem a tabela regressiva de IR de 22,5% a 15% sobre o lucro. Poupança, LCI e LCA são isentos.
                    </span>
                  </span>
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTributacao('isento')}
                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      tributacao === 'isento' 
                        ? 'border-[#801D1A] bg-[#801D1A]/5 ring-1 ring-[#801D1A]' 
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800">Isento de IR</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">LCI, LCA, Poupança</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTributacao('regressiva')}
                    className={`flex flex-col items-start p-2.5 rounded-lg border text-left cursor-pointer transition-all ${
                      tributacao === 'regressiva' 
                        ? 'border-[#801D1A] bg-[#801D1A]/5 ring-1 ring-[#801D1A]' 
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-xs font-bold text-slate-800">Tabela Regressiva</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">CDB, Tesouro Direto</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Simulated Retirements Toggle Action */}
            <div className="border-t border-slate-100 pt-4 mt-1">
              <button
                id="btn_toggle_retiradas"
                type="button"
                onClick={() => setShowRetiradas(!showRetiradas)}
                className={`flex items-center gap-2 text-xs font-medium transition-colors ${
                  showRetiradas ? 'text-[#801D1A] font-bold' : 'text-slate-500 hover:text-[#801D1A]'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${showRetiradas ? 'bg-[#801D1A]' : 'bg-slate-300'}`} />
                {showRetiradas ? '✓ Simulando retiradas mensais' : 'Simular retiradas mensais (Avançado)'}
              </button>

              {showRetiradas && (
                <div id="retiradas_panel" className="mt-3 p-3 bg-rose-50/50 border border-rose-100 rounded-lg flex flex-col gap-2.5 animate-fadeIn">
                  <div className="flex flex-col gap-1">
                    <span className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                      <span>Valor de retirada mensal pós período:</span>
                      <span className="text-[#801D1A] font-mono text-xs">{formatBRL(valorRetirada)}</span>
                    </span>
                    <input
                      id="input_valor_retirada"
                      type="range"
                      min="100"
                      max="15000"
                      step="100"
                      value={valorRetirada}
                      onChange={(e) => setValorRetirada(parseInt(e.target.value) || 0)}
                      className="w-full accent-[#801D1A] cursor-pointer mt-1"
                    />
                    <span className="text-[10px] text-slate-500 italic mt-0.5">
                      Ajuda a calcular quanto tempo os fundos durarão sacando este valor mensalmente após o horizonte do plano.
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Primary CTA & Clean Action button layout */}
            <div id="wrapper-form-actions" className="flex items-center justify-between gap-4 mt-2 border-t border-slate-100 pt-4">
              <button
                id="btn_calcular"
                type="button"
                onClick={executeCalculation}
                className="px-6 py-2.5 bg-[#801D1A] hover:bg-[#681715] active:bg-[#521210] text-white font-bold text-sm rounded-lg shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <TrendingUp className="w-4 h-4" /> Calcular
              </button>

              <button
                id="btn_limpar"
                type="button"
                onClick={handleReset}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700 hover:underline transition-colors flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Limpar campos
              </button>
            </div>

          </section>

          {/* Results dashboard container - 7 columns */}
          <section id="resultado" ref={resultadoRef} className="lg:col-span-7 bg-white border border-slate-200/90 shadow-sm rounded-xl p-6 flex flex-col gap-6">
            
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-4.5 h-4.5 text-[#801D1A]" /> Resultado da Simulação
              </h2>
              <span className="text-xs text-slate-500">
                Taxa mensal equivalente: <strong className="font-mono text-slate-800">{calculated.iMonthlyPercentage.toFixed(4)}%</strong>
              </span>
            </div>

            {/* Results Numeric Blocks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              
              {/* Card 1: Valor total final (Primary Brand Style) */}
              <div id="card_valor_total_final" className="bg-[#801D1A] text-white p-4 rounded-xl shadow-sm flex flex-col justify-between gap-1 border border-[#801D1A]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-rose-100/95">
                  {committedParams.tributacao === 'regressiva' ? 'Valor Líquido Final' : 'Valor Total Final'}
                </span>
                <span className="text-xl md:text-2xl font-black font-mono leading-none py-1 truncate">
                  {formatBRL(committedParams.tributacao === 'regressiva' ? calculated.totalFinalNet : calculated.totalFinal)}
                </span>
                <span className="text-[10px] text-rose-200/90 leading-tight">
                  {committedParams.tributacao === 'regressiva' 
                    ? `Bruto: ${formatBRL(calculated.totalFinal)}` 
                    : 'Aportes e rendimentos isentos de IR'}
                </span>
              </div>

              {/* Card 2: Valor total investido */}
              <div id="card_valor_total_investido" className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Valor total investido
                </span>
                <span className="text-lg md:text-xl font-bold font-mono text-[#801D1A] leading-none py-1 truncate">
                  {formatBRL(calculated.totalInvestido)}
                </span>
                <span className="text-[10px] text-slate-400">
                  Capital próprio aportado
                </span>
              </div>

              {/* Card 3: Total em juros */}
              <div id="card_total_em_juros" className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col justify-between gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {committedParams.tributacao === 'regressiva' ? 'Total em Juros Brutos' : 'Total em juros'}
                </span>
                <span className="text-lg md:text-xl font-bold font-mono text-slate-900 leading-none py-1 truncate">
                  {formatBRL(calculated.totalJuros)}
                </span>
                <span className="text-[10px] text-slate-400">
                  Lucro gerado pelo capital
                </span>
              </div>

            </div>

            {/* Optional Tax breakdown notice */}
            {committedParams.tributacao === 'regressiva' && (
              <div id="tax-breakdown-notice" className="text-xs p-3 bg-red-50/50 border border-red-100 rounded-xl text-slate-600 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-[#801D1A] rounded-full shrink-0" />
                <span>
                  Projeção de deduções: Imposto de Renda cobrado de <strong className="text-[#801D1A] font-mono font-bold">-{formatBRL(calculated.totalTaxPaid)}</strong>. O rendimento líquido total fictício estimado pós-imposto é de <strong className="text-slate-800 font-mono font-bold">{formatBRL(calculated.totalFinalNet - calculated.totalInvestido)}</strong>.
                </span>
              </div>
            )}

            {/* Advanced Retirement calculation summary */}
            {committedParams.showRetiradas && (
              <div id="retirement-result-block" className="p-4 bg-amber-50 border border-amber-200/60 rounded-xl flex flex-col gap-1.5 shadow-sm animate-fadeIn">
                <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 uppercase tracking-wide">
                  ⭐ Análise de Sustentabilidade Financeira
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-700 mt-1">
                  <div>
                    <p className="mb-1 text-slate-600">
                      Renda mensal perpétua potencial: <strong className="font-mono text-amber-900 text-sm block">{formatBRL(calculated.infiniteMonthlySalary)}</strong>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      (Retirada mensal máxima recomendada para nunca gastar o capital original).
                    </p>
                  </div>
                  <div className="border-t md:border-t-0 md:border-l border-amber-200/60 pt-2.5 md:pt-0 md:pl-4">
                    <p className="mb-1 text-slate-600">
                      Simulação com saques de <strong className="font-mono text-slate-900">{formatBRL(committedParams.valorRetirada)} / mês</strong>:
                    </p>
                    {calculated.customWithdrawalPossible ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="w-4 h-4" /> Dura para Sempre! INFINDÁVEL.
                      </span>
                    ) : (
                      <p className="text-xs text-slate-700 font-medium">
                        O capital acumulado irá durar aproximadamente <strong className="text-amber-900 font-mono text-sm">{Math.floor(calculated.customWithdrawalMonths / 12)} anos e {calculated.customWithdrawalMonths % 12} meses</strong> antes de acabar completamente.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* View Select Mode Toolbar (Grafico vs Tabela) */}
            <div id="view-mode-toolbar" className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
              
              <div className="flex gap-1 bg-white p-1 rounded-lg shadow-sm border border-slate-200/40">
                <button
                  id="tab_grafico"
                  type="button"
                  onClick={() => setActiveTab('grafico')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'grafico'
                      ? 'bg-[#801D1A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LineChart className="w-3.5 h-3.5" /> Gráfico
                </button>
                <button
                  id="tab_tabela"
                  type="button"
                  onClick={() => setActiveTab('tabela')}
                  className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    activeTab === 'tabela'
                      ? 'bg-[#801D1A] text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" /> Tabela
                </button>
              </div>

              <div className="flex items-center justify-end gap-3 px-2">
                {/* Mode Select: Anual vs Mensal (only active if original period is set to anos) */}
                {committedParams.periodoTipo === 'anos' && (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500 mr-1">Visualização:</span>
                    <button
                      id="opt_view_anual"
                      type="button"
                      onClick={() => { setSelectedViewMode('anual'); setCurrentPage(1); }}
                      className={`px-2.5 py-1 text-xs rounded font-semibold border transition-all cursor-pointer ${
                        viewMode === 'anual'
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Anual
                    </button>
                    <button
                      id="opt_view_mensal"
                      type="button"
                      onClick={() => { setSelectedViewMode('mensal'); setCurrentPage(1); }}
                      className={`px-2.5 py-1 text-xs rounded font-semibold border transition-all cursor-pointer ${
                        viewMode === 'mensal'
                          ? 'bg-slate-800 text-white border-slate-800'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      Mensal
                    </button>
                  </div>
                )}

                <button
                  id="btn_download_csv"
                  type="button"
                  onClick={handleDownloadCSV}
                  title="Baixar evolução em formato CSV para planilhas"
                  className="p-1.5 bg-white text-slate-600 border border-slate-300 hover:border-[#801D1A] hover:text-[#801D1A] rounded-lg shadow-sm transition-colors cursor-pointer flex items-center justify-center"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>

            </div>

            {/* Content box based on active Tab */}
            <div id="tab-content-panel" className="relative min-h-[340px] flex flex-col justify-center">

              {/* 1. VISUAL CHART COMPONENT */}
              {activeTab === 'grafico' && (
                <div id="chart_container" className="w-full h-full flex flex-col gap-3 animate-fadeIn">
                  
                  {/* Legend box */}
                  <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-[11px] font-semibold text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-[#801D1A]" />
                      <span>Total final acumulado (Bruto)</span>
                    </div>
                    {committedParams.tributacao === 'regressiva' && (
                      <div className="flex items-center gap-1.5">
                        <span className="w-3 h-3 border border-emerald-500 bg-emerald-50 border-dashed" />
                        <span className="text-emerald-700">Total líquido pós-IR</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 bg-slate-900" />
                      <span>Total em capital investido</span>
                    </div>
                  </div>

                  {/* Responsive Scalable Inline Vector Chart */}
                  <div className="relative w-full overflow-hidden bg-slate-50 rounded-xl border border-slate-200/60 p-2 select-none">
                    <svg
                      id="evolution_svg_chart"
                      ref={svgRef}
                      viewBox="0 0 800 360"
                      className="w-full h-auto cursor-crosshair"
                      onMouseMove={handleMouseMoveSVG}
                      onMouseLeave={handleMouseLeaveSVG}
                    >
                      {/* Grid Background Lines (Y axis splits) */}
                      {[0, 0.25, 0.5, 0.75, 1].map((ratio, gridIdx) => {
                        const yCoord = 30 + ratio * 290;
                        const gridVal = maxScale * (1 - ratio);
                        return (
                          <g key={gridIdx} className="opacity-40">
                            <line
                              x1="70"
                              y1={yCoord}
                              x2="770"
                              y2={yCoord}
                              stroke="#cbd5e1"
                              strokeWidth="0.8"
                              strokeDasharray="4 4"
                            />
                            <text
                              x="60"
                              y={yCoord + 4}
                              fontFamily="inherit"
                              fontSize="9.5"
                              fontWeight="600"
                              fill="#64748b"
                              textAnchor="end"
                              className="font-mono"
                            >
                              {formatShortBRL(gridVal)}
                            </text>
                          </g>
                        );
                      })}

                      {/* X Axis horizontal line */}
                      <line x1="70" y1="320" x2="770" y2="320" stroke="#94a3b8" strokeWidth="1.2" />

                      {/* Generate paths */}
                      {(() => {
                        const pointsCount = plotData.length;
                        const stepsX = 700 / (pointsCount - 1 || 1);

                        // Points arrays mapping coordinates
                        const coords = plotData.map((d, index) => {
                          const x = 70 + index * stepsX;
                          const yBalance = 320 - (d.balance / maxScale) * 290;
                          const yBalanceNet = 320 - ((d.balanceNet || d.balance) / maxScale) * 290;
                          const yInvested = 320 - (d.invested / maxScale) * 290;
                          return { x, yBalance, yBalanceNet, yInvested };
                        });

                        // Draw Balance Fill Area
                        let balanceAreaPath = `M 70 320`;
                        coords.forEach(pt => {
                          balanceAreaPath += ` L ${pt.x} ${pt.yBalance}`;
                        });
                        balanceAreaPath += ` L 770 320 Z`;

                        // Draw Invested Fill Area
                        let investedAreaPath = `M 70 320`;
                        coords.forEach(pt => {
                          investedAreaPath += ` L ${pt.x} ${pt.yInvested}`;
                        });
                        investedAreaPath += ` L 770 320 Z`;

                        // Draw lines paths
                        let balanceLinePath = `M ${coords[0].x} ${coords[0].yBalance}`;
                        let balanceNetLinePath = `M ${coords[0].x} ${coords[0].yBalanceNet}`;
                        let investedLinePath = `M ${coords[0].x} ${coords[0].yInvested}`;
                        for (let k = 1; k < coords.length; k++) {
                           balanceLinePath += ` L ${coords[k].x} ${coords[k].yBalance}`;
                           balanceNetLinePath += ` L ${coords[k].x} ${coords[k].yBalanceNet}`;
                           investedLinePath += ` L ${coords[k].x} ${coords[k].yInvested}`;
                        }

                        // Determine step count on X axis ticks (avoid overcrowding)
                        const tickStepSize = Math.max(1, Math.ceil(pointsCount / 10));

                        return (
                          <g>
                            {/* Color Fills with Opacities */}
                            <path d={balanceAreaPath} fill="url(#balanceGrad)" className="opacity-20" />
                            <path d={investedAreaPath} fill="url(#investedGrad)" className="opacity-15" />

                            {/* Gradients declarations */}
                            <defs>
                              <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#801D1A" />
                                <stop offset="100%" stopColor="#801D1A" stopOpacity="0" />
                              </linearGradient>
                              <linearGradient id="investedGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#0f172a" />
                                <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                              </linearGradient>
                            </defs>

                            {/* Line Curves */}
                            <path
                              d={investedLinePath}
                              fill="none"
                              stroke="#0f172a"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                            />
                            <path
                              d={balanceLinePath}
                              fill="none"
                              stroke="#801D1A"
                              strokeWidth="2.2"
                              strokeLinecap="round"
                            />

                            {committedParams.tributacao === 'regressiva' && (
                              <path
                                d={balanceNetLinePath}
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2"
                                strokeDasharray="3 3"
                                strokeLinecap="round"
                              />
                            )}

                            {/* Data points nodes (drawn as nodes circles as shown in image 2) */}
                            {coords.map((pt, idx) => {
                              if (idx % tickStepSize !== 0 && idx !== coords.length - 1) return null;
                              return (
                                <g key={idx}>
                                  <circle
                                    cx={pt.x}
                                    cy={pt.yInvested}
                                    r="4"
                                    fill="#fff"
                                    stroke="#0f172a"
                                    strokeWidth="1.5"
                                  />
                                  <circle
                                    cx={pt.x}
                                    cy={pt.yBalance}
                                    r="4.5"
                                    fill="#fff"
                                    stroke="#801D1A"
                                    strokeWidth="2"
                                  />
                                  {committedParams.tributacao === 'regressiva' && (
                                    <circle
                                      cx={pt.x}
                                      cy={pt.yBalanceNet}
                                      r="3.5"
                                      fill="#fff"
                                      stroke="#10b981"
                                      strokeWidth="1.5"
                                    />
                                  )}
                                </g>
                              );
                            })}

                            {/* X Ticks Text values */}
                            {plotData.map((d, idx) => {
                              if (idx % tickStepSize !== 0 && idx !== plotData.length - 1) return null;
                              const xCoord = 70 + idx * stepsX;
                              return (
                                <g key={idx} className="opacity-85">
                                  <line x1={xCoord} y1="320" x2={xCoord} y2="325" stroke="#94a3b8" strokeWidth="1" />
                                  <text
                                    x={xCoord}
                                    y="342"
                                    fontFamily="inherit"
                                    fontSize="9.5"
                                    fontWeight="600"
                                    fill="#475569"
                                    textAnchor="middle"
                                  >
                                    {d.periodText.replace("Ano ", "").replace("Mês ", "")}
                                  </text>
                                </g>
                              );
                            })}

                            {/* Axis Labels labels inside margins */}
                            <text
                              x="420"
                              y="358"
                              fontSize="9"
                              fontWeight="bold"
                              fill="#94a3b8"
                              textAnchor="middle"
                              className="uppercase tracking-wider"
                            >
                              Intervalo Temporal ({committedParams.periodoTipo === 'anos' ? 'Anos' : 'Meses'})
                            </text>

                            {/* Interactive Hover gridlines system */}
                            {hoverIdx !== null && coords[hoverIdx] && (
                              <g>
                                {/* Vertical dotted reference line */}
                                <line
                                  x1={coords[hoverIdx].x}
                                  y1="30"
                                  x2={coords[hoverIdx].x}
                                  y2="320"
                                  stroke="#801D1A"
                                  strokeWidth="1"
                                  strokeDasharray="3 3"
                                />

                                {/* Glowing hover spots */}
                                <circle
                                  cx={coords[hoverIdx].x}
                                  cy={coords[hoverIdx].yInvested}
                                  r="7"
                                  fill="#0f172a"
                                  fillOpacity="0.2"
                                />
                                <circle
                                  cx={coords[hoverIdx].x}
                                  cy={coords[hoverIdx].yInvested}
                                  r="4"
                                  fill="#0f172a"
                                />

                                <circle
                                  cx={coords[hoverIdx].x}
                                  cy={coords[hoverIdx].yBalance}
                                  r="8.5"
                                  fill="#801D1A"
                                  fillOpacity="0.2"
                                />
                                <circle
                                  cx={coords[hoverIdx].x}
                                  cy={coords[hoverIdx].yBalance}
                                  r="4.5"
                                  fill="#801D1A"
                                />

                                {committedParams.tributacao === 'regressiva' && (
                                  <g>
                                    <circle
                                      cx={coords[hoverIdx].x}
                                      cy={coords[hoverIdx].yBalanceNet}
                                      r="7.5"
                                      fill="#10b981"
                                      fillOpacity="0.2"
                                    />
                                    <circle
                                      cx={coords[hoverIdx].x}
                                      cy={coords[hoverIdx].yBalanceNet}
                                      r="4"
                                      fill="#10b981"
                                    />
                                  </g>
                                )}
                              </g>
                            )}
                          </g>
                        );
                      })()}
                    </svg>

                    {/* Cursor floating overlay box */}
                    {hoverIdx !== null && plotData[hoverIdx] && (
                      <div
                        id="chart_tooltip_overlay"
                        className="absolute bg-slate-900/95 text-white text-[11px] px-3.5 py-2.5 rounded-lg shadow-xl border border-slate-700/50 flex flex-col gap-1 pointer-events-none hover:opacity-100 transition-opacity backdrop-blur-xs w-52"
                        style={{
                          left: `${Math.min(
                            70,
                            Math.max(5, (70 + hoverIdx * (700 / (plotData.length - 1))) / 8 - 14)
                          )}%`,
                          top: '12%',
                        }}
                      >
                        <span className="font-extrabold text-rose-300 uppercase tracking-widest text-[9px] mb-0.5 border-b border-white/10 pb-0.5">
                          {plotData[hoverIdx].periodText === '0' ? 'Início (Mês 0)' : plotData[hoverIdx].periodText}
                        </span>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-white/75 font-medium">Acumulado Bruto:</span>
                          <span className="font-extrabold font-mono text-white">{formatBRL(plotData[hoverIdx].balance)}</span>
                        </div>
                        {committedParams.tributacao === 'regressiva' && (
                          <>
                            <div className="flex items-center justify-between gap-4">
                              <span className="text-emerald-300 font-bold">Acumulado Líquido:</span>
                              <span className="font-extrabold font-mono text-emerald-400">{formatBRL(plotData[hoverIdx].balanceNet)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-4 text-rose-300">
                              <span className="font-medium">Imposto (IR):</span>
                              <span className="font-bold font-mono">- {formatBRL(plotData[hoverIdx].taxPaid)}</span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-white/75 font-medium">Capital Investido:</span>
                          <span className="font-bold font-mono text-slate-300">{formatBRL(plotData[hoverIdx].invested)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-white/75 font-medium">Total em Juros:</span>
                          <span className="font-bold font-mono text-[#ecd5d4]">{formatBRL(plotData[hoverIdx].interestCumulative)}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 text-center italic mt-0.5 block">
                    * Passe o mouse temporariamente por cima da malha do gráfico para rastrear as coordenadas mensais/anuais.
                  </span>
                </div>
              )}

              {/* 2. EVOLUTION DATA TABLE COMPONENT */}
              {activeTab === 'tabela' && (
                <div id="table_container" className="w-full h-full flex flex-col justify-between gap-4 animate-fadeIn">
                  
                  <div className="overflow-x-auto border border-slate-200/80 rounded-xl bg-white shadow-xs">
                    <table className="w-full table-auto border-collapse text-left text-xs text-slate-700">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold tracking-wide">
                          <th className="px-4 py-3.5 font-bold">Período ({viewMode === 'anual' ? 'Anual' : 'Mensal'})</th>
                          <th className="px-4 py-3.5 font-bold">Capital Investido</th>
                          <th className="px-4 py-3.5 font-bold">Rendimento no Período</th>
                          <th className="px-4 py-3.5 font-bold">Total em Juros</th>
                          <th className="px-4 py-3.5 font-bold text-right">Montante Bruto</th>
                          {committedParams.tributacao === 'regressiva' && (
                            <th className="px-4 py-3.5 font-bold text-right text-emerald-700 bg-emerald-50/20">Montante Líquido</th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {paginatedRows.map((row: any, rIdx) => {
                          const isAnual = 'periodIndex' in row;
                          const pIndex = isAnual ? row.periodIndex : row.monthIndex;

                          const periodText = row.periodText;
                          const invested = formatBRL(row.invested);
                          const periodInterest = formatBRL(isAnual ? row.interestPeriodEarned : row.interestAccrued);
                          const cumInterest = formatBRL(row.interestCumulative);
                          const total = formatBRL(row.balance);
                          const totalNet = formatBRL(row.balanceNet || row.balance);

                          return (
                            <tr key={rIdx} className="hover:bg-rose-50/20 transition-colors font-mono even:bg-slate-50/30">
                              <td className="px-4 py-2.5 font-semibold text-slate-900 font-sans">{periodText}</td>
                              <td className="px-4 py-2.5 text-slate-600">{invested}</td>
                              <td className="px-4 py-2.5 text-emerald-600 font-semibold">+{periodInterest}</td>
                              <td className="px-4 py-2.5 text-slate-500">{cumInterest}</td>
                              <td className="px-4 py-2.5 text-right font-bold text-slate-700">{total}</td>
                              {committedParams.tributacao === 'regressiva' && (
                                <td className="px-4 py-2.5 text-right font-bold text-emerald-600 bg-emerald-50/30">{totalNet}</td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination bar controls */}
                  {totalPages > 1 && (
                    <div id="table-pagination-bar" className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                      <span className="text-slate-500 font-medium">
                        Mostrando página <strong className="text-slate-800 font-mono">{currentPage}</strong> de <strong className="text-slate-800 font-mono">{totalPages}</strong> ({displayTableList.length} registros)
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          id="btn_prev_page"
                          type="button"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-700 font-semibold cursor-pointer select-none transition-colors"
                        >
                          Anterior
                        </button>
                        <button
                          id="btn_next_page"
                          type="button"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          className="px-2.5 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white text-slate-700 font-semibold cursor-pointer select-none transition-colors"
                        >
                          Próxima
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              )}

            </div>

          </section>

        </div>

        {/* AI Senior Insight & Recommendation Panel */}
        <section id="ai-insight-section" className="bg-gradient-to-r from-red-50/60 to-orange-50/30 border border-rose-100 rounded-2xl p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <span className="p-2 bg-[#801D1A]/10 text-[#801D1A] rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </span>
              <div className="flex flex-col">
                <h3 className="text-sm font-bold text-slate-900">
                  Análise de Portfólio & Relatório Recomendado com IA
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Gere um relatório instantâneo sobre diversificação de ativos, inflação e estratégias baseadas na sua projeção.
                </p>
              </div>
            </div>

            <button
              id="btn_gerar_insights_ia"
              type="button"
              disabled={loadingAi}
              onClick={handleGetAiInsights}
              className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              {loadingAi ? 'Analisando projeções...' : 'Analisar meu Resultado'}
            </button>
          </div>

          {/* AI Response output area */}
          {(aiInsight || loadingAi || aiError) && (
            <div id="ai_insight_output" className="mt-5 border-t border-rose-100 pt-5 animate-fadeIn">
              {loadingAi && (
                <div className="flex flex-col items-center justify-center py-8 gap-3">
                  <div className="relative w-8 h-8">
                    <span className="absolute w-full h-full border-2 border-[#801D1A]/20 border-t-[#801D1A] rounded-full animate-spin" />
                  </div>
                  <p className="text-xs text-slate-500 animate-pulse">
                    Nossa IA do Gemini está avaliando seus dados com padrões de macroeconomia financeira do Brasil...
                  </p>
                </div>
              )}

              {aiError && (
                <div className="p-4 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-center gap-2">
                  <Info className="w-4.5 h-4.5 shrink-0" />
                  <span>{aiError}</span>
                </div>
              )}

              {aiInsight && !loadingAi && (
                <div className="bg-white/80 p-5 rounded-xl border border-rose-100/40 relative">
                  <div className="absolute top-3.5 right-3.5 inline-flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <CheckCircle2 className="w-3 h-3" /> Relatório Pronto
                  </div>
                  <div className="max-w-none text-slate-800 pr-12">
                    {renderMarkdown(aiInsight)}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Live Simple Interest vs Compound Interest educational showdown! */}
        <section id="simple-vs-compound-showcase" className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          
          <div className="md:col-span-4 bg-slate-900 text-white rounded-2xl p-6 flex flex-col justify-between gap-5 border border-slate-950 shadow-sm">
            <div className="flex flex-col gap-2">
              <span className="p-1.5 bg-white/10 text-rose-300 rounded-lg w-fit">
                <ArrowRightLeft className="w-4.5 h-4.5" />
              </span>
              <h3 className="text-base font-extrabold text-white">
                O Confronto dos Juros: Compostos vs Simples
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Os juros simples agem como uma reta de acréscimos fixos. Os compostos atuam como uma bola de neve, onde os rendimentos do mês passado também rendem lucros no mês seguinte.
              </p>
            </div>

            <div className="border-t border-slate-800 pt-4 flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Ganho extra nesta simulação:
              </span>
              <span className="text-2xl font-black text-rose-300 font-mono">
                +{formatBRL(calculated.compoundDifference)}
              </span>
              <p className="text-[10px] text-slate-400 italic">
                Rendimento extra obtido puramente através da força dos juros sobre juros!
              </p>
            </div>
          </div>

          <div className="md:col-span-8 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#801D1A]" /> Comparativo de Acúmulo no Período
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-2">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <span className="text-[10px] font-bold text-slate-500 block mb-1 uppercase">
                  Montante Simples
                </span>
                <span className="text-[#801D1A] font-bold font-mono text-lg block">
                  {formatBRL(calculated.simpleInterestTotal)}
                </span>
                <span className="text-[10px] text-slate-400">
                  Apenas o capital base rende juros ({formatBRL(calculated.simpleInterestEarned)} em rendimentos).
                </span>
              </div>

              <div className="p-3 bg-[#EBFDFC]/40 border border-emerald-100 rounded-xl">
                <span className="text-[10px] font-bold text-[#801D1A] block mb-1 uppercase">
                  Montante Composto
                </span>
                <span className="text-emerald-700 font-black font-mono text-lg block">
                  {formatBRL(calculated.totalFinal)}
                </span>
                <span className="text-[10px] text-slate-500">
                  Rendimentos reinvestidos rendendo juros ({formatBRL(calculated.totalJuros)} em rendimentos).
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl text-slate-600 text-xs flex items-start gap-2.5">
              <Info className="w-4.5 h-4.5 text-[#801D1A] shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800 block mb-0.5">Por que essa disparidade acontece?</span>
                <p className="leading-relaxed">
                  Em {committedParams.periodo} {committedParams.periodoTipo === 'anos' ? 'anos' : 'meses'} nesta simulação, os rendimentos gerados no juro composto somaram à base de cálculo mês a pós mês. Isto é a chamada <strong>fruição diferida</strong>, acumulando riqueza de forma exponencial. No juro simples o investimento estagna na velocidade de ganho inicial.
                </p>
              </div>
            </div>

          </div>

        </section>

        {/* Custom educational Step-by-Step guide (Step 1 to 5) */}
        <section id="step-by-step-guide" className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-xs flex flex-col gap-6">
          
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold text-[#801D1A] uppercase tracking-wider flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Guia Prático de Utilização
            </h3>
          </div>

          <p className="text-slate-600 text-sm leading-relaxed max-w-3xl">
            Nosso simulador foi projetado com matemática financeira rigorosa e precisão monetária para orientar o seu planejamento orçamentário. Siga o roteiro passo a passo para extrair as melhores projeções:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-2">
            
            {/* Step 1 */}
            <div id="step_1_box" className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all flex flex-col gap-2">
              <span className="w-6 h-6 bg-[#801D1A]/10 text-[#801D1A] rounded-full flex items-center justify-center text-xs font-black">
                1
              </span>
              <h4 className="text-xs font-bold text-slate-800">
                Ponto de Partida
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Adicione no campo <strong>Valor Inicial</strong> a quantia total que você possui disponível hoje para abrir esta aplicação.
              </p>
            </div>

            {/* Step 2 */}
            <div id="step_2_box" className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all flex flex-col gap-2">
              <span className="w-6 h-6 bg-[#801D1A]/10 text-[#801D1A] rounded-full flex items-center justify-center text-xs font-black">
                2
              </span>
              <h4 className="text-xs font-bold text-slate-800">
                Aportes Periódicos
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Estipule no campo <strong>Valor Mensal</strong> quanto do seu salário ou rendas extras você consegue destinar para reinvestimento todos os meses.
              </p>
            </div>

            {/* Step 3 */}
            <div id="step_3_box" className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all flex flex-col gap-2">
              <span className="w-6 h-6 bg-[#801D1A]/10 text-[#801D1A] rounded-full flex items-center justify-center text-xs font-black">
                3
              </span>
              <h4 className="text-xs font-bold text-slate-800">
                Ganhos de Juros
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Insira a taxa de rendimento estimada. Selecione se ela é baseada no rendimento <strong>mensal</strong> (ex: CDI) ou <strong>anual</strong> (ex: Selic ou ações).
              </p>
            </div>

            {/* Step 4 */}
            <div id="step_4_box" className="p-4 bg-slate-50/50 border border-slate-100 rounded-xl hover:bg-slate-50 hover:border-slate-200 transition-all flex flex-col gap-2">
              <span className="w-6 h-6 bg-[#801D1A]/10 text-[#801D1A] rounded-full flex items-center justify-center text-xs font-black">
                4
              </span>
              <h4 className="text-xs font-bold text-slate-800">
                Horizonte Temporal
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Marque em quanto tempo quer projetar, escolhendo o período em **meses** ou **anos**. Prazos longos revelam a beleza da acumulação exponencial.
              </p>
            </div>

            {/* Step 5 */}
            <div id="step_5_box" className="p-4 bg-[#801D1A]/5 border border-rose-100/30 rounded-xl hover:bg-[#801D1A]/10 transition-all flex flex-col gap-2">
              <span className="w-6 h-6 bg-[#801D1A] text-white rounded-full flex items-center justify-center text-xs font-black">
                5
              </span>
              <h4 className="text-xs font-bold text-[#801D1A]">
                Projete e Decida!
              </h4>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Pressione <strong>Calcular</strong>. Use as guias do painel direito para alternar entre as marcações do gráfico e a planilha física do Excel calculada.
              </p>
            </div>

          </div>

        </section>

        {/* Compound Interest Theory & Deep Insights section */}
        <section id="theoretical-insights" className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Formula Theory Card - 5 columns */}
          <div id="formula_theory_card" className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-4 shadow-xs">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-[#801D1A]" /> A Fórmula por Trás dos Cálculos
            </h4>

            <div className="my-2 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center flex flex-col items-center justify-center">
              <span className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider block">Fórmula de Juros Compostos</span>
              <span className="text-xl md:text-2xl font-black font-mono text-[#801D1A]">
                M = C · (1 + i)ᵗ
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Diferente de cálculos rudimentares, a matemática dos juros compostos gera curvas crescentes. Cada ponto da equação representa:
            </p>

            <ul className="text-xs text-slate-700 flex flex-col gap-2">
              <li className="flex items-center gap-2">
                <span className="font-bold text-[#801D1A] min-w-[20px] text-right font-mono text-sm">M</span>
                <span>representa o <strong>Montante acumulado</strong> final da transação ao fim do período.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold text-[#801D1A] min-w-[20px] text-right font-mono text-sm">C</span>
                <span>representa o <strong>Capital inicial</strong> investido.</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold text-[#801D1A] min-w-[20px] text-right font-mono text-sm">i</span>
                <span>representa a <strong>Taxa decimal de rendimento</strong> (ex: 8% anual vira a constante decimal 0.08).</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="font-bold text-[#801D1A] min-w-[20px] text-right font-mono text-sm">t</span>
                <span>representa o <strong>Tempo / período</strong> de vigência da aplicação.</span>
              </li>
            </ul>

            <div className="bg-rose-50/40 p-3 rounded-lg border border-rose-100 text-[11px] text-slate-600 leading-relaxed">
              💡 <strong>Regra de ouro:</strong> Para efetuar contas manuais, certifique-se de que a taxa <strong>i</strong> e o período <strong>t</strong> estejam indexados no mesmo padrão de grandeza temporal (ambos em meses ou ambos em anos), exatamente como nosso software faz de forma automatizada ao converter taxas anuais!
            </div>
          </div>

          {/* Where Compound Interest Applies Card - 7 columns */}
          <div id="financial_destination_card" className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 flex flex-col gap-5 shadow-xs">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-[#801D1A]" /> Aplicações Práticas: Juros a seu Favor
            </h4>

            <p className="text-slate-600 text-xs md:text-sm leading-relaxed">
              O conceito de juros sobre juros é amoral: não é herói nem vilão. Ele age como um multiplicador. Se você estiver devendo com faturas atrasadas e cheque especial, os juros estarão destruindo seu patrimônio. No entanto, se você souber escolher bons canais, poderá usar essa física econômica para gerar independência financeira.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-1">
              
              <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/60 transition-colors">
                <span className="px-2 py-0.5 bg-[#801D1A]/10 text-[#801D1A] font-bold text-[9px] uppercase tracking-wider rounded w-fit">
                  Dívidas
                </span>
                <h5 className="font-bold text-xs text-slate-800">Financiamentos</h5>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Bancos cobram juros compostos sobre parcelas em aberto e créditos. Quitar dívidas logo é o primeiro investimento para evitar que as contas virem bolas de neve descontroladas.
                </p>
              </div>

              <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/60 transition-colors">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase tracking-wider rounded w-fit">
                  Renda Fixa
                </span>
                <h5 className="font-bold text-xs text-slate-800">CDBs & Tesouros</h5>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Títulos públicos (Selic, IPCA+) e certificados de depósito bancário rendem juros compostos diários seguros, permitindo o acúmulo sustentável de suas reservas econômicas.
                </p>
              </div>

              <div className="flex flex-col gap-2 p-3 bg-slate-50 rounded-xl hover:bg-slate-100/60 transition-colors">
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold text-[9px] uppercase tracking-wider rounded w-fit">
                  Renda Variável
                </span>
                <h5 className="font-bold text-xs text-slate-800">Ações & Dividendos</h5>
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  Nas bolsas de valores, os juros sobre juros agem primariamente quando você pega as frações de lucro recebidos (dividendos) e as usa para comprar mais ações do mesmo ativo.
                </p>
              </div>

            </div>

            <span className="text-[11px] text-slate-500 italic text-center block mt-1 border-t border-slate-100 pt-3">
              &ldquo;Juros compostos são a oitava maravilha do mundo. Quem entende, ganha. Quem não entende, paga.&rdquo; &mdash; Albert Einstein
            </span>

          </div>

        </section>

      </main>

      {/* Styled Footer */}
      <footer id="footer-main" className="bg-slate-900 text-slate-400 text-center py-8 border-t border-slate-850 mt-12 px-4 shadow-inner">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>
            &copy; 2026 Simulador de Juros Compostos. Desenvolvido para fins de planejamento educacional financeiro livre.
          </p>
          <div className="flex items-center gap-4 text-slate-500 font-mono">
            <span>Precisão: Dupla flutuação</span>
            <span>Versão: 1.1.0-Release</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
