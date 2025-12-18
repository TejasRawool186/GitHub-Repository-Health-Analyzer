/**
 * Premium Dashboard Generator
 * Creates an interactive, beautiful HTML dashboard with top-notch UI/UX
 */

/**
 * Generate premium combined dashboard HTML for all results
 */
export function generateCombinedDashboard(results) {
    const avgScore = Math.round(results.reduce((a, r) => a + r.health_score, 0) / results.length);
    const healthyCount = results.filter(r => r.health_score >= 80).length;
    const totalTips = results.reduce((a, r) => a + (r.recommendation_count || 0), 0);
    const totalStars = results.reduce((a, r) => a + (r.stars || 0), 0);

    const cards = results.map(r => generatePremiumCard(r)).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Health Dashboard - ${results.length} Repositories</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #12121a;
            --bg-card: #1a1a25;
            --bg-hover: #222233;
            --text-primary: #ffffff;
            --text-secondary: #a0a0b0;
            --text-muted: #666680;
            --accent-green: #22c55e;
            --accent-yellow: #eab308;
            --accent-red: #ef4444;
            --accent-blue: #3b82f6;
            --accent-purple: #8b5cf6;
            --gradient-primary: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
            --gradient-success: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
            --gradient-warning: linear-gradient(135deg, #eab308 0%, #ca8a04 100%);
            --gradient-danger: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            --shadow-glow: 0 0 40px rgba(59, 130, 246, 0.15);
            --border-color: rgba(255, 255, 255, 0.06);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body { 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: var(--bg-primary);
            min-height: 100vh;
            color: var(--text-primary);
            line-height: 1.6;
        }

        /* Animated Background */
        .bg-gradient {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: 
                radial-gradient(ellipse at 20% 20%, rgba(59, 130, 246, 0.08) 0%, transparent 50%),
                radial-gradient(ellipse at 80% 80%, rgba(139, 92, 246, 0.08) 0%, transparent 50%),
                radial-gradient(ellipse at 50% 50%, rgba(34, 197, 94, 0.03) 0%, transparent 70%);
            pointer-events: none;
            z-index: 0;
        }

        .container {
            position: relative;
            z-index: 1;
            max-width: 1400px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        /* Header */
        .header {
            text-align: center;
            margin-bottom: 50px;
        }

        .logo {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
        }

        .logo-icon {
            width: 48px;
            height: 48px;
            background: var(--gradient-primary);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            box-shadow: var(--shadow-glow);
        }

        h1 {
            font-size: 36px;
            font-weight: 800;
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .subtitle {
            color: var(--text-secondary);
            font-size: 16px;
            margin-top: 8px;
        }

        /* Stats Grid */
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 50px;
        }

        .stat-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            transition: all 0.3s ease;
        }

        .stat-card:hover {
            transform: translateY(-4px);
            border-color: rgba(59, 130, 246, 0.3);
            box-shadow: var(--shadow-glow);
        }

        .stat-icon {
            font-size: 28px;
            margin-bottom: 8px;
        }

        .stat-value {
            font-size: 36px;
            font-weight: 800;
            background: var(--gradient-primary);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .stat-label {
            font-size: 14px;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-top: 4px;
        }

        /* Repository Cards */
        .cards-container {
            display: flex;
            flex-direction: column;
            gap: 24px;
        }

        .repo-card {
            background: var(--bg-card);
            border: 1px solid var(--border-color);
            border-radius: 20px;
            overflow: hidden;
            transition: all 0.3s ease;
        }

        .repo-card:hover {
            border-color: rgba(59, 130, 246, 0.3);
            box-shadow: var(--shadow-glow);
        }

        /* Card Header */
        .card-header {
            padding: 24px;
            display: flex;
            align-items: center;
            gap: 20px;
            background: linear-gradient(to right, rgba(59, 130, 246, 0.05), transparent);
            border-bottom: 1px solid var(--border-color);
        }

        .score-ring {
            position: relative;
            width: 100px;
            height: 100px;
            flex-shrink: 0;
        }

        .score-ring svg {
            transform: rotate(-90deg);
        }

        .score-ring .bg {
            fill: none;
            stroke: rgba(255, 255, 255, 0.1);
            stroke-width: 8;
        }

        .score-ring .progress {
            fill: none;
            stroke-width: 8;
            stroke-linecap: round;
            transition: stroke-dashoffset 1s ease;
        }

        .score-ring .score-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
        }

        .score-number {
            font-size: 28px;
            font-weight: 800;
        }

        .score-grade {
            font-size: 14px;
            color: var(--text-secondary);
        }

        .repo-info {
            flex: 1;
        }

        .repo-name {
            font-size: 22px;
            font-weight: 700;
            margin-bottom: 4px;
        }

        .repo-link {
            color: var(--accent-blue);
            text-decoration: none;
            font-size: 14px;
        }

        .repo-link:hover {
            text-decoration: underline;
        }

        .repo-meta {
            display: flex;
            gap: 16px;
            margin-top: 12px;
            flex-wrap: wrap;
        }

        .meta-item {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 14px;
            color: var(--text-secondary);
        }

        .risk-badge {
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
        }

        .risk-low { background: rgba(34, 197, 94, 0.15); color: var(--accent-green); }
        .risk-medium { background: rgba(234, 179, 8, 0.15); color: var(--accent-yellow); }
        .risk-high { background: rgba(239, 68, 68, 0.15); color: var(--accent-red); }

        /* Card Body */
        .card-body {
            padding: 24px;
        }

        .section-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-secondary);
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 16px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        /* Pillars Grid */
        .pillars-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 12px;
            margin-bottom: 24px;
        }

        .pillar-item {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 16px;
            transition: all 0.2s ease;
        }

        .pillar-item:hover {
            background: var(--bg-hover);
            transform: translateY(-2px);
        }

        .pillar-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .pillar-name {
            font-size: 13px;
            color: var(--text-secondary);
        }

        .pillar-score {
            font-size: 18px;
            font-weight: 700;
        }

        .pillar-bar {
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 3px;
            overflow: hidden;
        }

        .pillar-fill {
            height: 100%;
            border-radius: 3px;
            transition: width 1s ease;
        }

        /* Details Grid */
        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 16px;
            margin-bottom: 24px;
        }

        .detail-section {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 20px;
        }

        .detail-title {
            font-size: 15px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .detail-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid var(--border-color);
        }

        .detail-row:last-child {
            border-bottom: none;
        }

        .detail-label {
            color: var(--text-muted);
            font-size: 14px;
        }

        .detail-value {
            font-weight: 500;
            font-size: 14px;
        }

        .check-yes { color: var(--accent-green); }
        .check-no { color: var(--accent-red); }

        /* Recommendations */
        .recommendations-section {
            margin-top: 20px;
        }

        .rec-list {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .rec-item {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            padding: 20px;
            background: var(--bg-secondary);
            border-radius: 12px;
            border-left: 4px solid;
            transition: all 0.2s ease;
        }

        .rec-item:hover {
            background: var(--bg-hover);
            transform: translateX(4px);
        }

        .rec-item.critical { border-color: var(--accent-red); }
        .rec-item.medium { border-color: var(--accent-yellow); }
        .rec-item.nice { border-color: var(--accent-green); }

        .rec-number {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 16px;
            flex-shrink: 0;
        }

        .rec-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .rec-header {
            display: flex;
            align-items: center;
            gap: 12px;
            flex-wrap: wrap;
        }

        .rec-priority {
            font-size: 11px;
            font-weight: 700;
            padding: 5px 12px;
            border-radius: 6px;
            letter-spacing: 0.5px;
        }

        .rec-priority.critical { background: rgba(239, 68, 68, 0.15); color: var(--accent-red); }
        .rec-priority.medium { background: rgba(234, 179, 8, 0.15); color: var(--accent-yellow); }
        .rec-priority.nice { background: rgba(34, 197, 94, 0.15); color: var(--accent-green); }

        .rec-category {
            font-size: 12px;
            color: var(--text-muted);
            background: rgba(255, 255, 255, 0.05);
            padding: 4px 10px;
            border-radius: 6px;
        }

        .rec-issue {
            font-size: 15px;
            line-height: 1.5;
        }

        .rec-issue strong {
            color: var(--text-primary);
        }

        .rec-action {
            font-size: 14px;
            color: var(--text-secondary);
            line-height: 1.5;
            padding-left: 16px;
            border-left: 2px solid rgba(255, 255, 255, 0.1);
        }

        .rec-action strong {
            color: var(--accent-blue);
        }

        .rec-impact {
            font-size: 13px;
            color: var(--text-muted);
            font-style: italic;
        }

        .rec-impact strong {
            font-style: normal;
            color: var(--text-secondary);
        }

        .rec-empty {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: 24px;
            background: rgba(34, 197, 94, 0.1);
            border-radius: 12px;
            border: 1px solid rgba(34, 197, 94, 0.2);
        }

        .rec-empty-icon {
            font-size: 48px;
        }

        .rec-empty-text {
            flex: 1;
        }

        .rec-empty-text strong {
            font-size: 18px;
            color: var(--accent-green);
        }

        .rec-empty-text p {
            color: var(--text-secondary);
            margin-top: 4px;
        }

        /* Badge Section */
        .badge-section {
            margin-top: 24px;
            padding: 20px;
            background: linear-gradient(to right, rgba(59, 130, 246, 0.05), rgba(139, 92, 246, 0.05));
            border-radius: 12px;
            display: flex;
            align-items: center;
            gap: 16px;
            flex-wrap: wrap;
        }

        .badge-img {
            height: 32px;
            border-radius: 4px;
        }

        .badge-markdown {
            flex: 1;
            font-family: 'Monaco', 'Consolas', monospace;
            font-size: 12px;
            background: var(--bg-secondary);
            padding: 10px 14px;
            border-radius: 8px;
            color: var(--text-secondary);
            word-break: break-all;
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 40px 20px;
            color: var(--text-muted);
            font-size: 13px;
        }

        .footer a {
            color: var(--accent-blue);
            text-decoration: none;
        }

        /* Animations */
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .stat-card, .repo-card {
            animation: fadeInUp 0.6s ease forwards;
        }

        .stat-card:nth-child(1) { animation-delay: 0.1s; }
        .stat-card:nth-child(2) { animation-delay: 0.2s; }
        .stat-card:nth-child(3) { animation-delay: 0.3s; }
        .stat-card:nth-child(4) { animation-delay: 0.4s; }
        .stat-card:nth-child(5) { animation-delay: 0.5s; }

        .repo-card { animation-delay: 0.3s; }

        /* Responsive */
        @media (max-width: 768px) {
            h1 { font-size: 28px; }
            .card-header { flex-direction: column; text-align: center; }
            .score-ring { margin-bottom: 16px; }
            .repo-meta { justify-content: center; }
        }
    </style>
</head>
<body>
    <div class="bg-gradient"></div>
    
    <div class="container">
        <header class="header">
            <div class="logo">
                <div class="logo-icon">📊</div>
            </div>
            <h1>GitHub Repository Health Dashboard</h1>
            <p class="subtitle">Comprehensive analysis of ${results.length} repositor${results.length === 1 ? 'y' : 'ies'} • ${new Date().toLocaleDateString()}</p>
        </header>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon">📦</div>
                <div class="stat-value">${results.length}</div>
                <div class="stat-label">Repositories</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">📈</div>
                <div class="stat-value">${avgScore}</div>
                <div class="stat-label">Avg Score</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">✅</div>
                <div class="stat-value">${healthyCount}</div>
                <div class="stat-label">Healthy (A+/A)</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">💡</div>
                <div class="stat-value">${totalTips}</div>
                <div class="stat-label">Total Tips</div>
            </div>
            <div class="stat-card">
                <div class="stat-icon">⭐</div>
                <div class="stat-value">${totalStars.toLocaleString()}</div>
                <div class="stat-label">Total Stars</div>
            </div>
        </div>

        <div class="cards-container">
            ${cards}
        </div>

        <footer class="footer">
            <p>Generated by <a href="https://apify.com" target="_blank">GitHub Repository Health Analyzer</a></p>
            <p style="margin-top: 8px;">Made with ❤️ for the Apify $1M Challenge</p>
        </footer>
    </div>
</body>
</html>`;
}

function generatePremiumCard(r) {
    const scoreColor = r.health_score >= 80 ? '#22c55e' : r.health_score >= 50 ? '#eab308' : '#ef4444';
    const riskClass = r.health_score >= 80 ? 'risk-low' : r.health_score >= 50 ? 'risk-medium' : 'risk-high';
    const circumference = 2 * Math.PI * 42;
    const progress = circumference - (r.health_score / 100) * circumference;

    const pillars = [
        { name: '📖 Readability', score: r.readability_score, weight: '15%' },
        { name: '🧱 Stability', score: r.stability_score, weight: '15%' },
        { name: '🔐 Security', score: r.security_score, weight: '15%' },
        { name: '👥 Community', score: r.community_score, weight: '10%' },
        { name: '🛠️ Maintainability', score: r.maintainability_score, weight: '15%' },
        { name: '📝 Documentation', score: r.documentation_score, weight: '15%' },
        { name: '🤖 Automation', score: r.automation_score, weight: '15%' },
    ];

    const pillarCards = pillars.map(p => {
        const color = p.score >= 80 ? '#22c55e' : p.score >= 50 ? '#eab308' : '#ef4444';
        return `
            <div class="pillar-item">
                <div class="pillar-header">
                    <span class="pillar-name">${p.name} (${p.weight})</span>
                    <span class="pillar-score" style="color: ${color}">${p.score}</span>
                </div>
                <div class="pillar-bar">
                    <div class="pillar-fill" style="width: ${p.score}%; background: ${color}"></div>
                </div>
            </div>
        `;
    }).join('');

    const recommendations = r.recommendations && r.recommendations.length > 0
        ? r.recommendations.map((rec, index) => {
            const priorityClass = rec.priority?.includes('Critical') ? 'critical' : rec.priority?.includes('Medium') ? 'medium' : 'nice';
            const priorityLabel = rec.priority?.includes('Critical') ? '🔴 CRITICAL' : rec.priority?.includes('Medium') ? '🟡 MEDIUM' : '🟢 NICE-TO-HAVE';
            const priorityDesc = rec.priority?.includes('Critical')
                ? 'Immediate action required - High impact on repository health'
                : rec.priority?.includes('Medium')
                    ? 'Recommended improvement - Moderate impact on score'
                    : 'Optional enhancement - Minor impact on score';

            return `
                <div class="rec-item ${priorityClass}">
                    <div class="rec-number">${index + 1}</div>
                    <div class="rec-content">
                        <div class="rec-header">
                            <span class="rec-priority ${priorityClass}">${priorityLabel}</span>
                            <span class="rec-category">${rec.category}</span>
                        </div>
                        <div class="rec-issue">
                            <strong>Issue:</strong> ${rec.issue}
                        </div>
                        <div class="rec-action">
                            <strong>Action:</strong> ${rec.action}
                        </div>
                        <div class="rec-impact">
                            <strong>Impact:</strong> ${priorityDesc}
                        </div>
                    </div>
                </div>
            `;
        }).join('')
        : '<div class="rec-empty"><span class="rec-empty-icon">🎉</span><div class="rec-empty-text"><strong>Excellent work!</strong><p>No recommendations - this repository follows all best practices.</p></div></div>';

    return `
        <div class="repo-card">
            <div class="card-header">
                <div class="score-ring">
                    <svg width="100" height="100" viewBox="0 0 100 100">
                        <circle class="bg" cx="50" cy="50" r="42"/>
                        <circle class="progress" cx="50" cy="50" r="42" 
                            stroke="${scoreColor}" 
                            stroke-dasharray="${circumference}" 
                            stroke-dashoffset="${progress}"/>
                    </svg>
                    <div class="score-text">
                        <div class="score-number" style="color: ${scoreColor}">${r.health_score}</div>
                        <div class="score-grade">${r.health_grade}</div>
                    </div>
                </div>
                
                <div class="repo-info">
                    <h2 class="repo-name">${r.repo_name}</h2>
                    <a href="${r.repo_url}" target="_blank" class="repo-link">${r.repo_url}</a>
                    <div class="repo-meta">
                        <span class="meta-item">⭐ ${(r.stars || 0).toLocaleString()} stars</span>
                        <span class="meta-item">🍴 ${(r.forks || 0).toLocaleString()} forks</span>
                        <span class="meta-item">📅 ${r.last_commit || 'Unknown'}</span>
                        <span class="risk-badge ${riskClass}">${r.risk_level}</span>
                    </div>
                </div>
            </div>

            <div class="card-body">
                <h3 class="section-title">📊 Pillar Scores</h3>
                <div class="pillars-grid">
                    ${pillarCards}
                </div>

                <div class="details-grid">
                    <div class="detail-section">
                        <h4 class="detail-title">🔐 Security & License</h4>
                        <div class="detail-row">
                            <span class="detail-label">License</span>
                            <span class="detail-value">${r.license_type || 'Unknown'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">License Risk</span>
                            <span class="detail-value">${r.license_risk || 'Unknown'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">SECURITY.md</span>
                            <span class="detail-value ${r.has_security_md?.includes('✅') ? 'check-yes' : 'check-no'}">${r.has_security_md}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Dependabot</span>
                            <span class="detail-value ${r.dependabot_enabled?.includes('✅') ? 'check-yes' : 'check-no'}">${r.dependabot_enabled}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4 class="detail-title">📝 Documentation</h4>
                        <div class="detail-row">
                            <span class="detail-label">docs/ Folder</span>
                            <span class="detail-value ${r.has_docs_folder?.includes('✅') ? 'check-yes' : 'check-no'}">${r.has_docs_folder || '❌ No'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">CHANGELOG</span>
                            <span class="detail-value ${r.has_changelog?.includes('✅') ? 'check-yes' : 'check-no'}">${r.has_changelog || '❌ No'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Examples</span>
                            <span class="detail-value ${r.has_examples?.includes('✅') ? 'check-yes' : 'check-no'}">${r.has_examples || '❌ No'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Wiki</span>
                            <span class="detail-value ${r.has_wiki?.includes('✅') ? 'check-yes' : 'check-no'}">${r.has_wiki || '❌ No'}</span>
                        </div>
                    </div>

                    <div class="detail-section">
                        <h4 class="detail-title">🤖 Automation & DevOps</h4>
                        <div class="detail-row">
                            <span class="detail-label">CI Workflows</span>
                            <span class="detail-value">${r.workflow_count || 0}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">PR Template</span>
                            <span class="detail-value ${r.has_pr_template?.includes('✅') ? 'check-yes' : 'check-no'}">${r.has_pr_template || '❌ No'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Issue Templates</span>
                            <span class="detail-value ${r.has_issue_template?.includes('✅') ? 'check-yes' : 'check-no'}">${r.has_issue_template || '❌ No'}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Code of Conduct</span>
                            <span class="detail-value ${r.has_code_of_conduct?.includes('✅') ? 'check-yes' : 'check-no'}">${r.has_code_of_conduct || '❌ No'}</span>
                        </div>
                    </div>
                </div>

                <div class="recommendations-section">
                    <h3 class="section-title">💡 Recommendations (${r.recommendation_count || 0})</h3>
                    <div class="rec-list">
                        ${recommendations}
                    </div>
                </div>

                <div class="badge-section">
                    <img src="${r.badge_url}" alt="Health Badge" class="badge-img">
                    <div class="badge-markdown">${r.badge_markdown || ''}</div>
                </div>
            </div>
        </div>
    `;
}
