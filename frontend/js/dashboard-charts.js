// dashboard-charts.js — Chart.js analytics charts for SmartArch dashboard
// All charts use project data already loaded by dashboard.js (window.projects)

let barChartInst = null;
let doughnutChartInst = null;
let lineChartInst = null;

// Chart.js default overrides to match dark theme
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.07)';
Chart.defaults.font.family = "'Outfit', sans-serif";

// Colour palette matching index.html / dashboard theme
const CHART_COLORS = {
    cyan:   '#00d4c8',
    green:  '#10b981',
    amber:  '#f59e0b',
    purple: '#8b5cf6',
    blue:   '#3b82f6',
    red:    '#ef4444',
};

function buildCharts(projects) {
    buildBarChart(projects);
    buildDoughnutChart(projects);
    buildLineChart(projects);
}

// ── Bar chart: count by status ──────────────────────────────────
function buildBarChart(projects) {
    const statuses = ['draft', 'in_progress', 'review', 'approved', 'archived'];
    const labels   = ['Draft', 'In Progress', 'Review', 'Approved', 'Archived'];
    const counts   = statuses.map(s => projects.filter(p => p.status === s).length);
    const colors   = [
        'rgba(100,116,139,0.7)',
        'rgba(245,158,11,0.7)',
        'rgba(59,130,246,0.7)',
        'rgba(16,185,129,0.7)',
        'rgba(239,68,68,0.7)',
    ];
    const borders  = [
        'rgba(100,116,139,1)',
        'rgba(245,158,11,1)',
        'rgba(59,130,246,1)',
        'rgba(16,185,129,1)',
        'rgba(239,68,68,1)',
    ];

    const ctx = document.getElementById('barChart');
    if (!ctx) return;

    if (barChartInst) { barChartInst.destroy(); barChartInst = null; }

    barChartInst = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Projects',
                data: counts,
                backgroundColor: colors,
                borderColor: borders,
                borderWidth: 1.5,
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0d1424',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    padding: 12,
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} project${ctx.parsed.y !== 1 ? 's' : ''}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 12 } },
                    border: { color: 'rgba(255,255,255,0.07)' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: {
                        color: '#64748b',
                        font: { size: 12 },
                        stepSize: 1,
                        callback: v => (Number.isInteger(v) ? v : '')
                    },
                    border: { color: 'rgba(255,255,255,0.07)' },
                    beginAtZero: true,
                }
            }
        }
    });
}

// ── Doughnut: count by project type ────────────────────────────
function buildDoughnutChart(projects) {
    const typeMap = {};
    projects.forEach(p => {
        const t = p.type || 'residential';
        typeMap[t] = (typeMap[t] || 0) + 1;
    });

    const labels = Object.keys(typeMap).map(k => k.charAt(0).toUpperCase() + k.slice(1));
    const data   = Object.values(typeMap);
    const bgColors = [
        'rgba(0,212,200,0.8)',
        'rgba(139,92,246,0.8)',
        'rgba(245,158,11,0.8)',
        'rgba(59,130,246,0.8)',
        'rgba(16,185,129,0.8)',
    ];

    const ctx = document.getElementById('doughnutChart');
    if (!ctx) return;

    if (doughnutChartInst) { doughnutChartInst.destroy(); doughnutChartInst = null; }

    // If no projects, show placeholder
    const isEmpty = data.length === 0;
    const finalLabels = isEmpty ? ['No Data'] : labels;
    const finalData   = isEmpty ? [1] : data;
    const finalColors = isEmpty ? ['rgba(255,255,255,0.06)'] : bgColors.slice(0, data.length);

    doughnutChartInst = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: finalLabels,
            datasets: [{
                data: finalData,
                backgroundColor: finalColors,
                borderColor: 'transparent',
                borderWidth: 0,
                hoverOffset: 6,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            cutout: '68%',
            plugins: {
                legend: { display: false },
                tooltip: {
                    enabled: !isEmpty,
                    backgroundColor: '#0d1424',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    padding: 12,
                }
            }
        }
    });

    // Build custom legend
    const legend = document.getElementById('doughnutLegend');
    if (legend) {
        legend.innerHTML = '';
        if (!isEmpty) {
            finalLabels.forEach((lbl, i) => {
                legend.innerHTML += `
                    <div class="legend-item">
                        <span class="legend-dot" style="background:${finalColors[i]};"></span>
                        ${lbl} (${finalData[i]})
                    </div>`;
            });
        } else {
            legend.innerHTML = '<div class="legend-item" style="color:var(--slate-2);">No projects yet</div>';
        }
    }
}

// ── Line chart: area per project (last 8) ──────────────────────
function buildLineChart(projects) {
    const recent = [...projects]
        .filter(p => p.metadata?.totalArea > 0)
        .slice(-8);

    const labels = recent.map((p, i) => p.name.length > 12 ? p.name.slice(0, 12) + '…' : p.name);
    const data   = recent.map(p => p.metadata?.totalArea || 0);

    const ctx = document.getElementById('lineChart');
    if (!ctx) return;

    if (lineChartInst) { lineChartInst.destroy(); lineChartInst = null; }

    // Gradient fill
    const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 220);
    gradient.addColorStop(0, 'rgba(0,212,200,0.25)');
    gradient.addColorStop(1, 'rgba(0,212,200,0)');

    lineChartInst = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['No Data'],
            datasets: [{
                label: 'Area (m²)',
                data: data.length ? data : [0],
                borderColor: '#00d4c8',
                backgroundColor: gradient,
                borderWidth: 2.5,
                pointBackgroundColor: '#00d4c8',
                pointBorderColor: '#0d1424',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.35,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#0d1424',
                    borderColor: 'rgba(255,255,255,0.1)',
                    borderWidth: 1,
                    titleColor: '#f1f5f9',
                    bodyColor: '#94a3b8',
                    padding: 12,
                    callbacks: {
                        label: ctx => ` ${ctx.parsed.y} m²`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: '#64748b', font: { size: 11 }, maxRotation: 30 },
                    border: { color: 'rgba(255,255,255,0.07)' }
                },
                y: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#64748b', font: { size: 11 } },
                    border: { color: 'rgba(255,255,255,0.07)' },
                    beginAtZero: true,
                }
            }
        }
    });
}

// Refresh charts with latest project data
function refreshCharts() {
    const projects = window.projects || [];
    buildCharts(projects);
}

window.buildCharts    = buildCharts;
window.refreshCharts  = refreshCharts;