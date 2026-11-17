/**
 * Standalone Interactive Visual Dashboard Generator
 * Implements the 21-section Dark Fintech Intelligence Platform Dashboard.
 * Theme: Background #090A07, Cards #151515, Accent #B8FF63, Zero emojis, Lucide line icons.
 */

import { aggregateComparison } from './aggregators/comparison-aggregator.js';
import { aggregateEcosystemMap } from './aggregators/ecosystem-aggregator.js';
import { aggregatePortfolioLeaderboard } from './aggregators/portfolio-aggregator.js';

/**
 * Generate full standalone HTML dashboard for all analyzed repositories
 * @param {Array<Object>} results - Array of normalized repository analysis records
 * @returns {string} Standalone HTML document string
 */
export function generateCombinedDashboard(results = []) {
    if (!results || results.length === 0) {
        return generateEmptyDashboard();
    }

    // Compute multi-repo aggregations
    const comparisonData = aggregateComparison(results);
    const ecosystemData = aggregateEcosystemMap(results);
    const portfolioData = aggregatePortfolioLeaderboard(results);

    // Primary repository for single view (or initial view)
    const primary = results[0];

    // Serialized data payload for client-side interactivity
    const serializedPayload = JSON.stringify({
        repositories: results,
        comparison: comparisonData,
        ecosystem: ecosystemData,
        portfolio: portfolioData,
    }).replace(/</g, '\\u003c');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Repository Intelligence Platform</title>
    <!-- Inter & JetBrains Mono Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <!-- Chart.js for interactive analytics -->
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
    <style>
        :root {
            --bg-base: #090A07;
            --bg-card: #151515;
            --bg-card-hover: #1c1c1c;
            --bg-elevated: #222222;
            --border-subtle: #262626;
            --border-accent: rgba(184, 255, 99, 0.25);
            --accent: #B8FF63;
            --accent-glow: rgba(184, 255, 99, 0.15);
            --accent-dark: #8ec944;
            --text-main: #FFFFFF;
            --text-muted: #A3A3A3;
            --text-dim: #666666;
            --success: #10B981;
            --warning: #F59E0B;
            --danger: #EF4444;
            --info: #3B82F6;
            --purple: #8B5CF6;
            --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: var(--font-sans);
            background-color: var(--bg-base);
            color: var(--text-main);
            line-height: 1.5;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            overflow-x: hidden;
        }

        /* Top Bar */
        .topbar {
            height: 64px;
            background: #0d0d0d;
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 24px;
            position: sticky;
            top: 0;
            z-index: 50;
        }

        .brand {
            display: flex;
            align-items: center;
            gap: 12px;
            font-weight: 700;
            font-size: 16px;
            letter-spacing: -0.02em;
        }

        .brand-badge {
            background: var(--accent);
            color: #000000;
            font-size: 11px;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 4px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .topbar-actions {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .repo-select {
            background: var(--bg-card);
            color: var(--text-main);
            border: 1px solid var(--border-subtle);
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 13px;
            font-family: var(--font-mono);
            outline: none;
            cursor: pointer;
        }

        .repo-select:focus {
            border-color: var(--accent);
        }

        .btn {
            background: var(--bg-card);
            color: var(--text-main);
            border: 1px solid var(--border-subtle);
            padding: 8px 14px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: all 0.15s ease;
            text-decoration: none;
        }

        .btn:hover {
            background: var(--bg-card-hover);
            border-color: var(--text-muted);
        }

        .btn-accent {
            background: var(--accent);
            color: #000000;
            border-color: var(--accent);
        }

        .btn-accent:hover {
            background: var(--accent-dark);
            border-color: var(--accent-dark);
        }

        /* Layout Container */
        .layout-container {
            display: flex;
            flex: 1;
            min-height: calc(100vh - 64px);
        }

        /* Navigation Sidebar */
        .sidebar {
            width: 260px;
            background: #0d0e0b;
            border-right: 1px solid var(--border-subtle);
            padding: 16px 8px;
            display: flex;
            flex-direction: column;
            gap: 2px;
            position: sticky;
            top: 64px;
            height: calc(100vh - 64px);
            overflow-y: auto;
        }

        .nav-header {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-dim);
            padding: 10px 12px 4px;
            font-weight: 700;
        }

        .nav-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 12px;
            border-radius: 6px;
            color: var(--text-muted);
            text-decoration: none;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.12s ease;
            border: 1px solid transparent;
        }

        .nav-item:hover {
            background: var(--bg-card);
            color: var(--text-main);
        }

        .nav-item.active {
            background: rgba(184, 255, 99, 0.08);
            color: var(--accent);
            border-color: var(--border-accent);
            font-weight: 600;
        }

        .nav-item svg {
            width: 16px;
            height: 16px;
            stroke-width: 2;
            flex-shrink: 0;
        }

        /* Content Area */
        .main-content {
            flex: 1;
            padding: 32px;
            max-width: 1400px;
            margin: 0 auto;
            width: 100%;
        }

        .dashboard-section {
            display: none;
        }

        .dashboard-section.active {
            display: block;
            animation: fadeIn 0.2s ease-in-out;
        }

        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(4px); }
            to { opacity: 1; transform: translateY(0); }
        }

        /* Section Headers */
        .section-header {
            margin-bottom: 24px;
            border-bottom: 1px solid var(--border-subtle);
            padding-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }

        .section-title {
            font-size: 22px;
            font-weight: 700;
            letter-spacing: -0.02em;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .section-subtitle {
            font-size: 13px;
            color: var(--text-muted);
            margin-top: 4px;
        }

        /* Cards and Grids */
        .grid-2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
        .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

        @media (max-width: 1024px) {
            .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
            .sidebar { width: 220px; }
        }

        @media (max-width: 768px) {
            .layout-container { flex-direction: column; }
            .sidebar { width: 100%; height: auto; position: static; }
        }

        .card {
            background: var(--bg-card);
            border: 1px solid var(--border-subtle);
            border-radius: 8px;
            padding: 20px;
            transition: border-color 0.15s ease;
        }

        .card:hover {
            border-color: rgba(255, 255, 255, 0.15);
        }

        .card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }

        .card-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.04em;
        }

        .card-value {
            font-size: 32px;
            font-weight: 800;
            font-family: var(--font-mono);
            letter-spacing: -0.03em;
        }

        .card-meta {
            font-size: 12px;
            color: var(--text-dim);
            margin-top: 6px;
        }

        /* Score Display */
        .score-circle-container {
            display: flex;
            align-items: center;
            gap: 24px;
        }

        .score-ring {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: conic-gradient(var(--accent) calc(var(--score-pct) * 1%), #222 0);
            display: flex;
            align-items: center;
            justify-content: center;
            position: relative;
        }

        .score-ring-inner {
            width: 96px;
            height: 96px;
            border-radius: 50%;
            background: var(--bg-card);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }

        .score-ring-val {
            font-size: 32px;
            font-weight: 800;
            font-family: var(--font-mono);
            color: var(--accent);
            line-height: 1;
        }

        .score-ring-grade {
            font-size: 13px;
            font-weight: 700;
            color: var(--text-muted);
            margin-top: 4px;
        }

        /* Pillar Bars */
        .pillar-row {
            margin-bottom: 14px;
        }

        .pillar-label {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 6px;
        }

        .progress-bar-bg {
            height: 8px;
            background: #222;
            border-radius: 4px;
            overflow: hidden;
        }

        .progress-bar-fill {
            height: 100%;
            background: var(--accent);
            border-radius: 4px;
            transition: width 0.5s ease;
        }

        /* Tables */
        .table-responsive {
            overflow-x: auto;
            margin-top: 12px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 13px;
            text-align: left;
        }

        th {
            background: #111;
            padding: 10px 14px;
            color: var(--text-dim);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.05em;
            border-bottom: 1px solid var(--border-subtle);
        }

        td {
            padding: 12px 14px;
            border-bottom: 1px solid #1a1a1a;
            color: var(--text-main);
        }

        tr:hover td {
            background: #191919;
        }

        .tag {
            display: inline-block;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            font-family: var(--font-mono);
            background: #222;
            color: var(--text-muted);
        }

        .tag-success { background: rgba(16, 185, 129, 0.15); color: var(--success); }
        .tag-warning { background: rgba(245, 158, 11, 0.15); color: var(--warning); }
        .tag-danger { background: rgba(239, 68, 68, 0.15); color: var(--danger); }
        .tag-accent { background: rgba(184, 255, 99, 0.15); color: var(--accent); }

        /* Tech Logo Card */
        .tech-card {
            background: #111;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 14px;
            display: flex;
            align-items: center;
            gap: 12px;
            transition: transform 0.1s ease, border-color 0.1s ease;
        }

        .tech-card:hover {
            border-color: var(--accent);
            transform: translateY(-2px);
        }

        .tech-icon {
            width: 28px;
            height: 28px;
            object-fit: contain;
            filter: invert(1);
        }

        /* Heatmap Grid */
        .heatmap-container {
            display: flex;
            gap: 3px;
            overflow-x: auto;
            padding: 16px 0;
        }

        .heatmap-col {
            display: flex;
            flex-direction: column;
            gap: 3px;
        }

        .heatmap-cell {
            width: 12px;
            height: 12px;
            border-radius: 2px;
            background: #1a1a1a;
        }

        .heatmap-cell.level-1 { background: #1e3810; }
        .heatmap-cell.level-2 { background: #3b701d; }
        .heatmap-cell.level-3 { background: #6db32c; }
        .heatmap-cell.level-4 { background: #B8FF63; }

        /* Code Block */
        pre {
            background: #0a0a0a;
            border: 1px solid var(--border-subtle);
            border-radius: 6px;
            padding: 16px;
            font-family: var(--font-mono);
            font-size: 12px;
            color: #d4d4d4;
            overflow-x: auto;
            max-height: 400px;
        }

        /* Disclaimer Banner */
        .disclaimer-banner {
            background: #111;
            border-left: 3px solid var(--accent);
            padding: 12px 16px;
            border-radius: 4px;
            font-size: 12px;
            color: var(--text-muted);
            margin-top: 20px;
        }
    </style>
</head>
<body>

    <!-- Topbar -->
    <header class="topbar">
        <div class="brand">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#B8FF63" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
                <path d="M9 18c-4.51 2-5-2-7-2"></path>
            </svg>
            <span>GitHub Repository Intelligence</span>
            <span class="brand-badge">Enterprise v2.0</span>
        </div>

        <div class="topbar-actions">
            <select id="repoSelect" class="repo-select" onchange="switchRepository(this.value)">
                ${results.map((r, i) => `<option value="${i}">${r.repo_name}</option>`).join('')}
            </select>
            <button class="btn" onclick="exportFullJson()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                Export JSON
            </button>
            <button class="btn btn-accent" onclick="downloadCycloneDxSbom()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                SBOM (CycloneDX)
            </button>
        </div>
    </header>

    <!-- Layout Container -->
    <div class="layout-container">
        <!-- Sidebar Navigation (21 Sections) -->
        <nav class="sidebar">
            <div class="nav-header">Core Diagnostics</div>
            <a class="nav-item active" onclick="showSection('sec-overview')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>
                1. Overview
            </a>
            <a class="nav-item" onclick="showSection('sec-architecture')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="8" height="8" x="3" y="3" rx="2"></rect><path d="M7 11v4a2 2 0 0 0 2 2h4"></path><rect width="8" height="8" x="13" y="13" rx="2"></rect></svg>
                2. Architecture
            </a>
            <a class="nav-item" onclick="showSection('sec-dataflow')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                3. Data Flow
            </a>
            <a class="nav-item" onclick="showSection('sec-techstack')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                4. Technology Stack
            </a>
            <a class="nav-item" onclick="showSection('sec-codebase')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path></svg>
                5. Codebase Explorer
            </a>

            <div class="nav-header">Analytics & Code</div>
            <a class="nav-item" onclick="showSection('sec-languages')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><path d="m4.93 4.93 4.24 4.24"></path><path d="m14.83 9.17 4.24-4.24"></path><path d="m14.83 14.83 4.24 4.24"></path><path d="m9.17 14.83-4.24 4.24"></path></svg>
                6. Languages
            </a>
            <a class="nav-item" onclick="showSection('sec-dependencies')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="m16.5 9.4 4.5-2.8L12 2 3 6.6l4.5 2.8"></path><path d="M3 13.1 7.5 16l4.5-2.8"></path><path d="M12 22V12"></path></svg>
                7. Dependencies
            </a>
            <a class="nav-item" onclick="showSection('sec-activity')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="18" x="3" y="4" rx="2"></rect><line x1="16" x2="16" y1="2" y2="6"></line><line x1="8" x2="8" y1="2" y2="6"></line><line x1="3" x2="21" y1="10" y2="10"></line></svg>
                8. Activity & Heatmap
            </a>
            <a class="nav-item" onclick="showSection('sec-contributors')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M22 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                9. Contributors & Bus Factor
            </a>
            <a class="nav-item" onclick="showSection('sec-releases')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                10. Releases & Versions
            </a>
            <a class="nav-item" onclick="showSection('sec-issues-prs')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><line x1="12" x2="12" y1="8" y2="12"></line><line x1="12" x2="12.01" y1="16" y2="16"></line></svg>
                11. Issues & PRs
            </a>

            <div class="nav-header">Governance & Risk</div>
            <a class="nav-item" onclick="showSection('sec-security')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                12. Security Observatory
            </a>
            <a class="nav-item" onclick="showSection('sec-licenses')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect width="18" height="18" x="3" y="3" rx="2"></rect><path d="M3 9h18"></path><path d="M9 21V9"></path></svg>
                13. Licenses & Matrix
            </a>
            <a class="nav-item" onclick="showSection('sec-codequality')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
                14. Code Quality
            </a>

            <div class="nav-header">Cross-Repo Intelligence</div>
            <a class="nav-item" onclick="showSection('sec-comparison')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 20V10"></path><path d="M12 20V4"></path><path d="M6 20v-6"></path></svg>
                15. Repo Comparison
            </a>
            <a class="nav-item" onclick="showSection('sec-ecosystem')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" x2="15.42" y1="13.51" y2="17.49"></line><line x1="15.41" x2="8.59" y1="6.51" y2="10.49"></line></svg>
                16. Ecosystem Map
            </a>
            <a class="nav-item" onclick="showSection('sec-evolution')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>
                17. Evolution Timeline
            </a>
            <a class="nav-item" onclick="showSection('sec-sbom')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                18. Software BOM (SBOM)
            </a>
            <a class="nav-item" onclick="showSection('sec-portfolio')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                19. Portfolio Leaderboard
            </a>
            <a class="nav-item" onclick="showSection('sec-reproducibility')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4"></path><path d="M12 8h.01"></path></svg>
                20. Reproducibility & A11y
            </a>
            <a class="nav-item" onclick="showSection('sec-recommendations')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                21. Recommendations
            </a>
        </nav>

        <!-- Main Content Area -->
        <main class="main-content">

            <!-- 1. OVERVIEW -->
            <section id="sec-overview" class="dashboard-section active">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">
                            <span id="overviewRepoName">${primary.repo_name}</span>
                        </h1>
                        <p class="section-subtitle" id="overviewDescription">${primary.description || 'No description provided'}</p>
                    </div>
                    <div>
                        <a id="overviewRepoLink" href="${primary.repo_url}" target="_blank" class="btn">
                            View on GitHub
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                        </a>
                    </div>
                </div>

                <!-- Score and Primary Metrics -->
                <div class="grid-2" style="margin-bottom: 24px;">
                    <div class="card score-circle-container">
                        <div class="score-ring" id="overviewScoreRing" style="--score-pct: ${primary.health_score};">
                            <div class="score-ring-inner">
                                <div class="score-ring-val" id="overviewScore">${primary.health_score}</div>
                                <div class="score-ring-grade" id="overviewGrade">${primary.health_grade}</div>
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 13px; color: var(--text-dim); text-transform: uppercase; font-weight: 700; letter-spacing: 0.05em;">Overall Health Index</div>
                            <div style="font-size: 20px; font-weight: 700; color: var(--text-main); margin: 4px 0;" id="overviewRisk">${primary.risk_level}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">Weighted across 7 production engineering pillars</div>
                            <div style="margin-top: 12px;">
                                <span class="tag tag-accent" id="overviewTipsCount">${primary.recommendation_count || 0} Recommendations</span>
                            </div>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Repository Key Statistics</span>
                        </div>
                        <div class="grid-2">
                            <div>
                                <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Stars</div>
                                <div style="font-size: 22px; font-weight: 700; font-family: var(--font-mono); color: #fff;" id="overviewStars">${(primary.stars || 0).toLocaleString()}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Forks</div>
                                <div style="font-size: 22px; font-weight: 700; font-family: var(--font-mono); color: #fff;" id="overviewForks">${(primary.forks || 0).toLocaleString()}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Primary Language</div>
                                <div style="font-size: 15px; font-weight: 600; color: #fff; margin-top: 2px;" id="overviewLanguage">${primary.language || 'Unknown'}</div>
                            </div>
                            <div>
                                <div style="font-size: 11px; color: var(--text-dim); text-transform: uppercase;">Last Commit</div>
                                <div style="font-size: 15px; font-weight: 600; color: #fff; margin-top: 2px;" id="overviewLastCommit">${primary.last_commit || 'Unknown'}</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 7 Pillar Progress Bars -->
                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header">
                        <span class="card-title">7-Pillar Health Score Breakdown</span>
                    </div>
                    <div id="overviewPillarsContainer">
                        ${primary.pillar_rows ? primary.pillar_rows.slice(1).map(p => `
                            <div class="pillar-row">
                                <div class="pillar-label">
                                    <span>${p.metric}</span>
                                    <span style="font-family: var(--font-mono);">${p.value} (${p.status})</span>
                                </div>
                                <div class="progress-bar-bg">
                                    <div class="progress-bar-fill" style="width: ${parseInt(p.value, 10) || 0}%;"></div>
                                </div>
                            </div>
                        `).join('') : ''}
                    </div>
                </div>

                <!-- README Markdown Badge -->
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Embeddable README Health Badge</span>
                    </div>
                    <p style="font-size: 12px; color: var(--text-muted); margin-bottom: 12px;">Display your repository health index live in your project README:</p>
                    <div style="display: flex; gap: 16px; align-items: center; margin-bottom: 12px;">
                        <img id="overviewBadgeImg" src="${primary.badge_url}" alt="Health Badge">
                    </div>
                    <pre><code id="overviewBadgeCode">${primary.badge_markdown || ''}</code></pre>
                </div>
            </section>

            <!-- 2. ARCHITECTURE -->
            <section id="sec-architecture" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">System Architecture Diagram</h1>
                        <p class="section-subtitle">Deterministic topology derived from source components, frameworks, API controllers, and configurations</p>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <span class="card-title">Detected Architectural Layers & Relationships</span>
                        <span class="tag tag-accent" id="archComponentCount">Components: ${primary.architecture?.total_components || 0}</span>
                    </div>
                    <div id="archCanvasContainer" style="background: #0d0d0d; border: 1px solid var(--border-subtle); border-radius: 6px; padding: 24px; min-height: 420px;">
                        <!-- Render architecture nodes -->
                        <div style="display: flex; flex-direction: column; gap: 24px;">
                            ${(primary.architecture?.nodes || []).map(node => `
                                <div style="background: #181818; border: 1px solid var(--border-subtle); border-left: 4px solid var(--accent); border-radius: 6px; padding: 16px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center;">
                                        <div style="display: flex; align-items: center; gap: 10px;">
                                            <span style="font-weight: 700; font-size: 15px;">${node.label}</span>
                                            <span class="tag">${node.category}</span>
                                        </div>
                                        <span style="font-size: 11px; font-family: var(--font-mono); color: var(--text-dim);">${node.fileCount} source files detected</span>
                                    </div>
                                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">${node.description}</div>
                                    ${node.files && node.files.length > 0 ? `
                                        <div style="margin-top: 8px; font-size: 11px; font-family: var(--font-mono); color: var(--text-dim);">
                                            Evidence: ${node.files.slice(0, 3).join(', ')}
                                        </div>
                                    ` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    <div class="disclaimer-banner">
                        Architecture topology is deterministically extracted from declared file structures, directory conventions, and container configs; inferred relationships are highlighted based on standard framework communication contracts.
                    </div>
                </div>
            </section>

            <!-- 3. DATA FLOW -->
            <section id="sec-dataflow" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Static Data Flow Diagrams</h1>
                        <p class="section-subtitle">Inspection of inputs, API dispatches, service processors, and persistence transactions</p>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header">
                        <span class="card-title">1. End-to-End High Level Data Lifecycle</span>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Step</th>
                                    <th>Lifecycle Node</th>
                                    <th>Type</th>
                                    <th>Description & Payload</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(primary.data_flow?.diagrams?.high_level?.nodes || []).map(n => `
                                    <tr>
                                        <td><span class="tag tag-accent">${n.step}</span></td>
                                        <td style="font-weight: 600;">${n.label}</td>
                                        <td><span class="tag">${n.type}</span></td>
                                        <td style="color: var(--text-muted);">${n.details}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">2. Database Interaction Flow</span>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Step</th>
                                    <th>Operation Component</th>
                                    <th>Type</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(primary.data_flow?.diagrams?.database_interaction_flow?.nodes || []).map(n => `
                                    <tr>
                                        <td><span class="tag tag-accent">${n.step}</span></td>
                                        <td style="font-weight: 600;">${n.label}</td>
                                        <td><span class="tag">${n.type}</span></td>
                                        <td style="color: var(--text-muted);">${n.details}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- 4. TECHNOLOGY STACK -->
            <section id="sec-techstack" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Interactive Technology Stack Explorer</h1>
                        <p class="section-subtitle">Categorized detection across 10 domains with declared vs inferred verification</p>
                    </div>
                    <div>
                        <span class="tag tag-accent" id="techTotalCount">${primary.technology_stack?.total_technologies || 0} Technologies Detected</span>
                    </div>
                </div>

                <div class="grid-3" id="techCardsGrid">
                    ${(primary.technology_stack?.technologies || []).map(t => `
                        <div class="tech-card">
                            <img src="${t.logoUrl}" class="tech-icon" onerror="this.style.display='none'">
                            <div style="flex: 1; min-width: 0;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 700; font-size: 14px;">${t.name}</span>
                                    <span class="tag ${t.type === 'declared' ? 'tag-accent' : ''}">${t.type}</span>
                                </div>
                                <div style="font-size: 11px; color: var(--text-dim); margin-top: 2px;">${t.category}</div>
                                <div style="font-size: 11px; color: var(--text-muted); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                                    ${t.detectionSource}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </section>

            <!-- 5. CODEBASE EXPLORER -->
            <section id="sec-codebase" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Repository File Structure & Hierarchy</h1>
                        <p class="section-subtitle">File sizes, largest modules, directory nesting depth, and extensions breakdown</p>
                    </div>
                </div>

                <div class="grid-4" style="margin-bottom: 24px;">
                    <div class="card">
                        <div class="card-title">Total Files</div>
                        <div class="card-value" id="codebaseTotalFiles">${(primary.repository_structure?.total_files || 0).toLocaleString()}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Total Directories</div>
                        <div class="card-value">${(primary.repository_structure?.total_directories || 0).toLocaleString()}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Total Size</div>
                        <div class="card-value" style="color: var(--accent);">${primary.repository_structure?.total_size_formatted || '0 B'}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Max Nesting Depth</div>
                        <div class="card-value">${primary.repository_structure?.max_nesting_depth || 0} Levels</div>
                    </div>
                </div>

                <!-- Largest Files Ranking -->
                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Largest Repository Files</span>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>File Path</th>
                                    <th>Extension</th>
                                    <th>Size</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(primary.repository_structure?.largest_files || []).slice(0, 15).map(f => `
                                    <tr>
                                        <td style="font-family: var(--font-mono); font-size: 12px;">${f.path}</td>
                                        <td><span class="tag">${f.extension}</span></td>
                                        <td style="font-family: var(--font-mono); font-weight: 600;">${f.sizeFormatted}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- 6. LANGUAGES -->
            <section id="sec-languages" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Programming Language Distribution Analytics</h1>
                        <p class="section-subtitle">Byte-based language telemetry retrieved directly from GitHub Languages API</p>
                    </div>
                </div>

                <div class="grid-2" style="margin-bottom: 24px;">
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Language Share Breakdown</span>
                        </div>
                        <div style="max-height: 280px; display: flex; justify-content: center;">
                            <canvas id="languagesDonutChart"></canvas>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Detected Languages Ranking</span>
                        </div>
                        <div class="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Language</th>
                                        <th>Bytes Tracked</th>
                                        <th>Share</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(primary.language_distribution?.languages || []).map(l => `
                                        <tr>
                                            <td style="font-weight: 600;">${l.language}</td>
                                            <td style="font-family: var(--font-mono);">${l.bytes.toLocaleString()} B</td>
                                            <td><span class="tag tag-accent">${l.percentage}%</span></td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 7. DEPENDENCIES -->
            <section id="sec-dependencies" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Dependency Ecosystem & Package Analyzer</h1>
                        <p class="section-subtitle">Inspection of package manifests, direct vs transitive trees, and lockfile presence</p>
                    </div>
                </div>

                <div class="grid-4" style="margin-bottom: 24px;">
                    <div class="card">
                        <div class="card-title">Total Dependencies</div>
                        <div class="card-value">${primary.dependencies?.total_dependencies || 0}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Direct Packages</div>
                        <div class="card-value" style="color: var(--accent);">${primary.dependencies?.direct_dependencies_count || 0}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Transitive Packages</div>
                        <div class="card-value">${primary.dependencies?.transitive_dependencies_count || 0}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Unpinned / Broad</div>
                        <div class="card-value" style="color: ${primary.dependencies?.unpinned_dependencies_count > 0 ? 'var(--warning)' : 'var(--success)'};">
                            ${primary.dependencies?.unpinned_dependencies_count || 0}
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Declared Packages & Specifications</span>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Package Name</th>
                                    <th>Ecosystem</th>
                                    <th>Scope</th>
                                    <th>Declared Version</th>
                                    <th>Resolved Version</th>
                                    <th>Lockfile Pinned</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(primary.dependencies?.dependencies || []).slice(0, 30).map(d => `
                                    <tr>
                                        <td style="font-weight: 600; font-family: var(--font-mono); font-size: 12px;">${d.name}</td>
                                        <td><span class="tag">${d.ecosystem}</span></td>
                                        <td><span class="tag">${d.scope}</span></td>
                                        <td style="font-family: var(--font-mono);">${d.declaredVersion}</td>
                                        <td style="font-family: var(--font-mono);">${d.resolvedVersion || 'N/A'}</td>
                                        <td><span class="tag ${d.isUnpinned ? 'tag-warning' : 'tag-success'}">${d.isUnpinned ? 'Broad' : 'Pinned'}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- 8. ACTIVITY & HEATMAP -->
            <section id="sec-activity" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">GitHub Activity Timeline & Contribution Heatmap</h1>
                        <p class="section-subtitle">Rolling 52-week activity grid, commit cadence, and maintainer dormancy checks</p>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header">
                        <span class="card-title">Rolling Contribution Heatmap</span>
                        <span class="tag tag-accent">${primary.activity?.commit_frequency_per_week || 0} commits / week</span>
                    </div>
                    <div class="heatmap-container" id="activityHeatmapGrid">
                        <!-- Populated by script -->
                    </div>
                    <div style="display: flex; justify-content: flex-end; align-items: center; gap: 6px; font-size: 11px; color: var(--text-dim); margin-top: 10px;">
                        <span>Less</span>
                        <div class="heatmap-cell"></div>
                        <div class="heatmap-cell level-1"></div>
                        <div class="heatmap-cell level-2"></div>
                        <div class="heatmap-cell level-3"></div>
                        <div class="heatmap-cell level-4"></div>
                        <span>More</span>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Recent Commit Audit</span>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>SHA</th>
                                    <th>Message</th>
                                    <th>Author</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(primary.activity?.recent_commits || []).map(c => `
                                    <tr>
                                        <td><span class="tag" style="font-family: var(--font-mono);">${c.sha}</span></td>
                                        <td style="font-weight: 500;">${c.message}</td>
                                        <td style="color: var(--text-muted);">${c.author}</td>
                                        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim);">${c.date}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- 9. CONTRIBUTORS & BUS FACTOR -->
            <section id="sec-contributors" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Contributor & Team Analytics</h1>
                        <p class="section-subtitle">Statistical Bus Factor Indicator and maintainer contribution concentration</p>
                    </div>
                </div>

                <!-- Bus Factor Indicator Banner -->
                <div class="card" style="margin-bottom: 24px; border-left: 4px solid var(--accent);">
                    <div class="card-title">Statistical Bus Factor Indicator</div>
                    <div style="display: flex; align-items: baseline; gap: 12px; margin: 8px 0;">
                        <span class="card-value" style="color: var(--accent);">${primary.contributors?.bus_factor?.value || 0}</span>
                        <span class="tag ${primary.contributors?.bus_factor?.value === 1 ? 'tag-danger' : 'tag-success'}">
                            ${primary.contributors?.bus_factor?.status || 'Unknown'}
                        </span>
                    </div>
                    <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 8px;">
                        ${primary.contributors?.bus_factor?.warning || 'No contributor concentration warnings.'}
                    </p>
                    <div style="font-size: 11px; color: var(--text-dim);">
                        ${primary.contributors?.bus_factor?.disclaimer || ''}
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Core Contributors Ranking</span>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Contributor</th>
                                    <th>Tracked Commits</th>
                                    <th>Contribution Share</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(primary.contributors?.contributors || []).map(c => `
                                    <tr>
                                        <td><span class="tag">${c.rank}</span></td>
                                        <td style="font-weight: 600; font-family: var(--font-mono);">${c.login}</td>
                                        <td style="font-family: var(--font-mono);">${c.contributions.toLocaleString()}</td>
                                        <td><span class="tag tag-accent">${c.percentage}%</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- 10. RELEASES & VERSIONS -->
            <section id="sec-releases" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Release & Version Intelligence</h1>
                        <p class="section-subtitle">Deployment cadence, tag timelines, and semantic versioning tracking</p>
                    </div>
                </div>

                <div class="grid-3" style="margin-bottom: 24px;">
                    <div class="card">
                        <div class="card-title">Latest Release</div>
                        <div class="card-value" style="color: var(--accent);">${primary.releases?.latest_release_tag || 'None'}</div>
                        <div class="card-meta">Published: ${primary.releases?.latest_release_date || 'N/A'}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Total Releases</div>
                        <div class="card-value">${primary.releases?.total_releases || 0}</div>
                        <div class="card-meta">Tags: ${primary.releases?.total_tags || 0}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Average Cadence</div>
                        <div class="card-value">${primary.releases?.average_days_between_releases ? `${primary.releases.average_days_between_releases} Days` : 'N/A'}</div>
                        <div class="card-meta">~${primary.releases?.release_frequency_per_year || 0} releases/year</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Release Timeline History</span>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Tag Name</th>
                                    <th>Date</th>
                                    <th>Notes Available</th>
                                    <th>Release Assets</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(primary.releases?.timeline || []).map(r => `
                                    <tr>
                                        <td style="font-weight: 600; font-family: var(--font-mono);">${r.tag}</td>
                                        <td style="color: var(--text-muted); font-size: 12px;">${r.date}</td>
                                        <td><span class="tag ${r.hasNotes ? 'tag-success' : ''}">${r.hasNotes ? 'Changelog Included' : 'No Notes'}</span></td>
                                        <td style="font-family: var(--font-mono);">${r.assetCount} assets</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- 11. ISSUES & PRS -->
            <section id="sec-issues-prs" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Issues & Pull Request Intelligence</h1>
                        <p class="section-subtitle">Backlog aging, PR merge ratios, resolution velocity, and stale item counts</p>
                    </div>
                </div>

                <div class="grid-4" style="margin-bottom: 24px;">
                    <div class="card">
                        <div class="card-title">Open Issues</div>
                        <div class="card-value">${primary.issues_and_prs?.total_open_issues || 0}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Issue Close Ratio</div>
                        <div class="card-value" style="color: var(--accent);">${primary.issues_and_prs?.issue_close_ratio_percent || 0}%</div>
                    </div>
                    <div class="card">
                        <div class="card-title">PR Merge Ratio</div>
                        <div class="card-value" style="color: var(--accent);">${primary.issues_and_prs?.pr_merge_ratio_percent || 0}%</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Stale Issues (>60d)</div>
                        <div class="card-value" style="color: ${primary.issues_and_prs?.stale_issues_count > 0 ? 'var(--warning)' : 'var(--success)'};">
                            ${primary.issues_and_prs?.stale_issues_count || 0}
                        </div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Backlog Aging Distribution</span>
                    </div>
                    <div class="grid-4" style="text-align: center;">
                        <div style="background: #111; padding: 14px; border-radius: 6px;">
                            <div style="font-size: 11px; color: var(--text-dim);">&lt; 30 Days</div>
                            <div style="font-size: 20px; font-weight: 700; color: #fff;">${primary.issues_and_prs?.backlog_aging_distribution?.under_30_days || 0}</div>
                        </div>
                        <div style="background: #111; padding: 14px; border-radius: 6px;">
                            <div style="font-size: 11px; color: var(--text-dim);">30 - 90 Days</div>
                            <div style="font-size: 20px; font-weight: 700; color: #fff;">${primary.issues_and_prs?.backlog_aging_distribution?.between_30_and_90_days || 0}</div>
                        </div>
                        <div style="background: #111; padding: 14px; border-radius: 6px;">
                            <div style="font-size: 11px; color: var(--text-dim);">90 - 180 Days</div>
                            <div style="font-size: 20px; font-weight: 700; color: #fff;">${primary.issues_and_prs?.backlog_aging_distribution?.between_90_and_180_days || 0}</div>
                        </div>
                        <div style="background: #111; padding: 14px; border-radius: 6px;">
                            <div style="font-size: 11px; color: var(--text-dim);">&gt; 180 Days (Aging)</div>
                            <div style="font-size: 20px; font-weight: 700; color: var(--warning);">${primary.issues_and_prs?.backlog_aging_distribution?.over_180_days || 0}</div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 12. SECURITY OBSERVATORY -->
            <section id="sec-security" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Security Configuration Observatory</h1>
                        <p class="section-subtitle">Audit of vulnerability policies, automated dependency scanning, and CodeQL SAST</p>
                    </div>
                    <div>
                        <span class="tag tag-accent" style="font-size: 14px; padding: 6px 12px;">Score: ${primary.security?.security_readiness_score || 0}/100</span>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header">
                        <span class="card-title">Security Readiness Checklist</span>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Security Control</th>
                                    <th>Status</th>
                                    <th>Evidence File</th>
                                    <th>Remediation Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(primary.security?.checklist || []).map(c => `
                                    <tr>
                                        <td style="font-weight: 600;">${c.name}</td>
                                        <td>
                                            <span class="tag ${c.status === 'enabled' ? 'tag-success' : c.status === 'unavailable' ? 'tag-warning' : 'tag-danger'}">
                                                ${c.status.toUpperCase()}
                                            </span>
                                        </td>
                                        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${c.file}</td>
                                        <td style="font-size: 12px; color: var(--text-dim);">${c.remediation}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="disclaimer-banner">
                        ${primary.security?.disclaimer || ''}
                    </div>
                </div>
            </section>

            <!-- 13. LICENSES & MATRIX -->
            <section id="sec-licenses" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">License Compatibility & Compliance Matrix</h1>
                        <p class="section-subtitle">SPDX license analysis, dependency license matrix, and copyleft conflict flags</p>
                    </div>
                </div>

                <div class="grid-3" style="margin-bottom: 24px;">
                    <div class="card">
                        <div class="card-title">Repository License</div>
                        <div class="card-value" style="color: var(--accent);">${primary.licenses?.repository_license?.spdx_id || 'None'}</div>
                        <div class="card-meta">Family: ${primary.licenses?.repository_license?.family || 'Unknown'}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Permissive Dependencies</div>
                        <div class="card-value" style="color: var(--success);">${primary.licenses?.family_breakdown?.Permissive || 0}</div>
                        <div class="card-meta">MIT, Apache 2.0, BSD, ISC</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Policy Conflict Flags</div>
                        <div class="card-value" style="color: ${primary.licenses?.has_conflicts ? 'var(--danger)' : 'var(--success)'};">
                            ${primary.licenses?.potential_policy_conflicts?.length || 0}
                        </div>
                        <div class="card-meta">${primary.licenses?.has_conflicts ? 'Copyleft risk detected' : 'Clean compatibility'}</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Sample Dependency License Matrix</span>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Dependency</th>
                                    <th>License</th>
                                    <th>License Family</th>
                                    <th>Commercial Risk</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(primary.licenses?.dependency_licenses || []).slice(0, 20).map(d => `
                                    <tr>
                                        <td style="font-weight: 600; font-family: var(--font-mono);">${d.name}</td>
                                        <td><span class="tag">${d.license}</span></td>
                                        <td>${d.family}</td>
                                        <td><span class="tag ${d.risk === 'Low' ? 'tag-success' : d.risk === 'Medium' ? 'tag-warning' : 'tag-danger'}">${d.risk}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    <div class="disclaimer-banner">
                        ${primary.licenses?.disclaimer || ''}
                    </div>
                </div>
            </section>

            <!-- 14. CODE QUALITY -->
            <section id="sec-codequality" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Repository Size & Code Complexity Observatory</h1>
                        <p class="section-subtitle">Structural metrics, technical debt markers, nesting depth, and estimated LOC</p>
                    </div>
                </div>

                <div class="grid-4" style="margin-bottom: 24px;">
                    <div class="card">
                        <div class="card-title">Estimated Lines of Code</div>
                        <div class="card-value">${(primary.code_quality?.estimated_lines_of_code || 0).toLocaleString()}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Complexity Rating</div>
                        <div class="card-value" style="color: var(--accent);">${primary.code_quality?.complexity_rating || 'Low'}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">TODO Markers</div>
                        <div class="card-value">${primary.code_quality?.todo_count || 0}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">FIXME / HACK Markers</div>
                        <div class="card-value" style="color: ${(primary.code_quality?.fixme_count + primary.code_quality?.hack_count) > 0 ? 'var(--warning)' : 'var(--success)'};">
                            ${(primary.code_quality?.fixme_count || 0) + (primary.code_quality?.hack_count || 0)}
                        </div>
                    </div>
                </div>
            </section>

            <!-- 15. REPO COMPARISON -->
            <section id="sec-comparison" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Repository Comparison & Benchmarking</h1>
                        <p class="section-subtitle">Side-by-side evaluation of all analyzed repositories across pillars and metrics</p>
                    </div>
                </div>

                <div class="card" style="margin-bottom: 24px;">
                    <div class="card-header">
                        <span class="card-title">7-Pillar Comparative Radar</span>
                    </div>
                    <div style="max-height: 380px; display: flex; justify-content: center;">
                        <canvas id="comparisonRadarChart"></canvas>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Comparative Metrics Matrix</span>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Repository</th>
                                    <th>Health Score</th>
                                    <th>Grade</th>
                                    <th>Stars</th>
                                    <th>Security</th>
                                    <th>Reproducibility</th>
                                    <th>Files</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(comparisonData.repositories || []).map(r => `
                                    <tr>
                                        <td style="font-weight: 700; font-family: var(--font-mono);">${r.name}</td>
                                        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent);">${r.health_score}</td>
                                        <td><span class="tag tag-accent">${r.health_grade}</span></td>
                                        <td style="font-family: var(--font-mono);">${r.stars.toLocaleString()}</td>
                                        <td style="font-family: var(--font-mono);">${r.security_score}/100</td>
                                        <td style="font-family: var(--font-mono);">${r.reproducibility_score}/100</td>
                                        <td style="font-family: var(--font-mono);">${r.total_files}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- 16. ECOSYSTEM MAP -->
            <section id="sec-ecosystem" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Repository Relationship & Technology Ecosystem Map</h1>
                        <p class="section-subtitle">Network clusters mapped by shared dependencies, frameworks, and programming languages</p>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Ecosystem Topology</span>
                        <span class="tag tag-accent">${ecosystemData.total_repositories || 0} Nodes | ${ecosystemData.total_relationships || 0} Shared Edges</span>
                    </div>
                    <div style="background: #0e0e0e; border: 1px solid var(--border-subtle); border-radius: 6px; padding: 24px; min-height: 320px;">
                        ${(ecosystemData.clusters || []).map(c => `
                            <div style="margin-bottom: 16px;">
                                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                                    <span style="font-weight: 700; font-size: 14px; color: var(--accent);">${c.clusterName} Ecosystem Cluster</span>
                                    <span class="tag">${c.repositoryCount} Repositories</span>
                                </div>
                                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                                    ${c.repositories.map(repo => `
                                        <div style="background: #181818; border: 1px solid var(--border-subtle); padding: 6px 12px; border-radius: 4px; font-family: var(--font-mono); font-size: 12px;">
                                            ${repo}
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="disclaimer-banner">
                        ${ecosystemData.disclaimer || ''}
                    </div>
                </div>
            </section>

            <!-- 17. EVOLUTION TIMELINE -->
            <section id="sec-evolution" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Repository Evolution & Technical Debt Timeline</h1>
                        <p class="section-subtitle">Chronological progression of repository inception, releases, commits, and debt markers</p>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Key Repository Milestones</span>
                    </div>
                    <div style="display: flex; flex-direction: column; gap: 16px;">
                        ${(primary.evolution?.milestones || []).map(m => `
                            <div style="background: #111; border-left: 3px solid var(--accent); border-radius: 4px; padding: 14px 18px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span style="font-weight: 700; font-size: 14px;">${m.event}</span>
                                    <span class="tag" style="font-size: 10px;">${m.date}</span>
                                </div>
                                <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${m.description}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="disclaimer-banner">
                        ${primary.evolution?.disclaimer || ''}
                    </div>
                </div>
            </section>

            <!-- 18. SBOM -->
            <section id="sec-sbom" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Software Bill of Materials (SBOM)</h1>
                        <p class="section-subtitle">Full software component inventory compliant with CycloneDX 1.5 JSON & SPDX 2.3 JSON</p>
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button class="btn btn-accent" onclick="downloadCycloneDxSbom()">Export CycloneDX</button>
                        <button class="btn" onclick="downloadSpdxSbom()">Export SPDX</button>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">BOM Component Inventory</span>
                        <span class="tag tag-accent">${primary.sbom?.total_components || 0} Components</span>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Package Name</th>
                                    <th>Version</th>
                                    <th>Package URL (PURL)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(primary.dependencies?.dependencies || []).slice(0, 35).map(c => `
                                    <tr>
                                        <td style="font-weight: 600; font-family: var(--font-mono);">${c.name}</td>
                                        <td style="font-family: var(--font-mono);">${c.resolvedVersion || c.declaredVersion}</td>
                                        <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-dim);">${c.purl}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- 19. PORTFOLIO LEADERBOARD -->
            <section id="sec-portfolio" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Repository Portfolio Leaderboard</h1>
                        <p class="section-subtitle">Comparative rankings and recognized accolades across scanned portfolio</p>
                    </div>
                </div>

                <div class="grid-3" style="margin-bottom: 24px;">
                    <div class="card">
                        <div class="card-title">Best Maintained</div>
                        <div style="font-size: 16px; font-weight: 700; margin-top: 4px; color: var(--accent);">${portfolioData.accolades?.best_maintained?.repository || 'N/A'}</div>
                        <div class="card-meta">Score: ${portfolioData.accolades?.best_maintained?.metric || ''}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Highest Security Configuration</div>
                        <div style="font-size: 16px; font-weight: 700; margin-top: 4px; color: var(--accent);">${portfolioData.accolades?.highest_security?.repository || 'N/A'}</div>
                        <div class="card-meta">Readiness: ${portfolioData.accolades?.highest_security?.metric || ''}</div>
                    </div>
                    <div class="card">
                        <div class="card-title">Best Documentation</div>
                        <div style="font-size: 16px; font-weight: 700; margin-top: 4px; color: var(--accent);">${portfolioData.accolades?.best_documentation?.repository || 'N/A'}</div>
                        <div class="card-meta">Docs Score: ${portfolioData.accolades?.best_documentation?.metric || ''}</div>
                    </div>
                </div>

                <div class="card">
                    <div class="card-header">
                        <span class="card-title">Portfolio Leaderboard</span>
                    </div>
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Rank</th>
                                    <th>Repository</th>
                                    <th>Health Index</th>
                                    <th>Grade</th>
                                    <th>Stars</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(portfolioData.leaderboard || []).map(r => `
                                    <tr>
                                        <td><span class="tag tag-accent">${r.rank}</span></td>
                                        <td style="font-weight: 700; font-family: var(--font-mono);">${r.fullName}</td>
                                        <td style="font-family: var(--font-mono); font-weight: 700; color: var(--accent);">${r.health_score}/100</td>
                                        <td><span class="tag">${r.health_grade}</span></td>
                                        <td style="font-family: var(--font-mono);">${r.stars.toLocaleString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            <!-- 20. REPRODUCIBILITY & ACCESSIBILITY -->
            <section id="sec-reproducibility" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Reproducibility & Accessibility Readiness Audit</h1>
                        <p class="section-subtitle">Evaluation of container configs, environment templates, accessibility linters, and i18n</p>
                    </div>
                    <div>
                        <span class="tag tag-accent" style="font-size: 13px; padding: 6px 12px;">Reproducibility: ${primary.reproducibility?.reproducibility_score || 0}/100</span>
                    </div>
                </div>

                <div class="grid-2" style="margin-bottom: 24px;">
                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Dev Environment Reproducibility</span>
                        </div>
                        <div class="table-responsive">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Control</th>
                                        <th>Status</th>
                                        <th>Detected Evidence</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${(primary.reproducibility?.checklist || []).map(c => `
                                        <tr>
                                            <td style="font-weight: 600;">${c.name}</td>
                                            <td><span class="tag ${c.status === 'enabled' ? 'tag-success' : 'tag-danger'}">${c.status.toUpperCase()}</span></td>
                                            <td style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted);">${c.file}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="card">
                        <div class="card-header">
                            <span class="card-title">Accessibility & Localization Tooling</span>
                        </div>
                        <div style="margin-bottom: 16px;">
                            <div style="font-size: 12px; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Accessibility (A11y) Readiness</div>
                            <div style="font-size: 20px; font-weight: 700; color: var(--accent); margin: 4px 0;">${primary.accessibility?.accessibility?.status || 'None'}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">
                                ${primary.accessibility?.accessibility?.detected_tools?.length ? primary.accessibility.accessibility.detected_tools.map(t => t.name).join(', ') : 'No automated a11y testing engines or eslint plugins found'}
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 12px; color: var(--text-dim); text-transform: uppercase; font-weight: 700;">Localization (I18n) Readiness</div>
                            <div style="font-size: 20px; font-weight: 700; color: var(--accent); margin: 4px 0;">${primary.accessibility?.localization?.status || 'None'}</div>
                            <div style="font-size: 12px; color: var(--text-muted);">
                                ${primary.accessibility?.localization?.detected_tools?.length ? primary.accessibility.localization.detected_tools.map(t => t.name).join(', ') : 'Single locale assumed; no i18n directory or library detected'}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- 21. RECOMMENDATIONS -->
            <section id="sec-recommendations" class="dashboard-section">
                <div class="section-header">
                    <div>
                        <h1 class="section-title">Actionable Engineering Recommendations</h1>
                        <p class="section-subtitle">Prioritized remediations to boost repository reliability, security posture, and health grade</p>
                    </div>
                </div>

                <div class="card">
                    <div class="table-responsive">
                        <table>
                            <thead>
                                <tr>
                                    <th>Priority</th>
                                    <th>Pillar</th>
                                    <th>Observed Issue</th>
                                    <th>Prescribed Remediation</th>
                                    <th>Impact</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${(primary.recommendations || []).map(r => `
                                    <tr>
                                        <td>
                                            <span class="tag ${r.priority === 'Critical' ? 'tag-danger' : r.priority === 'Medium' ? 'tag-warning' : 'tag-accent'}">
                                                ${r.priority}
                                            </span>
                                        </td>
                                        <td style="font-weight: 600;">${r.category}</td>
                                        <td style="font-weight: 500;">${r.issue}</td>
                                        <td style="color: var(--text-muted);">${r.action}</td>
                                        <td><span class="tag tag-accent">${r.impact}</span></td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

        </main>
    </div>

    <!-- Client-side Interactive Engine Script -->
    <script>
        const DATA = ${serializedPayload};
        let currentRepoIndex = 0;

        // Navigation Tab Switching
        function showSection(sectionId) {
            document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));

            const targetSec = document.getElementById(sectionId);
            if (targetSec) targetSec.classList.add('active');

            // Set active class on sidebar button
            const navLink = Array.from(document.querySelectorAll('.nav-item')).find(el => el.getAttribute('onclick')?.includes(sectionId));
            if (navLink) navLink.classList.add('active');

            // Render charts on tab enter if necessary
            if (sectionId === 'sec-languages') renderLanguagesChart();
            if (sectionId === 'sec-comparison') renderComparisonRadar();
        }

        // Repository Selector
        function switchRepository(index) {
            currentRepoIndex = parseInt(index, 10);
            const repo = DATA.repositories[currentRepoIndex];
            if (!repo) return;

            // Overview updates
            document.getElementById('overviewRepoName').innerText = repo.repo_name;
            document.getElementById('overviewDescription').innerText = repo.description || 'No description provided';
            document.getElementById('overviewRepoLink').href = repo.repo_url;
            document.getElementById('overviewScore').innerText = repo.health_score;
            document.getElementById('overviewGrade').innerText = repo.health_grade;
            document.getElementById('overviewRisk').innerText = repo.risk_level;
            document.getElementById('overviewScoreRing').style.setProperty('--score-pct', repo.health_score);
            document.getElementById('overviewStars').innerText = (repo.stars || 0).toLocaleString();
            document.getElementById('overviewForks').innerText = (repo.forks || 0).toLocaleString();
            document.getElementById('overviewLanguage').innerText = repo.language || 'Unknown';
            document.getElementById('overviewLastCommit').innerText = repo.last_commit || 'Unknown';
            document.getElementById('overviewBadgeImg').src = repo.badge_url;
            document.getElementById('overviewBadgeCode').innerText = repo.badge_markdown || '';

            renderActivityHeatmap();
            renderLanguagesChart();
        }

        // Render Languages Donut Chart
        let langChartInstance = null;
        function renderLanguagesChart() {
            const ctx = document.getElementById('languagesDonutChart');
            if (!ctx) return;
            if (langChartInstance) langChartInstance.destroy();

            const repo = DATA.repositories[currentRepoIndex];
            const languages = repo.language_distribution?.languages || [];
            if (languages.length === 0) return;

            const labels = languages.map(l => l.language);
            const data = languages.map(l => l.bytes);
            const colors = ['#B8FF63', '#3B82F6', '#EC4899', '#10B981', '#F59E0B', '#8B5CF6', '#6366F1'];

            langChartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels,
                    datasets: [{
                        data,
                        backgroundColor: colors.slice(0, data.length),
                        borderColor: '#151515',
                        borderWidth: 2,
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#a3a3a3', font: { family: 'Inter', size: 11 } } }
                    }
                }
            });
        }

        // Render Comparison Radar Chart
        let radarChartInstance = null;
        function renderComparisonRadar() {
            const ctx = document.getElementById('comparisonRadarChart');
            if (!ctx || !DATA.comparison?.radar_chart) return;
            if (radarChartInstance) radarChartInstance.destroy();

            radarChartInstance = new Chart(ctx, {
                type: 'radar',
                data: DATA.comparison.radar_chart,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            min: 0,
                            max: 100,
                            ticks: { display: false },
                            grid: { color: '#262626' },
                            pointLabels: { color: '#a3a3a3', font: { family: 'Inter', size: 11, weight: 'bold' } }
                        }
                    },
                    plugins: {
                        legend: { position: 'top', labels: { color: '#ffffff', font: { family: 'Inter' } } }
                    }
                }
            });
        }

        // Render Activity Heatmap
        function renderActivityHeatmap() {
            const container = document.getElementById('activityHeatmapGrid');
            if (!container) return;
            container.innerHTML = '';

            const repo = DATA.repositories[currentRepoIndex];
            const cells = repo.activity?.heatmap_data || [];
            if (cells.length === 0) return;

            // 52 columns x 7 rows
            for (let c = 0; c < 52; c++) {
                const colEl = document.createElement('div');
                colEl.className = 'heatmap-col';
                for (let r = 0; r < 7; r++) {
                    const idx = c * 7 + r;
                    const cellData = cells[idx] || { level: 0, count: 0, date: '' };
                    const cellEl = document.createElement('div');
                    cellEl.className = 'heatmap-cell' + (cellData.level > 0 ? ' level-' + cellData.level : '');
                    cellEl.title = cellData.date + ': ' + cellData.count + ' commits';
                    colEl.appendChild(cellEl);
                }
                container.appendChild(colEl);
            }
        }

        // Export Full Dataset JSON
        function exportFullJson() {
            const blob = new Blob([JSON.stringify(DATA.repositories, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'github-repository-intelligence-analysis.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        // Download CycloneDX SBOM JSON
        function downloadCycloneDxSbom() {
            const repo = DATA.repositories[currentRepoIndex];
            const sbomJson = repo.sbom?.cyclonedx_json || {};
            const blob = new Blob([JSON.stringify(sbomJson, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (repo.repo_name.replace(/[^a-zA-Z0-9_-]/g, '_')) + '-cyclonedx-sbom.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        // Download SPDX SBOM JSON
        function downloadSpdxSbom() {
            const repo = DATA.repositories[currentRepoIndex];
            const sbomJson = repo.sbom?.spdx_json || {};
            const blob = new Blob([JSON.stringify(sbomJson, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = (repo.repo_name.replace(/[^a-zA-Z0-9_-]/g, '_')) + '-spdx-sbom.json';
            a.click();
            URL.revokeObjectURL(url);
        }

        // Initial setup
        window.addEventListener('DOMContentLoaded', () => {
            renderActivityHeatmap();
        });
    </script>
</body>
</html>`;
}

function generateEmptyDashboard() {
    return `<!DOCTYPE html>
<html>
<head>
    <title>GitHub Repository Intelligence Platform</title>
    <style>
        body { background: #090A07; color: #fff; font-family: sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; }
    </style>
</head>
<body>
    <div style="text-align: center;">
        <h2>No Repository Analysis Data Available</h2>
        <p style="color: #888;">Ensure valid GitHub repository URLs are passed in Actor input.</p>
    </div>
</body>
</html>`;
}
