/**
 * HTML Report Generator
 * Creates a beautiful vertical dashboard-style HTML report
 */

/**
 * Generate a premium HTML summary report card
 * @param {Object} result - The analysis result object
 * @returns {string} HTML report string
 */
export function generateHtmlReport(result) {
    const scoreColor = result.health_score >= 80 ? '#22c55e' :
        result.health_score >= 50 ? '#eab308' : '#ef4444';

    const gradeColor = result.health_grade.startsWith('A') ? '#22c55e' :
        result.health_grade === 'B' ? '#84cc16' :
            result.health_grade === 'C' ? '#eab308' : '#ef4444';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Health Report: ${result.repo_name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            padding: 20px;
            color: #e5e5e5;
        }
        .container { max-width: 800px; margin: 0 auto; }
        .header {
            text-align: center;
            padding: 30px;
            background: rgba(255,255,255,0.05);
            border-radius: 20px;
            margin-bottom: 20px;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .repo-name { 
            font-size: 28px; 
            font-weight: 700; 
            margin-bottom: 10px;
            color: #fff;
        }
        .score-circle {
            width: 120px;
            height: 120px;
            border-radius: 50%;
            background: ${scoreColor};
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            margin: 20px auto;
            box-shadow: 0 0 30px ${scoreColor}40;
        }
        .score-number { font-size: 42px; font-weight: 800; color: #fff; }
        .score-grade { font-size: 18px; font-weight: 600; color: rgba(255,255,255,0.9); }
        .risk-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 20px;
            background: ${scoreColor}30;
            color: ${scoreColor};
            font-weight: 600;
            margin-top: 10px;
        }
        .section {
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            margin-bottom: 16px;
            overflow: hidden;
            border: 1px solid rgba(255,255,255,0.1);
        }
        .section-title {
            background: rgba(255,255,255,0.05);
            padding: 16px 20px;
            font-size: 18px;
            font-weight: 600;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .section-content { padding: 0; }
        .row {
            display: flex;
            justify-content: space-between;
            padding: 14px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .row:last-child { border-bottom: none; }
        .row-label { color: #a8a8a8; }
        .row-value { font-weight: 600; color: #fff; }
        .score-bar {
            width: 60px;
            height: 8px;
            background: rgba(255,255,255,0.1);
            border-radius: 4px;
            overflow: hidden;
            display: inline-block;
            margin-right: 10px;
            vertical-align: middle;
        }
        .score-fill {
            height: 100%;
            border-radius: 4px;
        }
        .check-yes { color: #22c55e; }
        .check-no { color: #ef4444; }
        .badge-img { height: 28px; margin-top: 10px; }
        .recommendations {
            background: linear-gradient(135deg, #1e3a5f 0%, #1a2744 100%);
        }
        .rec-item {
            padding: 14px 20px;
            border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .rec-item:last-child { border-bottom: none; }
        .rec-priority { 
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
        }
        .priority-critical { background: #ef444430; color: #ef4444; }
        .priority-medium { background: #eab30830; color: #eab308; }
        .priority-nice { background: #22c55e30; color: #22c55e; }
        .rec-text { color: #e5e5e5; }
        .footer {
            text-align: center;
            padding: 20px;
            color: #666;
            font-size: 12px;
        }
        .footer a { color: #3b82f6; text-decoration: none; }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header with Score -->
        <div class="header">
            <div class="repo-name">📊 ${result.repo_name}</div>
            <a href="${result.repo_url}" target="_blank" style="color: #3b82f6; font-size: 14px;">${result.repo_url}</a>
            <div class="score-circle">
                <div class="score-number">${result.health_score}</div>
                <div class="score-grade">${result.health_grade}</div>
            </div>
            <div class="risk-badge">${result.risk_level}</div>
            <div><img src="${result.badge_url}" alt="Health Badge" class="badge-img"></div>
        </div>

        <!-- Pillar Scores -->
        <div class="section">
            <div class="section-title">📊 Pillar Scores</div>
            <div class="section-content">
                ${generatePillarRow('📖 Readability', result.readability_score, '15%')}
                ${generatePillarRow('🧱 Stability', result.stability_score, '15%')}
                ${generatePillarRow('🔐 Security', result.security_score, '15%')}
                ${generatePillarRow('👥 Community', result.community_score, '10%')}
                ${generatePillarRow('🛠️ Maintainability', result.maintainability_score, '15%')}
                ${generatePillarRow('📝 Documentation', result.documentation_score, '15%')}
                ${generatePillarRow('🤖 Automation', result.automation_score, '15%')}
            </div>
        </div>

        <!-- Security & License -->
        <div class="section">
            <div class="section-title">🔐 Security & License</div>
            <div class="section-content">
                ${generateRow('License', result.license_type)}
                ${generateRow('License Risk', result.license_risk)}
                ${generateCheckRow('SECURITY.md', result.has_security_md)}
                ${generateCheckRow('Dependabot', result.dependabot_enabled)}
            </div>
        </div>

        <!-- Documentation -->
        <div class="section">
            <div class="section-title">📝 Documentation</div>
            <div class="section-content">
                ${generateCheckRow('docs/ Folder', result.has_docs_folder)}
                ${generateCheckRow('CHANGELOG', result.has_changelog)}
                ${generateCheckRow('Examples', result.has_examples)}
                ${generateCheckRow('Wiki', result.has_wiki)}
            </div>
        </div>

        <!-- Automation -->
        <div class="section">
            <div class="section-title">🤖 Automation</div>
            <div class="section-content">
                ${generateRow('CI Workflows', result.workflow_count)}
                ${generateCheckRow('PR Template', result.has_pr_template)}
                ${generateCheckRow('Issue Templates', result.has_issue_template)}
                ${generateCheckRow('Code of Conduct', result.has_code_of_conduct)}
            </div>
        </div>

        <!-- Community -->
        <div class="section">
            <div class="section-title">👥 Community</div>
            <div class="section-content">
                ${generateRow('⭐ Stars', result.stars?.toLocaleString() || '0')}
                ${generateRow('🍴 Forks', result.forks?.toLocaleString() || '0')}
                ${generateRow('📋 Open Issues', result.open_issues)}
                ${generateRow('Issue Close Ratio', result.issue_close_ratio)}
                ${generateCheckRow('CONTRIBUTING.md', result.has_contributing_md)}
            </div>
        </div>

        <!-- Recommendations -->
        ${result.recommendations && result.recommendations.length > 0 ? `
        <div class="section recommendations">
            <div class="section-title">💡 Recommendations (${result.recommendation_count})</div>
            <div class="section-content">
                ${result.recommendations.slice(0, 8).map(rec => `
                    <div class="rec-item">
                        <span class="rec-priority ${getPriorityClass(rec.priority)}">${rec.priority}</span>
                        <span class="rec-text"><strong>[${rec.category}]</strong> ${rec.issue}</span>
                        <div style="margin-top: 6px; color: #888; font-size: 13px;">→ ${rec.action}</div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Footer -->
        <div class="footer">
            Analyzed on ${result.analyzed_at} | 
            <a href="https://apify.com/actor/github-health-analyzer">GitHub Repository Health Analyzer</a>
        </div>
    </div>
</body>
</html>`;
}

function generatePillarRow(label, score, weight) {
    const color = score >= 80 ? '#22c55e' : score >= 50 ? '#eab308' : '#ef4444';
    return `
        <div class="row">
            <span class="row-label">${label} (${weight})</span>
            <span class="row-value">
                <span class="score-bar"><span class="score-fill" style="width: ${score}%; background: ${color};"></span></span>
                ${score}/100
            </span>
        </div>`;
}

function generateRow(label, value) {
    return `
        <div class="row">
            <span class="row-label">${label}</span>
            <span class="row-value">${value}</span>
        </div>`;
}

function generateCheckRow(label, value) {
    const isYes = value?.includes('✅') || value === true;
    return `
        <div class="row">
            <span class="row-label">${label}</span>
            <span class="row-value ${isYes ? 'check-yes' : 'check-no'}">${isYes ? '✅ Yes' : '❌ No'}</span>
        </div>`;
}

function getPriorityClass(priority) {
    if (priority?.includes('Critical')) return 'priority-critical';
    if (priority?.includes('Medium')) return 'priority-medium';
    return 'priority-nice';
}

/**
 * Generate markdown summary (vertical format)
 */
export function generateMarkdownSummary(result) {
    return `
# 📊 Health Report: ${result.repo_name}

## Overall Score: ${result.health_score}/100 (${result.health_grade})
${result.risk_level}

---

## 📊 Pillar Scores

| Pillar | Score |
|--------|-------|
| 📖 Readability (15%) | ${result.readability_score}/100 |
| 🧱 Stability (15%) | ${result.stability_score}/100 |
| 🔐 Security (15%) | ${result.security_score}/100 |
| 👥 Community (10%) | ${result.community_score}/100 |
| 🛠️ Maintainability (15%) | ${result.maintainability_score}/100 |
| 📝 Documentation (15%) | ${result.documentation_score}/100 |
| 🤖 Automation (15%) | ${result.automation_score}/100 |

---

## 🔐 Security & License

| Check | Status |
|-------|--------|
| License | ${result.license_type} |
| License Risk | ${result.license_risk} |
| SECURITY.md | ${result.has_security_md} |
| Dependabot | ${result.dependabot_enabled} |

---

## 📝 Documentation

| Check | Status |
|-------|--------|
| docs/ Folder | ${result.has_docs_folder} |
| CHANGELOG | ${result.has_changelog} |
| Examples | ${result.has_examples} |
| Wiki | ${result.has_wiki} |

---

## 🤖 Automation

| Check | Status |
|-------|--------|
| CI Workflows | ${result.workflow_count} |
| PR Template | ${result.has_pr_template} |
| Issue Templates | ${result.has_issue_template} |
| Code of Conduct | ${result.has_code_of_conduct} |

---

## 👥 Community

| Metric | Value |
|--------|-------|
| ⭐ Stars | ${result.stars?.toLocaleString() || 0} |
| 🍴 Forks | ${result.forks?.toLocaleString() || 0} |
| Open Issues | ${result.open_issues} |
| Close Ratio | ${result.issue_close_ratio} |
| CONTRIBUTING.md | ${result.has_contributing_md} |

---

## 💡 Top Recommendations

${result.recommendations?.slice(0, 5).map((r, i) =>
        `${i + 1}. ${r.priority} **[${r.category}]** ${r.issue}\n   → ${r.action}`
    ).join('\n\n') || 'No recommendations'}

---

![Health Badge](${result.badge_url})

*Analyzed on ${result.analyzed_at}*
`;
}
