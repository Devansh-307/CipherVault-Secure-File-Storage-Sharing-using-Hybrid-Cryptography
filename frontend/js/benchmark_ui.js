// Cryptographic Performance Benchmarking UI and Chart.js integration

class BenchmarkManager {
  static benchmarkChart = null;

  static init() {
    this.setupEventListeners();
  }

  static setupEventListeners() {
    const runBtn = document.getElementById('run-benchmark-btn');
    if (runBtn) {
      runBtn.addEventListener('click', () => this.executeBenchmark());
    }
  }

  static async executeBenchmark() {
    const sizeSelect = document.getElementById('benchmark-size-select');
    const sizeKb = parseInt(sizeSelect.value, 10);
    const runBtn = document.getElementById('run-benchmark-btn');
    const resultsContainer = document.getElementById('benchmark-results-container');

    runBtn.disabled = true;
    runBtn.innerHTML = `<i data-lucide="loader-2" class="w-4 h-4 animate-spin inline mr-2"></i> Benchmarking AES-GCM, RSA-2048 & Hybrid...`;
    if (window.lucide) lucide.createIcons();

    try {
      const data = await ApiClient.runBenchmark(sizeKb);
      resultsContainer.classList.remove('hidden');

      // Populate metrics cards
      const res = data.results;
      document.getElementById('bm-payload-size').textContent = data.payload_size_formatted;
      document.getElementById('bm-aes-time').textContent = `${res.pure_aes_256.total_time_ms} ms`;
      document.getElementById('bm-hybrid-time').textContent = `${res.proposed_hybrid.total_time_ms} ms`;
      document.getElementById('bm-rsa-time').textContent = `${res.pure_rsa_2048.total_time_ms} ms`;

      document.getElementById('bm-hybrid-speedup').textContent = data.analysis.hybrid_speedup_vs_rsa;
      document.getElementById('bm-hybrid-overhead').textContent = data.analysis.hybrid_overhead_vs_pure_aes_ms;

      // Populate comparison table
      document.getElementById('table-aes-enc').textContent = `${res.pure_aes_256.encryption_time_ms} ms`;
      document.getElementById('table-aes-dec').textContent = `${res.pure_aes_256.decryption_time_ms} ms`;
      document.getElementById('table-aes-total').textContent = `${res.pure_aes_256.total_time_ms} ms`;

      document.getElementById('table-rsa-enc').textContent = `${res.pure_rsa_2048.encryption_time_ms} ms`;
      document.getElementById('table-rsa-dec').textContent = `${res.pure_rsa_2048.decryption_time_ms} ms`;
      document.getElementById('table-rsa-total').textContent = `${res.pure_rsa_2048.total_time_ms} ms`;

      document.getElementById('table-hybrid-enc').textContent = `${res.proposed_hybrid.encryption_time_ms} ms`;
      document.getElementById('table-hybrid-dec').textContent = `${res.proposed_hybrid.decryption_time_ms} ms`;
      document.getElementById('table-hybrid-total').textContent = `${res.proposed_hybrid.total_time_ms} ms`;

      // Render or update Chart.js
      this.renderBenchmarkChart(res);

      showToast(`Benchmark completed for ${data.payload_size_formatted}!`, 'success', 'Benchmarking Complete');
      if (window.lucide) lucide.createIcons();
    } catch (err) {
      showToast(err.message, 'error', 'Benchmark Failed');
    } finally {
      runBtn.disabled = false;
      runBtn.innerHTML = `<span>Run Performance Benchmark</span> <i data-lucide="play" class="w-4 h-4 inline ml-1"></i>`;
      if (window.lucide) lucide.createIcons();
    }
  }

  static renderBenchmarkChart(res) {
    const canvas = document.getElementById('benchmark-chart-canvas');
    if (!canvas || !window.Chart) return;

    const ctx = canvas.getContext('2d');

    if (this.benchmarkChart) {
      this.benchmarkChart.destroy();
    }

    this.benchmarkChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Pure AES-256-GCM', 'Proposed Hybrid Scheme', 'Pure RSA-2048 (Chunked)'],
        datasets: [
          {
            label: 'Encryption Time (ms)',
            data: [
              res.pure_aes_256.encryption_time_ms,
              res.proposed_hybrid.encryption_time_ms,
              res.pure_rsa_2048.encryption_time_ms,
            ],
            backgroundColor: 'rgba(56, 189, 248, 0.75)',
            borderColor: '#38bdf8',
            borderWidth: 1,
            borderRadius: 6,
          },
          {
            label: 'Decryption Time (ms)',
            data: [
              res.pure_aes_256.decryption_time_ms,
              res.proposed_hybrid.decryption_time_ms,
              res.pure_rsa_2048.decryption_time_ms,
            ],
            backgroundColor: 'rgba(168, 85, 247, 0.75)',
            borderColor: '#a855f7',
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
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
      },
    });
  }
}

window.BenchmarkManager = BenchmarkManager;
document.addEventListener('DOMContentLoaded', () => BenchmarkManager.init());
