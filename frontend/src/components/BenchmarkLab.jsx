import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Play,
  BarChart2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { ApiService } from '../services/api';
import { useToast } from '../context/ToastContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export const BenchmarkLab = () => {
  const [sizeKb, setSizeKb] = useState(1024);
  const [loading, setLoading] = useState(false);
  const [benchmarkData, setBenchmarkData] = useState(null);
  const { showToast } = useToast();

  const handleRunBenchmark = async () => {
    setLoading(true);
    try {
      const data = await ApiService.runBenchmark(sizeKb);
      setBenchmarkData(data);
      showToast(`Benchmark completed for ${data.payload_size_formatted}!`, 'success', 'Benchmarking Complete');
    } catch (err) {
      showToast(err.message, 'error', 'Benchmark Failed');
    } finally {
      setLoading(false);
    }
  };

  // Run initial 1MB benchmark automatically on mount
  useEffect(() => {
    handleRunBenchmark();
  }, []);

  const chartData = benchmarkData
    ? {
        labels: ['Pure AES-256-GCM', 'Proposed Hybrid Scheme', 'Pure RSA-2048 (Chunked)'],
        datasets: [
          {
            label: 'Encryption Time (ms)',
            data: [
              benchmarkData.results.pure_aes_256.encryption_time_ms,
              benchmarkData.results.proposed_hybrid.encryption_time_ms,
              benchmarkData.results.pure_rsa_2048.encryption_time_ms,
            ],
            backgroundColor: 'rgba(56, 189, 248, 0.75)',
            borderColor: '#38bdf8',
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Decryption Time (ms)',
            data: [
              benchmarkData.results.pure_aes_256.decryption_time_ms,
              benchmarkData.results.proposed_hybrid.decryption_time_ms,
              benchmarkData.results.pure_rsa_2048.decryption_time_ms,
            ],
            backgroundColor: 'rgba(168, 85, 247, 0.75)',
            borderColor: '#a855f7',
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      }
    : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#94a3b8', font: { family: 'Inter', size: 12 } },
      },
      tooltip: {
        backgroundColor: '#0f172a',
        titleColor: '#38bdf8',
        bodyColor: '#f8fafc',
        borderColor: 'rgba(56, 189, 248, 0.3)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
      },
      y: {
        ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
        grid: { color: 'rgba(148, 163, 184, 0.08)' },
        title: { display: true, text: 'Execution Time (ms)', color: '#64748b' },
      },
    },
  };

  const res = benchmarkData?.results;

  return (
    <div className="glass-panel p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-400" />
            Cryptographic Performance Benchmarking Suite
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Direct empirical comparison: Pure AES-256 vs Pure RSA-2048 vs Proposed Hybrid Cryptosystem.
          </p>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-slate-300 mb-1">Payload Size</label>
          <select
            value={sizeKb}
            onChange={(e) => setSizeKb(parseInt(e.target.value, 10))}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:border-emerald-400"
          >
            <option value="100">100 KB (Small Document)</option>
            <option value="1024">1 MB (Medium Document / PDF)</option>
            <option value="5120">5 MB (High-Res Image / Archive)</option>
            <option value="10240">10 MB (Large Data Payload)</option>
            <option value="25600">25 MB (Enterprise File Block)</option>
          </select>
        </div>

        <div className="self-end">
          <button
            onClick={handleRunBenchmark}
            disabled={loading}
            className="py-2 px-5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Benchmarking...</span>
              </>
            ) : (
              <>
                <span>Run Performance Benchmark</span>
                <Play className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>

      {benchmarkData && res && (
        <div className="space-y-6 animate-in fade-in">
          {/* 3 KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-sky-500/10 border border-sky-500/30">
              <div className="text-xs text-sky-400 font-semibold">Pure AES-256-GCM</div>
              <div className="text-xl font-bold text-slate-100 mt-1">{res.pure_aes_256.total_time_ms} ms</div>
              <div className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Insecure Key Distribution
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
              <div className="text-xs text-emerald-400 font-semibold">Proposed Hybrid Scheme</div>
              <div className="text-xl font-bold text-slate-100 mt-1">{res.proposed_hybrid.total_time_ms} ms</div>
              <div className="text-[10px] text-emerald-400 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Optimal Speed + Zero-Trust Keys
              </div>
            </div>

            <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/30">
              <div className="text-xs text-purple-400 font-semibold">Pure RSA-2048 (Chunked)</div>
              <div className="text-xl font-bold text-slate-100 mt-1">{res.pure_rsa_2048.total_time_ms} ms</div>
              <div className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> Impractical for Bulk Data
              </div>
            </div>
          </div>

          {/* Chart View */}
          <div className="glass-panel p-4 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-emerald-400" />
              Execution Latency Comparison ({benchmarkData.payload_size_formatted} Payload)
            </h4>
            <div className="h-64 w-full">
              {chartData && <Bar data={chartData} options={chartOptions} />}
            </div>
          </div>

          {/* Detailed Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse border border-slate-800">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-slate-300">
                  <th className="py-2.5 px-4 font-semibold">Cryptographic Scheme</th>
                  <th className="py-2.5 px-4 font-semibold">Encryption Latency</th>
                  <th className="py-2.5 px-4 font-semibold">Decryption Latency</th>
                  <th className="py-2.5 px-4 font-semibold">Total Roundtrip</th>
                  <th className="py-2.5 px-4 font-semibold">Key Exchange Security</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr>
                  <td className="py-3 px-4 font-medium text-sky-400">Pure AES-256</td>
                  <td className="py-3 px-4 mono">{res.pure_aes_256.encryption_time_ms} ms</td>
                  <td className="py-3 px-4 mono">{res.pure_aes_256.decryption_time_ms} ms</td>
                  <td className="py-3 px-4 mono font-bold">{res.pure_aes_256.total_time_ms} ms</td>
                  <td className="py-3 px-4 text-rose-400">Vulnerable (Insecure manual sharing)</td>
                </tr>
                <tr className="bg-emerald-950/20">
                  <td className="py-3 px-4 font-bold text-emerald-400">Proposed Hybrid (AES + RSA)</td>
                  <td className="py-3 px-4 mono text-emerald-300">{res.proposed_hybrid.encryption_time_ms} ms</td>
                  <td className="py-3 px-4 mono text-emerald-300">{res.proposed_hybrid.decryption_time_ms} ms</td>
                  <td className="py-3 px-4 mono font-bold text-emerald-300">{res.proposed_hybrid.total_time_ms} ms</td>
                  <td className="py-3 px-4 text-emerald-400 font-semibold">Optimal (RSA-wrapped session key)</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-purple-400">Pure RSA-2048</td>
                  <td className="py-3 px-4 mono">{res.pure_rsa_2048.encryption_time_ms} ms</td>
                  <td className="py-3 px-4 mono">{res.pure_rsa_2048.decryption_time_ms} ms</td>
                  <td className="py-3 px-4 mono font-bold text-rose-400">{res.pure_rsa_2048.total_time_ms} ms</td>
                  <td className="py-3 px-4 text-slate-400">Secure, but computationally prohibitive</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Speedup and Overhead Insights */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <div>
              <span className="text-emerald-400 font-bold">{benchmarkData.analysis.hybrid_speedup_vs_rsa}</span>{' '}
              speedup over pure RSA while maintaining 100% public key security.
            </div>
            <div className="text-slate-400">
              Hybrid Key Overhead:{' '}
              <span className="mono text-sky-400 font-semibold">{benchmarkData.analysis.hybrid_overhead_vs_pure_aes_ms}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
