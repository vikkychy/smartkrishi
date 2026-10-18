import {
  AlertCircle, ArrowDownRight, ArrowUpRight, CalendarDays, ChartNoAxesCombined,
  CircleDollarSign, Leaf, Plus, Sprout, Trash2, Wheat,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer,
  ReferenceLine, Tooltip, XAxis, YAxis,
} from "recharts";
import api from "../lib/api.js";
import { formatNpr } from "../lib/formatCurrency.js";

const today = new Date().toISOString().slice(0, 10);
const emptyForm = {
  cropName: "", variety: "", plantingDate: "", harvestDate: "",
  expectedYieldKg: "", initialExpense: "0", expenseCategory: "seeds",
};
const expenseCategories = ["seeds", "fertilizer", "labor", "irrigation", "other"];
const chartColors = ["#176b45", "#83a98b", "#e5a84b", "#91a3b0", "#c7d8bb"];
const dateFormat = new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" });

function displayDate(date) {
  return date ? dateFormat.format(new Date(date)) : "Not set";
}

function getProgress(harvest) {
  if (harvest.status === "harvested") return 100;
  const start = new Date(harvest.plantingDate).getTime();
  const end = new Date(harvest.harvestDate).getTime();
  const now = Date.now();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return harvest.status === "growing" ? 55 : 8;
  const dateProgress = Math.round(Math.max(0, Math.min(1, (now - start) / (end - start))) * 100);
  return harvest.status === "growing" ? Math.max(35, Math.min(89, dateProgress)) : Math.min(34, dateProgress);
}

