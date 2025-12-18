/**
 * Dashboard Generator for OUTPUT preview
 * Creates combined HTML dashboard saved as OUTPUT for "Preview in new tab"
 */

/**
 * Generate combined dashboard HTML for all results
 */
export function generateCombinedDashboard(results) {
    const avgScore = Math.round(results.reduce((a, r) => a + r.health_score, 0) / results.length);
    const healthyCount = results.filter(r => r.health_score >= 80).length;
    const totalTips = results.reduce((a, r) => a + (r.recommendation_count || 0), 0);

    const cards = results.map(r => generateResultCard(r)).join('');

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Health Dashboard - ${results.length} Repositories</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%);
            min-height: 100vh;
            padding: 30px;
            color: #e5e5e5;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 32px;
            background: linear-gradient(90deg, #3b82f6, #8b5cf6);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .header p { color: #888; font-size: 16px; }
        .stats-bar {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin: 20px 0;
            flex-wrap: wrap;
        }
        .stat {
            background: rgba(255,255,255,0.05);
            padding: 15px 25px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .stat-value { font-size: 28px; font-weight: 700; color: #3b82f6; }
        .stat-label { font-size: 12px; color: #888; text-transform: uppercase; }
        .cards-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
            gap: 20px;
            max-width: 1400px;
            margin: 0 auto;
        }
        .card {
            background: rgba(255,255,255,0.03);
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.08);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .card:hover {
            transform: translateY(-4px);
            box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .card-header {
            padding: 20px;
            display: flex;
            align-items: center;
            gap: 16px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .score-circle {
            width: 70px;
            height: 70px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
        }
        .score-circle.high { background: linear-gradient(135deg, #22c55e, #16a34a); }
        .score-circle.medium { background: linear-gradient(135deg, #eab308, #ca8a04); }
        .score-circle.low { background: linear-gradient(135deg, #ef4444, #dc2626); }
        .score-number { font-size: 22px; font-weight: 800; color: #fff; }
        .score-grade { font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.8); }
        .card-title { flex: 1; }
        .card-title h3 { font-size: 18px; color: #fff; margin-bottom: 4px; }
        .card-title a { color: #3b82f6; font-size: 12px; text-decoration: none; }
        .card-body { padding: 20px; }
        .pillars-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
        }
        .pillar-item {
            display: flex;
            justify-content: space-between;
            padding: 10px 12px;
            background: rgba(255,255,255,0.03);
            border-radius: 8px;
        }
        .pillar-name { color: #888; font-size: 13px; }
        .pillar-score { font-weight: 600; color: #fff; font-size: 14px; }
        .card-footer {
            padding: 16px 20px;
            background: rgba(255,255,255,0.02);
            border-top: 1px solid rgba(255,255,255,0.05);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .risk-badge {
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        .risk-low { background: #22c55e20; color: #22c55e; }
        .risk-medium { background: #eab30820; color: #eab308; }
        .risk-high { background: #ef444420; color: #ef4444; }
        .meta-info { color: #666; font-size: 12px; }
        .recommendations-section {
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid rgba(255,255,255,0.05);
        }
        .rec-title { font-size: 13px; color: #888; margin-bottom: 8px; }
        .rec-item {
            font-size: 12px;
            padding: 6px 0;
            color: #aaa;
            border-bottom: 1px solid rgba(255,255,255,0.03);
        }
        .rec-item:last-child { border-bottom: none; }
        .footer {
            text-align: center;
            padding: 40px 20px 20px;
            color: #555;
            font-size: 12px;
        }
        .footer a { color: #3b82f6; text-decoration: none; }
    </style>
</head>
<body>
    <div class="header">
        <h1>📊 GitHub Repository Health Dashboard</h1>
        <p>Comprehensive health analysis of ${results.length} repositor${results.length === 1 ? 'y' : 'ies'}</p>
        <div class="stats-bar">
            <div class="stat">
                <div class="stat-value">${results.length}</div>
                <div class="stat-label">Repositories</div>
            </div>
            <div class="stat">
                <div class="stat-value">${avgScore}</div>
                <div class="stat-label">Avg Score</div>
            </div>
            <div class="stat">
                <div class="stat-value">${healthyCount}</div>
                <div class="stat-label">Healthy (A/A+)</div>
            </div>
            <div class="stat">
                <div class="stat-value">${totalTips}</div>
                <div class="stat-label">Total Tips</div>
            </div>
        </div>
    </div>
    <div class="cards-grid">
        ${cards}
    </div>
    <div class="footer">
        Generated by <a href="https://apify.com/actor/github-health-analyzer" target="_blank">GitHub Repository Health Analyzer</a>
    </div>
</body>
</html>`;
}

function generateResultCard(r) {
    const scoreClass = r.health_score >= 80 ? 'high' : r.health_score >= 50 ? 'medium' : 'low';
    const riskClass = r.health_score >= 80 ? 'risk-low' : r.health_score >= 50 ? 'risk-medium' : 'risk-high';

    let recsHtml = '';
    if (r.recommendations && r.recommendations.length > 0) {
        const recItems = r.recommendations.slice(0, 3).map(rec =>
            `<div class="rec-item">${rec.priority} [${rec.category}] ${rec.issue}</div>`
        ).join('');
        recsHtml = `
            <div class="recommendations-section">
                <div class="rec-title">💡 Top Recommendations (${r.recommendation_count})</div>
                ${recItems}
            </div>`;
    }

    return `
        <div class="card">
            <div class="card-header">
                <div class="score-circle ${scoreClass}">
                    <div class="score-number">${r.health_score}</div>
                    <div class="score-grade">${r.health_grade}</div>
                </div>
                <div class="card-title">
                    <h3>${r.repo_name}</h3>
                    <a href="${r.repo_url}" target="_blank">${r.repo_url}</a>
                </div>
            </div>
            <div class="card-body">
                <div class="pillars-grid">
                    <div class="pillar-item">
                        <span class="pillar-name">📖 Readability</span>
                        <span class="pillar-score">${r.readability_score}/100</span>
                    </div>
                    <div class="pillar-item">
                        <span class="pillar-name">🧱 Stability</span>
                        <span class="pillar-score">${r.stability_score}/100</span>
                    </div>
                    <div class="pillar-item">
                        <span class="pillar-name">🔐 Security</span>
                        <span class="pillar-score">${r.security_score}/100</span>
                    </div>
                    <div class="pillar-item">
                        <span class="pillar-name">👥 Community</span>
                        <span class="pillar-score">${r.community_score}/100</span>
                    </div>
                    <div class="pillar-item">
                        <span class="pillar-name">🛠️ Maintain</span>
                        <span class="pillar-score">${r.maintainability_score}/100</span>
                    </div>
                    <div class="pillar-item">
                        <span class="pillar-name">📝 Docs</span>
                        <span class="pillar-score">${r.documentation_score}/100</span>
                    </div>
                    <div class="pillar-item">
                        <span class="pillar-name">🤖 Automation</span>
                        <span class="pillar-score">${r.automation_score}/100</span>
                    </div>
                    <div class="pillar-item">
                        <span class="pillar-name">⭐ Stars</span>
                        <span class="pillar-score">${(r.stars || 0).toLocaleString()}</span>
                    </div>
                </div>
                ${recsHtml}
            </div>
            <div class="card-footer">
                <span class="risk-badge ${riskClass}">${r.risk_level}</span>
                <span class="meta-info">Last active: ${r.last_commit}</span>
            </div>
        </div>`;
}
