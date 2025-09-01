import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { UploadCloud, TrendingUp, Wallet, HelpCircle, Package, PackagePlus, Gift, Percent, Gem, Target, PiggyBank, ChevronsUp, ChevronsDown, BarChart2, Eye, X } from 'lucide-react';

// --- Custom Components & Helpers ---

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-3 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-xl text-gray-800">
        {label && <p className="label text-sm font-bold text-gray-900 mb-2">{`${label}`}</p>}
        {payload.map((pld, index) => {
          const name = pld.name;
          const isCurrency = ['Investment Amount', 'Current Value', 'Total Invested', 'Profit / Loss', 'Portfolio Value', 'NAV', 'Average Cost', 'Capital Gains', 'Dividends', 'Invested Capital', 'Total Returns'].includes(name);
          const value = isCurrency && typeof pld.value === 'number'
            ? pld.value.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 })
            : (typeof pld.value === 'number' ? pld.value.toFixed(2) : pld.value);
            
          return (
            <div key={index} className="flex items-center justify-between text-xs mt-1">
              <div className="flex items-center">
                <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: pld.fill || pld.stroke }}></div>
                <span className="font-medium text-gray-600">{name}:</span>
              </div>
              <span className="font-bold ml-2">{value}</span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

const InfoTooltip = ({ text }) => {
    const [show, setShow] = useState(false);
    return (
        <div className="relative flex items-center" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            <HelpCircle className="w-4 h-4 text-gray-500 cursor-pointer" />
            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-gray-800 text-white text-xs rounded-lg shadow-lg transition-opacity duration-300 z-10 ${show ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {text}
            </div>
        </div>
    );
};

const Modal = ({ isOpen, onClose, title, data }) => {
    if (!isOpen) return null;

    const headers = data.length > 0 ? Object.keys(data[0]).filter(h => h !== 'Status') : [];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-800/80 border border-white/20 rounded-2xl shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <header className="flex items-center justify-between p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
                </header>
                <div className="p-6 overflow-auto">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-gray-800 sticky top-0">
                            <tr>
                                {headers.map(header => <th key={header} className="p-3 font-semibold">{header}</th>)}
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((row, rowIndex) => (
                                <tr key={rowIndex} className="border-b border-white/10 last:border-b-0">
                                    {headers.map(header => (
                                        <td key={`${rowIndex}-${header}`} className="p-3">
                                            {row[header] instanceof Date ? row[header].toLocaleDateString('en-CA') : row[header]}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};


// --- Main App Component ---
export default function App() {
  // --- State Management ---
  const [allInvestments, setAllInvestments] = useState([]);
  const [repayments, setRepayments] = useState([]);
  const [todayNav, setTodayNav] = useState(10.01);
  const [metrics, setMetrics] = useState({
    totalInvested: 0, totalUnits: 0, totalUnitsPurchased: 0, totalUnitsFromDividends: 0, pendingUnits: 0, pendingAmount: 0,
    totalDividends: 0, currentValue: 0, totalProfitLoss: 0, profitLossPercent: 0,
    investmentPeriod: '0Y 0M', cagr: 0, highestNav: { value: 0, date: '' }, lowestNav: { value: 0, date: '' }, avgCost: 0,
  });
  const [chartData, setChartData] = useState({
    growth: [], returnComposition: [], avgCostVsNav: [], yearlyInvestment: [], monthlyInvestment: [], portfolioComposition: [],
  });
  const [investmentFileName, setInvestmentFileName] = useState('');
  const [repaymentFileName, setRepaymentFileName] = useState('');
  const [modalState, setModalState] = useState({ isOpen: false, title: '', data: [] });

  // --- CSV Parsing Logic ---
  const handleFile = useCallback((file, setData, setFileName) => {
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target.result;
        const lines = text.trim().split('\n');
        if (lines.length < 2) { setData([]); return; }
        const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        headers[0] = 'Status';
        const data = lines.slice(1).map(line => {
          const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g).map(v => v.trim().replace(/"/g, ''));
          return headers.reduce((obj, header, index) => { obj[header] = values[index]; return obj; }, {});
        });
        const processedData = data.map(row => ({
            ...row, 'NAV Date': new Date(row['NAV Date']), NAV: parseFloat(row['NAV']), Unit: parseFloat(row['Unit']), 'Total Amount': parseFloat(row['Total Amount']),
          })).filter(row => !isNaN(row['NAV Date'].getTime()) && row['Total Amount'] > 0).sort((a, b) => a['NAV Date'] - b['NAV Date']);
        setData(processedData);
      } catch (error) { console.error("Error parsing CSV:", error); }
    };
    reader.readAsText(file);
  }, []);

  // --- Calculation Engine ---
  useEffect(() => {
    const activeInvestments = allInvestments.filter(inv => inv.Status === 'A');
    const pendingInvestments = allInvestments.filter(inv => inv.Status === 'P');

    if (activeInvestments.length === 0 && pendingInvestments.length === 0) { setMetrics(m => ({ ...m, totalInvested: 0, currentValue: 0, totalProfitLoss: 0, cagr: 0, profitLossPercent: 0, pendingUnits: 0, pendingAmount: 0 })); return; }

    const totalInvested = activeInvestments.reduce((acc, curr) => acc + curr['Total Amount'], 0);
    const totalUnitsPurchased = activeInvestments.reduce((acc, curr) => acc + (curr['Unit'] || 0), 0);
    const totalUnitsFromDividends = repayments.reduce((acc, curr) => acc + (curr['Unit'] || 0), 0);
    const totalUnits = totalUnitsPurchased + totalUnitsFromDividends;
    const pendingUnits = pendingInvestments.reduce((acc, curr) => acc + (curr['Unit'] || 0), 0);
    const pendingAmount = pendingInvestments.reduce((acc, curr) => acc + (curr['Total Amount'] || 0), 0);
    const totalDividends = repayments.reduce((acc, curr) => acc + curr['Total Amount'], 0);
    const currentValue = totalUnits * todayNav;
    const totalProfitLoss = (currentValue + totalDividends) - totalInvested;
    const profitLossPercent = totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    const firstDate = activeInvestments.length > 0 ? activeInvestments[0]['NAV Date'] : new Date();
    const lastDate = new Date();
    const months = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth());
    const years = Math.floor(months / 12);
    const remainingMonths = months % 12;
    const investmentPeriod = `${years}Y ${remainingMonths}M`;
    const numberOfYears = activeInvestments.length > 0 ? (lastDate - firstDate) / (1000 * 60 * 60 * 24 * 365.25) : 0;
    let cagr = 0;
    if (totalInvested > 0 && numberOfYears > 0.5) { cagr = (Math.pow((currentValue + totalDividends) / totalInvested, 1 / numberOfYears) - 1) * 100; }

    const highestNav = activeInvestments.reduce((max, inv) => inv.NAV > max.value ? { value: inv.NAV, date: inv['NAV Date'].toLocaleDateString('en-CA') } : max, { value: 0, date: '' });
    const lowestNav = activeInvestments.reduce((min, inv) => inv.NAV < min.value ? { value: inv.NAV, date: inv['NAV Date'].toLocaleDateString('en-CA') } : min, { value: Infinity, date: '' });
    const avgCost = totalInvested > 0 ? totalInvested / totalUnitsPurchased : 0;
    setMetrics({ totalInvested, totalUnits, totalUnitsPurchased, totalUnitsFromDividends, pendingUnits, pendingAmount, totalDividends, currentValue, totalProfitLoss, profitLossPercent, investmentPeriod, cagr, highestNav, lowestNav, avgCost });

    let cumulativeInvestment = 0, cumulativeUnits = 0;
    const growthData = [], avgCostData = [];
    activeInvestments.forEach(inv => {
      cumulativeInvestment += inv['Total Amount']; cumulativeUnits += inv['Unit']; const dateStr = inv['NAV Date'].toLocaleDateString('en-CA');
      growthData.push({ date: dateStr, 'Cumulative Investment': cumulativeInvestment, 'Portfolio Value': cumulativeUnits * inv['NAV'] });
      avgCostData.push({ date: dateStr, 'NAV': inv['NAV'], 'Average Cost': cumulativeInvestment / cumulativeUnits });
    });

    const capitalGains = currentValue - totalInvested;
    const returnCompositionData = [{ name: 'Capital Gains', value: Math.max(0, capitalGains) }, { name: 'Dividends', value: Math.max(0, totalDividends) }].filter(item => item.value > 0);
    const yearlyInvestmentMap = activeInvestments.reduce((acc, inv) => { const year = inv['NAV Date'].getFullYear(); acc[year] = (acc[year] || 0) + inv['Total Amount']; return acc; }, {});
    const yearlyInvestmentData = Object.keys(yearlyInvestmentMap).map(year => ({ year, 'Investment Amount': yearlyInvestmentMap[year] })).sort((a,b) => a.year - b.year);
    
    const latestYear = yearlyInvestmentData.length > 0 ? yearlyInvestmentData[yearlyInvestmentData.length - 1].year : new Date().getFullYear();
    const monthlyInvestmentMap = activeInvestments.filter(inv => inv['NAV Date'].getFullYear().toString() === latestYear).reduce((acc, inv) => { const month = inv['NAV Date'].toLocaleString('default', { month: 'short' }); acc[month] = (acc[month] || 0) + inv['Total Amount']; return acc; }, {});
    const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthlyInvestmentData = monthOrder.map(month => ({ month, 'Investment Amount': monthlyInvestmentMap[month] || 0 })).filter(d => d['Investment Amount'] > 0);
    
    const portfolioCompositionData = [
        { name: 'Invested Capital', value: Math.max(0, totalInvested) },
        { name: 'Total Returns', value: Math.max(0, totalProfitLoss) },
    ];

    setChartData({ growth: growthData, returnComposition: returnCompositionData, avgCostVsNav: avgCostData, yearlyInvestment: yearlyInvestmentData, monthlyInvestment: monthlyInvestmentData, portfolioComposition: portfolioCompositionData });
  }, [allInvestments, repayments, todayNav]);
  
  const RETURN_COLORS = ['#10b981', '#f59e0b'];
  const COMPOSITION_COLORS = ['#8b5cf6', '#34d399'];
  const FileInput = ({ id, onFileSelect, fileName, label }) => (<div className="w-full"><label htmlFor={id} className="group w-full cursor-pointer bg-white/5 hover:bg-white/10 border-2 border-dashed border-gray-500 hover:border-violet-400 text-gray-300 font-semibold py-3 px-4 rounded-lg inline-flex items-center justify-center transition-all duration-300"><UploadCloud className="w-5 h-5 mr-3 text-gray-400 group-hover:text-violet-400 transition-colors" /><span className="group-hover:text-violet-300">{label}</span></label><input id={id} type="file" accept=".csv" className="hidden" onChange={e => onFileSelect(e.target.files[0])} />{fileName && <p className="text-xs text-gray-400 mt-2 truncate text-center" title={fileName}>{fileName}</p>}</div>);
  
  const MetricCard = ({ title, value, delta, icon, deltaColor, smallText, children }) => {
    const valueStr = value.toString();
    let fontSizeClass;

    if (smallText) {
        fontSizeClass = 'text-xl';
        if (valueStr.length > 12) {
            fontSizeClass = 'text-lg';
        }
    } else {
        fontSizeClass = 'text-2xl lg:text-3xl';
        if (valueStr.length > 15) {
            fontSizeClass = 'text-lg lg:text-xl';
        } else if (valueStr.length > 11) {
            fontSizeClass = 'text-xl lg:text-2xl';
        }
    }
    
    return (
        <div className="bg-white/5 backdrop-blur-md p-5 rounded-xl border border-white/10 shadow-lg flex flex-col justify-between min-h-[120px] sm:min-h-[130px]">
            <div className="flex items-center justify-between text-gray-400">
                <div className="flex items-center">
                    {icon}
                    <p className="font-semibold text-sm ml-2 truncate" title={title}>{title}</p>
                </div>
                {children}
            </div>
            <div>
                <h3 className={`font-bold text-white mt-3 break-words ${fontSizeClass}`}>{value}</h3>
                {delta && <p className={`text-sm font-semibold mt-1 truncate ${deltaColor || 'text-gray-400'}`}>{delta}</p>}
            </div>
        </div>
    );
  };

  const ChartContainer = ({ title, children, className = '' }) => (<div className={`bg-white/5 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-white/10 shadow-lg ${className}`}><h3 className="text-base font-semibold text-white mb-4">{title}</h3>{children}</div>);
  const ViewButton = ({ onClick, label }) => (<button onClick={onClick} className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-4 bg-white/5 hover:bg-white/10 text-violet-300 rounded-lg transition-colors"><Eye className="w-4 h-4"/>{label}</button>)

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen font-sans bg-gradient-to-br from-[#111827] via-[#101010] to-[#020617]">
      <Modal isOpen={modalState.isOpen} onClose={() => setModalState({ isOpen: false, title: '', data: [] })} title={modalState.title} data={modalState.data} />
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <header className="mb-10 text-center"><div className="inline-block bg-violet-500/10 text-violet-400 p-3 rounded-xl border border-violet-500/20"><PiggyBank className="w-8 h-8"/></div><h1 className="text-4xl font-bold text-white mt-4">SIP Performance Analyzer</h1><p className="text-gray-400 mt-2">A clearer view of your investment journey.</p></header>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3 h-fit lg:sticky lg:top-8"><div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg"><h2 className="text-lg font-semibold mb-5 text-white">Controls</h2><div className="space-y-6"><FileInput id="investments-csv" label="Upload Investments" fileName={investmentFileName} onFileSelect={(file) => handleFile(file, setAllInvestments, setInvestmentFileName)} /><FileInput id="repayments-csv" label="Upload Dividends" fileName={repaymentFileName} onFileSelect={(file) => handleFile(file, setRepayments, setRepaymentFileName)} /><div><label htmlFor="today-nav" className="block text-sm font-medium text-gray-300 mb-2">Today's NAV</label><input id="today-nav" type="number" value={todayNav} onChange={e => setTodayNav(parseFloat(e.target.value) || 0)} className="w-full bg-gray-700/50 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition" placeholder="e.g., 12.50" step="0.01" /></div></div>
          {allInvestments.length > 0 && <div className="mt-6 pt-6 border-t border-white/10"><ViewButton onClick={() => setModalState({ isOpen: true, title: 'Investment List', data: allInvestments })} label="View Investments" /><ViewButton onClick={() => setModalState({ isOpen: true, title: 'Dividend List', data: repayments })} label="View Dividends" /></div>}
          </div></aside>
          <main className="lg:col-span-9">
            {allInvestments.length > 0 ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                  <MetricCard title="Invested" value={metrics.totalInvested.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })} icon={<Wallet className="w-5 h-5 text-violet-400" />} />
                  <MetricCard title="Current Value" value={metrics.currentValue.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })} icon={<Gem className="w-5 h-5 text-sky-400" />} />
                  <MetricCard title="Profit/Loss" value={metrics.totalProfitLoss.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })} delta={`${metrics.profitLossPercent.toFixed(2)}%`} deltaColor={metrics.totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'} icon={<TrendingUp className="w-5 h-5" />} />
                  <MetricCard title="CAGR" value={`${metrics.cagr.toFixed(2)}%`} delta={metrics.investmentPeriod} icon={<Percent className="w-5 h-5 text-amber-400" />}>
                    <InfoTooltip text="CAGR (Compound Annual Growth Rate) is the annualized rate of return that an investment provides over a period of time. It is a smoothed-out representation of your investment's growth." />
                  </MetricCard>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    <MetricCard title="Total Units" value={metrics.totalUnits.toFixed(2)} icon={<Package className="w-5 h-5" />} />
                    <MetricCard title="Purchased" value={metrics.totalUnitsPurchased.toFixed(2)} icon={<PackagePlus className="w-5 h-5" />} />
                    <MetricCard title="From Dividends" value={metrics.totalUnitsFromDividends.toFixed(2)} icon={<Gift className="w-5 h-5" />} />
                    <MetricCard title="Pending" value={metrics.pendingUnits.toFixed(2)} delta={metrics.pendingAmount.toLocaleString('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 })} icon={<HelpCircle className="w-5 h-5" />} />
                </div>
                <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
                    <h3 className="text-base font-semibold text-white mb-4">Key Stats</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <MetricCard smallText title="Highest NAV Paid" value={metrics.highestNav.value.toFixed(2)} delta={metrics.highestNav.date} icon={<ChevronsUp className="w-5 h-5 text-red-400"/>} />
                        <MetricCard smallText title="Lowest NAV Paid" value={metrics.lowestNav.value.toFixed(2)} delta={metrics.lowestNav.date} icon={<ChevronsDown className="w-5 h-5 text-green-400"/>} />
                        <MetricCard smallText title="Avg. Unit Cost" value={metrics.avgCost.toFixed(2)} delta="per purchased unit" icon={<BarChart2 className="w-5 h-5 text-blue-400"/>} />
                    </div>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
                  <ChartContainer title="Portfolio Growth" className="xl:col-span-3">
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData.growth} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <defs><linearGradient id="colorInvestment" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/><stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/></linearGradient><linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" /><XAxis dataKey="date" stroke="#9ca3af" fontSize={12} /><YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `₹${(value/1000)}k`} /><Tooltip content={<CustomTooltip />} /><Legend iconSize={10} /><Area type="monotone" dataKey="Cumulative Investment" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorInvestment)" strokeWidth={2} /><Area type="monotone" dataKey="Portfolio Value" stroke="#22c55e" fillOpacity={1} fill="url(#colorValue)" strokeWidth={2} /></AreaChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                  <ChartContainer title="Return Composition" className="xl:col-span-2">
                    <ResponsiveContainer width="100%" height={300}><PieChart><Tooltip content={<CustomTooltip />} /><Pie data={chartData.returnComposition} cx="50%" cy="50%" labelLine={false} innerRadius={70} outerRadius={120} fill="#8884d8" paddingAngle={5} dataKey="value" nameKey="name">{chartData.returnComposition.map((entry, index) => (<Cell key={`cell-${index}`} fill={RETURN_COLORS[index % RETURN_COLORS.length]} stroke={RETURN_COLORS[index % RETURN_COLORS.length]} />))}</Pie><Legend iconSize={10} verticalAlign="bottom" /></PieChart></ResponsiveContainer>
                  </ChartContainer>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  <ChartContainer title="Portfolio Composition">
                    <ResponsiveContainer width="100%" height={300}><PieChart><Tooltip content={<CustomTooltip />} /><Pie data={chartData.portfolioComposition} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5}>{chartData.portfolioComposition.map((entry, index) => (<Cell key={`cell-${index}`} fill={COMPOSITION_COLORS[index % COMPOSITION_COLORS.length]} />))}</Pie><Legend iconSize={10} verticalAlign="bottom" /></PieChart></ResponsiveContainer>
                  </ChartContainer>
                  <ChartContainer title={`Monthly Investment Trend (${chartData.monthlyInvestment.length > 0 ? new Date(chartData.growth[chartData.growth.length-1].date).getFullYear() : ''})`}>
                    <ResponsiveContainer width="100%" height={300}><BarChart data={chartData.monthlyInvestment} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" /><XAxis dataKey="month" stroke="#9ca3af" fontSize={12} /><YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `₹${value/1000}k`} /><Tooltip content={<CustomTooltip />} /><Bar dataKey="Investment Amount" fill="#8b5cf6" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                  </ChartContainer>
                  <ChartContainer title="Average Unit Cost vs. NAV">
                    <ResponsiveContainer width="100%" height={300}><LineChart data={chartData.avgCostVsNav} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" /><XAxis dataKey="date" stroke="#9ca3af" fontSize={12} /><YAxis stroke="#9ca3af" fontSize={12} domain={['dataMin - 1', 'dataMax + 1']} tickFormatter={(value) => `₹${value.toFixed(1)}`} /><Tooltip content={<CustomTooltip />} /><Legend iconSize={10}/><Line type="monotone" dataKey="Average Cost" stroke="#f59e0b" strokeWidth={2} dot={false} /><Line type="monotone" dataKey="NAV" stroke="#22c55e" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
                  </ChartContainer>
                  <ChartContainer title="Yearly Investment">
                    <ResponsiveContainer width="100%" height={300}><BarChart data={chartData.yearlyInvestment} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" /><XAxis dataKey="year" stroke="#9ca3af" fontSize={12} /><YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(value) => `₹${value/1000}k`} /><Tooltip content={<CustomTooltip />} /><Legend iconSize={10}/><Bar dataKey="Investment Amount" fill="#8b5cf6" /></BarChart></ResponsiveContainer>
                  </ChartContainer>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[60vh] bg-white/5 backdrop-blur-md border-2 border-dashed border-gray-700 rounded-2xl text-center p-8"><div className="w-20 h-20 bg-violet-500/10 rounded-full flex items-center justify-center mb-4 border border-violet-500/20"><Target className="w-10 h-10 text-violet-400" /></div><h2 className="text-2xl font-semibold text-white">Your Dashboard Awaits</h2><p className="text-gray-400 mt-2 max-w-md">Upload your investment CSV using the panel on the left to begin your analysis.</p></div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}