function getDaysUntil(date) {
  return Math.ceil((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / 86400000);
}

function LoadingCard() {
  return <div className="harvest-skeleton" aria-label="Loading crop data"><span /><span /><span /></div>;
}

export default function HarvestManager() {
  const [harvests, setHarvests] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [expenseForms, setExpenseForms] = useState({});
  const [saleForms, setSaleForms] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const loadHarvests = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/harvests");
      setHarvests(data.harvests);
    } catch (requestError) {
      setError(requestError.response?.data?.message || (
        requestError.response
          ? "We couldn't load your crop schedule."
          : "Can't reach the Smart Krishi API. Check that the backend is running and that your frontend origin is allowed."
      ));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadHarvests(); }, [loadHarvests]);

  const analytics = useMemo(() => {
    const expenses = harvests.reduce((total, item) => total + (Number(item.expenses) || 0), 0);
    const revenue = harvests.reduce((total, item) => total + (Number(item.revenue) || 0), 0);
    const expectedYield = harvests.reduce((total, item) => total + (Number(item.expectedYieldKg) || 0), 0);
    const realizedYield = harvests.reduce((total, item) => total + (Number(item.actualYieldKg) || 0), 0);
    const categoryTotals = new Map();
    harvests.forEach((item) => (item.expenseLedger || []).forEach((entry) => {
      categoryTotals.set(entry.category, (categoryTotals.get(entry.category) || 0) + entry.amount);
    }));
    if (!categoryTotals.size && expenses) categoryTotals.set("Uncategorized", expenses);
    return {
      expenses, revenue, profit: revenue - expenses, expectedYield, realizedYield,
      expenseBreakdown: [...categoryTotals].map(([name, value]) => ({ name, value })),
      cropComparison: harvests.slice(0, 6).map((item) => ({
        name: item.cropName.length > 10 ? `${item.cropName.slice(0, 9)}…` : item.cropName,
        expected: item.expectedYieldKg || 0,
        actual: item.actualYieldKg || 0,
        net: (Number(item.revenue) || 0) - (Number(item.expenses) || 0),
      })),
    };
  }, [harvests]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setNotice("");
    const initialExpense = Number(form.initialExpense);
    const payload = {
      cropName: form.cropName.trim(),
      variety: form.variety.trim(),
      plantingDate: form.plantingDate,
      harvestDate: form.harvestDate,
      expectedYieldKg: Number(form.expectedYieldKg) || 0,
      expenses: initialExpense,
      expenseLedger: initialExpense > 0
        ? [{ category: form.expenseCategory, amount: initialExpense, date: form.plantingDate, note: "Initial crop setup" }]
        : [],
    };
    try {
      const { data } = await api.post("/harvests", payload);
      setHarvests((current) => [...current, data.harvest].sort((a, b) => new Date(a.harvestDate) - new Date(b.harvestDate)));
      setForm(emptyForm);
      setNotice("Crop plan saved. Your yield forecast is ready.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't save this crop schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  const updateHarvest = async (harvest, updates) => {
    setError("");
    setNotice("");
    try {
      const { data } = await api.put(`/harvests/${harvest._id}`, updates);
      setHarvests((current) => current.map((item) => item._id === data.harvest._id ? data.harvest : item));
      setNotice("Crop record updated.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't update this crop record.");
    }
  };

  const addExpense = async (event, harvest) => {
    event.preventDefault();
    const value = expenseForms[harvest._id] || { category: "labor", amount: "", note: "" };
    try {
      const { data } = await api.post(`/harvests/${harvest._id}/expenses`, {
        category: value.category, amount: Number(value.amount), note: value.note,
      });
      setHarvests((current) => current.map((item) => item._id === data.harvest._id ? data.harvest : item));
      setExpenseForms((current) => ({ ...current, [harvest._id]: { category: "labor", amount: "", note: "" } }));
      setNotice("Expense added to the crop ledger.");
      setError("");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't add this expense.");
    }
  };

  const recordSale = async (event, harvest) => {
    event.preventDefault();
    const sale = saleForms[harvest._id] || {};
    await updateHarvest(harvest, {
      status: "harvested",
      actualYieldKg: Number(sale.actualYieldKg) || 0,
      revenue: Number(sale.revenue) || 0,
    });
  };

  const removeHarvest = async (harvest) => {
    if (!window.confirm(`Remove the ${harvest.cropName} crop record and its ledger?`)) return;
    setError("");
    try {
      await api.delete(`/harvests/${harvest._id}`);
      setHarvests((current) => current.filter((item) => item._id !== harvest._id));
      setNotice("Crop record removed.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "We couldn't remove this crop record.");
    }
  };

  return (
    <main className="workspace-page harvest-dashboard">
      <header className="workspace-heading">
        <div className="eyebrow"><span className="eyebrow-dot" /> FARM PERFORMANCE · LIVE OVERVIEW</div>
        <h1>Harvest <span>manager.</span></h1>
        <p>Plan each crop, watch the season progress, and turn field records into better decisions.</p>
      </header>

      {error && <div className="notice notice-error" role="alert"><AlertCircle size={16} />{error}</div>}
      {notice && <div className="notice notice-success" role="status">{notice}</div>}

      <section className="harvest-metrics" aria-label="Farm performance summary">
        <article className="harvest-metric rounded-2xl border border-emerald-100 shadow-glass transition"><span className="metric-icon"><Leaf size={18} /></span><small>Active crops</small><strong>{harvests.filter((item) => item.status !== "harvested").length}</strong><span>of {harvests.length} crop records</span></article>
        <article className="harvest-metric rounded-2xl border border-emerald-100 shadow-glass transition"><span className="metric-icon"><Wheat size={18} /></span><small>Forecast yield</small><strong>{analytics.expectedYield.toLocaleString()} <em>kg</em></strong><span>{analytics.realizedYield.toLocaleString()} kg harvested</span></article>
        <article className="harvest-metric rounded-2xl border border-emerald-100 shadow-glass transition"><span className="metric-icon"><CircleDollarSign size={18} /></span><small>Recorded expenses</small><strong>{formatNpr(analytics.expenses)}</strong><span>Across your crop ledger</span></article>
        <article className={`harvest-metric rounded-2xl border border-emerald-100 shadow-glass transition ${analytics.profit >= 0 ? "is-positive" : "is-negative"}`}><span className="metric-icon">{analytics.profit >= 0 ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}</span><small>Profit / loss</small><strong>{formatNpr(analytics.profit)}</strong><span>{analytics.revenue ? "Revenue less recorded costs" : "Add a sale to calculate returns"}</span></article>
      </section>

      <section className="harvest-analytics" aria-label="Harvest analytics">
        <article className="workspace-card chart-card rounded-2xl bg-white/80 shadow-glass backdrop-blur-sm">
          <div className="analytics-heading"><div><span className="eyebrow">YIELD TRACKER</span><h2>Forecast vs. actual</h2></div><span className="chart-caption">Yield · kg</span></div>
          {loading ? <LoadingCard /> : analytics.cropComparison.length ? <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.cropComparison} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#edf0e8" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#7e897c", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#7e897c", fontSize: 10 }} />
                <Tooltip cursor={{ fill: "#f1f5ef" }} formatter={(value) => [`${value} kg`]} />
                <Bar dataKey="expected" name="Expected" fill="#98b49a" radius={[5, 5, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#176b45" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div> : <div className="chart-empty"><ChartNoAxesCombined size={24} /><span>Add crops to start your yield forecast.</span></div>}
        </article>
        <article className="workspace-card chart-card expense-chart-card rounded-2xl bg-white/80 shadow-glass backdrop-blur-sm">
          <div className="analytics-heading"><div><span className="eyebrow">COST CONTROL</span><h2>Expense breakdown</h2></div><span className="chart-caption">{formatNpr(analytics.expenses)}</span></div>
          {loading ? <LoadingCard /> : analytics.expenseBreakdown.length ? <>
            <div className="expense-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart><Pie data={analytics.expenseBreakdown} dataKey="value" nameKey="name" innerRadius={52} outerRadius={76} paddingAngle={3} stroke="none">
                  {analytics.expenseBreakdown.map((entry, index) => <Cell key={entry.name} fill={chartColors[index % chartColors.length]} />)}
                </Pie><Tooltip formatter={(value) => [formatNpr(value)]} /></PieChart>
              </ResponsiveContainer>
              <div className="expense-total"><strong>{analytics.expenseBreakdown.length}</strong><span>categories</span></div>
            </div>
            <div className="expense-legend">{analytics.expenseBreakdown.map((item, index) => <span key={item.name}><i style={{ background: chartColors[index % chartColors.length] }} />{item.name}<b>{formatNpr(item.value)}</b></span>)}</div>
          </> : <div className="chart-empty"><CircleDollarSign size={24} /><span>Expenses will appear as you add ledger entries.</span></div>}
        </article>
        <article className="workspace-card chart-card profit-chart-card rounded-2xl bg-white/80 shadow-glass backdrop-blur-sm">
          <div className="analytics-heading"><div><span className="eyebrow">FIELD PROFITABILITY</span><h2>Net profit &amp; loss by crop</h2></div><span className="chart-caption">Revenue less costs · Rs</span></div>
          {loading ? <LoadingCard /> : analytics.cropComparison.length ? <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.cropComparison} margin={{ top: 10, right: 8, left: 4, bottom: 0 }}>
                <CartesianGrid stroke="#edf0e8" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#7e897c", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#7e897c", fontSize: 10 }} tickFormatter={(value) => `${Math.round(value / 1000)}k`} />
                <ReferenceLine y={0} stroke="#b8c4b8" />
                <Tooltip formatter={(value) => [formatNpr(value), "Net return"]} />
                <Bar dataKey="net" name="Net return" radius={[5, 5, 0, 0]}>
                  {analytics.cropComparison.map((entry) => <Cell key={entry.name} fill={entry.net >= 0 ? "#176b45" : "#c46b55"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div> : <div className="chart-empty"><CircleDollarSign size={24} /><span>Record expenses and crop sales to see profitability.</span></div>}
        </article>
      </section>

      <section className="harvest-workspace">
        <section className="workspace-card harvest-create-card">
          <div className="workspace-card-heading"><span className="workspace-icon"><Sprout size={19} /></span><div><h2>Plan a new crop</h2><p>Add a crop to generate its yield forecast.</p></div></div>
          <form className="workspace-form harvest-form" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="crop-name">Crop name</label>
            <input className="workspace-input" id="crop-name" value={form.cropName} onChange={(event) => setForm({ ...form, cropName: event.target.value })} maxLength={120} required placeholder="e.g. Spinach" />
            <label className="field-label" htmlFor="crop-variety">Variety <span className="optional">(optional)</span></label>
            <input className="workspace-input" id="crop-variety" value={form.variety} onChange={(event) => setForm({ ...form, variety: event.target.value })} maxLength={120} placeholder="e.g. All Green" />
            <div className="workspace-fields-row">
              <div><label className="field-label" htmlFor="planting-date">Planting date</label><input className="workspace-input" id="planting-date" type="date" value={form.plantingDate} onChange={(event) => setForm({ ...form, plantingDate: event.target.value })} max={form.harvestDate || undefined} required /></div>
              <div><label className="field-label" htmlFor="harvest-date">Expected harvest</label><input className="workspace-input" id="harvest-date" type="date" value={form.harvestDate} onChange={(event) => setForm({ ...form, harvestDate: event.target.value })} min={form.plantingDate || today} required /></div>
            </div>
            <div className="workspace-fields-row">
              <div><label className="field-label" htmlFor="expected-yield">Expected yield (kg)</label><input className="workspace-input" id="expected-yield" type="number" min="0" step="0.1" value={form.expectedYieldKg} onChange={(event) => setForm({ ...form, expectedYieldKg: event.target.value })} placeholder="0" /></div>
              <div><label className="field-label" htmlFor="initial-expense">Initial expense (Rs)</label><input className="workspace-input" id="initial-expense" type="number" min="0" step="0.01" value={form.initialExpense} onChange={(event) => setForm({ ...form, initialExpense: event.target.value })} /></div>
            </div>
            {Number(form.initialExpense) > 0 && <><label className="field-label" htmlFor="expense-category">Expense category</label><select id="expense-category" className="workspace-input" value={form.expenseCategory} onChange={(event) => setForm({ ...form, expenseCategory: event.target.value })}>{expenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select></>}
            <button className="button button-dark workspace-submit" type="submit" disabled={submitting}>{submitting ? "Saving crop..." : "Create crop plan"} <Plus size={16} /></button>
          </form>
        </section>

        <section className="workspace-card harvest-crops-card">
          <div className="workspace-card-heading"><span className="workspace-icon"><CalendarDays size={19} /></span><div><h2>Crop lifecycle</h2><p>Track stage progress and upcoming harvest dates.</p></div></div>
          {loading ? <div className="harvest-list"><LoadingCard /><LoadingCard /></div> : harvests.length ? <div className="harvest-list harvest-list-enhanced">
            {harvests.map((harvest) => {
              const progress = getProgress(harvest);
              const isHarvested = harvest.status === "harvested";
              const days = getDaysUntil(harvest.harvestDate);
              const expenseForm = expenseForms[harvest._id] || { category: "labor", amount: "", note: "" };
              const saleForm = saleForms[harvest._id] || { actualYieldKg: harvest.actualYieldKg || "", revenue: harvest.revenue || "" };
              return <article className="harvest-item harvest-item-advanced" key={harvest._id}>
                <div className="harvest-item-top">
                  <div><h3>{harvest.cropName}{harvest.variety && <span className="crop-variety">{harvest.variety}</span>}</h3><span className={`harvest-status status-${harvest.status}`}>{harvest.status}</span></div>
                  <button className="icon-button listing-delete" type="button" onClick={() => removeHarvest(harvest)} aria-label={`Remove ${harvest.cropName} crop record`} title="Remove crop record"><Trash2 size={17} /></button>
                </div>
                <div className="crop-forecast"><div><span>Yield forecast</span><strong>{Number(harvest.expectedYieldKg || 0).toLocaleString()} kg</strong></div><div><span>{isHarvested ? "Harvested" : days < 0 ? "Past forecast date" : "Expected harvest"}</span><strong>{isHarvested ? `${Number(harvest.actualYieldKg || 0).toLocaleString()} kg` : days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? "Today" : `In ${days} days`}</strong></div></div>
                <div className="lifecycle-progress" aria-label={`Crop lifecycle ${progress}% complete`}>
                  <div className="lifecycle-track"><span style={{ width: `${progress}%` }} /></div>
                  <div className="lifecycle-stages"><span className={progress >= 0 ? "stage-active" : ""}>Planting</span><span className={progress >= 35 ? "stage-active" : ""}>Growing</span><span className={progress >= 90 ? "stage-active" : ""}>Harvesting</span></div>
                </div>
                <div className="harvest-details"><span><small>Planted</small>{displayDate(harvest.plantingDate)}</span><span><small>Expected harvest</small>{displayDate(harvest.harvestDate)}</span><span><small>Expenses</small>{formatNpr(harvest.expenses)}</span></div>
                {!isHarvested && <label className="harvest-status-control" htmlFor={`status-${harvest._id}`}>Crop stage
                  <select id={`status-${harvest._id}`} className="workspace-input" value={harvest.status} onChange={(event) => updateHarvest(harvest, { status: event.target.value })}>
                    <option value="planned">Planting</option><option value="growing">Growing</option><option value="harvested">Harvested</option>
                  </select>
                </label>}
                {isHarvested && <div className="realized-return"><span>Realized return</span><strong className={harvest.revenue - harvest.expenses >= 0 ? "return-positive" : "return-negative"}>{formatNpr((harvest.revenue || 0) - (harvest.expenses || 0))}</strong></div>}
                <details className="crop-action-details">
                  <summary>{isHarvested ? "Update sale details" : "Add expense or record sale"}</summary>
                  <form className="ledger-add-form" onSubmit={(event) => addExpense(event, harvest)}>
                    <strong>Expense ledger</strong>
                    {harvest.expenseLedger?.length > 0 && <ul className="ledger-entry-list">{harvest.expenseLedger.slice().reverse().map((entry) => <li key={entry._id || `${entry.category}-${entry.date}-${entry.amount}`}><span><b>{entry.category}</b><small>{entry.note || displayDate(entry.date)}</small></span><strong>{formatNpr(entry.amount)}</strong></li>)}</ul>}
                    <div className="ledger-fields">
                      <select className="workspace-input" aria-label="Expense category" value={expenseForm.category} onChange={(event) => setExpenseForms((current) => ({ ...current, [harvest._id]: { ...expenseForm, category: event.target.value } }))}>{expenseCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
                      <input className="workspace-input" aria-label="Expense amount" type="number" min="0" step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForms((current) => ({ ...current, [harvest._id]: { ...expenseForm, amount: event.target.value } }))} placeholder="Amount Rs" required />
                      <input className="workspace-input ledger-note" aria-label="Expense note" value={expenseForm.note} onChange={(event) => setExpenseForms((current) => ({ ...current, [harvest._id]: { ...expenseForm, note: event.target.value } }))} maxLength={240} placeholder="Note" />
                      <button className="button button-dark button-small" type="submit" aria-label="Add expense"><Plus size={15} /></button>
                    </div>
                  </form>
                  <form className="sale-record-form" onSubmit={(event) => recordSale(event, harvest)}>
                    <strong>{isHarvested ? "Sale details" : "Record harvest sale"}</strong>
                    <div className="ledger-fields">
                      <input className="workspace-input" type="number" min="0" step="0.1" aria-label="Actual yield in kilograms" value={saleForm.actualYieldKg} onChange={(event) => setSaleForms((current) => ({ ...current, [harvest._id]: { ...saleForm, actualYieldKg: event.target.value } }))} placeholder="Actual kg" required />
                      <input className="workspace-input" type="number" min="0" step="0.01" aria-label="Sale revenue in rupees" value={saleForm.revenue} onChange={(event) => setSaleForms((current) => ({ ...current, [harvest._id]: { ...saleForm, revenue: event.target.value } }))} placeholder="Revenue Rs" required />
                      <button className="button button-dark button-small" type="submit">{isHarvested ? "Update" : "Record sale"}</button>
                    </div>
                  </form>
                </details>
              </article>;
            })}
          </div> : error ? null : <div className="workspace-empty"><span className="empty-icon"><Sprout size={23} /></span><strong>No crops in your plan</strong><span>Add a crop to see its lifecycle and estimated yield.</span></div>}
        </section>
      </section>
    </main>
  );
}
