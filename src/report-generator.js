/**
 * Single Repository Report Generator
 * Creates a focused per-repository HTML summary card and Markdown report.
 * Dark fintech theme: Background #090A07, Card #151515, Accent #B8FF63, Zero emojis.
 */

/**
 * Generate a standalone single-repository HTML report card
 * @param {Object} result - Normalized repository analysis record
 * @returns {string} HTML report string
 */
export function generateHtmlReport(result) {
    const score = result.health_score || 0;
    const grade = result.health_grade || 'N/A';
    const risk = result.risk_level || 'Unknown';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Health Report: ${result.repo_name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-base: #090A07;
            --bg-card: #151515;
            --accent: #B8FF63;
            --border-color: #262626;
            --text-main: #FFFFFF;
            --text-muted: #A3A3A3;
            --font-sans: 'Inter', -apple-system, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: var(--font-sans);
            background: var(--bg-base);
            color: var(--text-main);
            min-height: 100vh;
            padding: 32px 16px;
            display: flex;
            justify-content: center;
        }
        .container { max-width: 820px; width: 100%; }
        .header {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 32px;
            text-align: center;
            margin-bottom: 24px;
        }
        .repo-name { font-size: 24px; font-weight: 800; font-family: var(--font-mono); }
        .score-circle {
            width: 110px;
            height: 110px;
            border-radius: 50%;
            background: #202020;
            border: 4px solid var(--accent);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 20px auto;
        }
        .score-number { font-size: 38px; font-weight: 800; font-family: var(--font-mono); color: var(--accent); line-height: 1; }
        .score-grade { font-size: 13px; font-weight: 700; color: var(--text-muted); margin-top: 4px; }
        .risk-badge {
            display: inline-block;
            padding: 4px 14px;
            border-radius: 4px;
            background: rgba(184, 255, 99, 0.1);
            color: var(--accent);
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .section {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 20px;
        }
        .section-title {
            font-size: 14px;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 16px;
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 8px;
        }
        .pillar-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid #202020;
            font-size: 13px;
        }
        .pillar-row:last-child { border-bottom: none; }
        .tag {
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-family: var(--font-mono);
            font-weight: 600;
            background: #262626;
            color: var(--text-main);
        }
        .tag-accent { background: rgba(184, 255, 99, 0.15); color: var(--accent); }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="repo-name">${result.repo_name}</div>
            <p style="color: var(--text-muted); font-size: 13px; margin-top: 6px;">${result.description || 'GitHub Repository Health Analysis'}</p>
            <div class="score-circle">
                <div class="score-number">${score}</div>
                <div class="score-grade">${grade}</div>
            </div>
            <div class="risk-badge">${risk}</div>
        </div>

        <div class="section">
            <div class="section-title">7-Pillar Health Score Breakdown</div>
            ${(result.pillar_rows || []).slice(1).map(p => `
                <div class="pillar-row">
                    <span>${p.metric}</span>
                    <span class="tag tag-accent">${p.value} (${p.status})</span>
                </div>
            `).join('')}
        </div>

        <div class="section">
            <div class="section-title">Actionable Recommendations</div>
            ${(result.recommendations || []).slice(0, 5).map(r => `
                <div style="padding: 10px 0; border-bottom: 1px solid #202020;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: 600; font-size: 13px;">${r.issue}</span>
                        <span class="tag">${r.priority}</span>
                    </div>
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">${r.action}</div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;
}

/**
 * Generate markdown summary of repository analysis
 * @param {Object} result - Normalized repository analysis record
 * @returns {string} Markdown text string
 */
export function generateMarkdownSummary(result) {
    const pillars = result.pillar_rows ? result.pillar_rows.slice(1).map(p => `- **${p.metric}**: ${p.value} (${p.status})`).join('\n') : '';
    const recommendations = (result.recommendations || []).map(r => `- [${r.priority}] **${r.issue}**: ${r.action} (${r.impact})`).join('\n');

    return `# Repository Intelligence Audit: ${result.repo_name}

**Overall Health Score**: ${result.health_score}/100 (Grade: ${result.health_grade})
**Risk Level**: ${result.risk_level}
**Stars**: ${(result.stars || 0).toLocaleString()} | **Forks**: ${(result.forks || 0).toLocaleString()}
**Last Commit**: ${result.last_commit || 'Unknown'}

## 7-Pillar Breakdown
${pillars}

## Actionable Recommendations
${recommendations}

---
*Generated by Apify GitHub Repository Intelligence Platform.*
`;
}
