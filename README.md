# GitHub Repository Health Analyzer 🏥

> **The "Credit Score" for Code** - Audit any GitHub repository and get a comprehensive Health Score (0-100)

[![Apify Actor](https://img.shields.io/badge/Apify-Actor-blue?style=for-the-badge)](https://apify.com)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=for-the-badge)](https://nodejs.org)

## 🎯 What Does This Actor Do?

This Actor analyzes GitHub repositories and generates a **Health Score (0-100)** based on five key pillars:

| Pillar | Weight | What It Measures |
|--------|--------|------------------|
| 📖 **Readability** | 25% | README quality, documentation, description |
| 🧱 **Stability** | 20% | Releases, CI/CD, recent activity |
| 🔐 **Security** | 20% | License risk, SECURITY.md, Dependabot |
| 👥 **Community** | 15% | Stars, issue management, contribution guidelines |
| 🛠️ **Maintainability** | 20% | Tests, linter configuration |

## 🚀 Use Cases

- **Developers**: Check library safety before `npm install`
- **CTOs/Agencies**: Audit contractor code quality
- **Recruiters**: Analyze candidate GitHub portfolios in seconds
- **Open Source Maintainers**: Track your project's health over time

## 📥 Input

The Actor accepts flexible input - either single repositories or entire user profiles:

### Input Options

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| `startUrls` | Array | GitHub repo URLs or user profile URLs | Required |
| `maxReposPerUser` | Integer | Max repos to scan per user | 10 |
| `githubToken` | String | Optional PAT for higher rate limits | null |
| `minHealthScore` | Integer | Filter results above this score | 0 |

### Example Input

```json
{
  "startUrls": [
    { "url": "https://github.com/facebook/react" },
    { "url": "https://github.com/apify" }
  ],
  "maxReposPerUser": 5,
  "minHealthScore": 50
}
```

### Input Modes

1. **Direct Mode**: Provide a repository URL to scan a single repo
   - Example: `https://github.com/vercel/next.js`

2. **Profile Mode**: Provide a user/org URL to scan all their repos
   - Example: `https://github.com/apify`

## 📤 Output

Results are displayed in a beautiful **tabbed dashboard**:

### 🏆 Overview Tab
- Repository name and URL
- Health Score (0-100) with letter grade (A+ to F)
- Risk level indicator
- Stars count
- Last activity date
- **Viral Badge** for your README!

### 🔐 Security Tab
- License type and risk assessment
- SECURITY.md presence
- Dependabot configuration

### 👥 Community Tab
- Stars, forks, watchers
- Issue close ratio
- CONTRIBUTING.md presence

### 📊 Detailed Scores Tab
- Breakdown by each pillar

### Example Output Record

```json
{
  "repo_name": "facebook/react",
  "repo_url": "https://github.com/facebook/react",
  "health_score": 92,
  "health_grade": "A+",
  "risk_level": "🟢 Low Risk",
  "badge_url": "https://img.shields.io/badge/Health-A%2B%20(92%25)-brightgreen?style=for-the-badge",
  "badge_markdown": "[![Health: A+](https://img.shields.io/badge/Health-A%2B%20(92%25)-brightgreen?style=for-the-badge)](https://github.com/facebook/react)",
  "stars": 220000,
  "license_type": "MIT License",
  "license_risk": "🟢 Low (Permissive)",
  "readability_score": 95,
  "stability_score": 90,
  "security_score": 85,
  "community_score": 100,
  "maintainability_score": 90
}
```

## 🏅 Viral Badge Feature

Every scan generates a dynamic badge you can paste into your README:

```markdown
[![Health: A+](https://img.shields.io/badge/Health-A%2B%20(92%25)-brightgreen?style=for-the-badge)](https://github.com/your/repo)
```

**Result:**

![Health: A+](https://img.shields.io/badge/Health-A%2B%20(92%25)-brightgreen?style=for-the-badge)

## ⚡ API Rate Limits

| Mode | Rate Limit | Best For |
|------|------------|----------|
| **Unauthenticated** | 60 requests/hour | Quick single-repo scans |
| **With Token** | 5,000 requests/hour | Bulk scans, user profiles |

To increase rate limits, provide a [GitHub Personal Access Token](https://github.com/settings/tokens) in the `githubToken` input field.

## 📊 Health Score Grading

| Score | Grade | Risk Level |
|-------|-------|------------|
| 90-100 | A+ | 🟢 Low |
| 80-89 | A | 🟢 Low |
| 70-79 | B | 🟡 Medium |
| 60-69 | C | 🟡 Medium |
| 50-59 | D | 🟡 Medium |
| 0-49 | F | 🔴 High |

## 🔧 Technical Details

- **Runtime**: Node.js 20
- **Dependencies**: Apify SDK, Crawlee, Octokit
- **Data per run**: 1 request per repository analyzed

## 💡 Tips

1. **Start with popular repos** to understand the scoring system
2. **Use the `minHealthScore` filter** to focus on quality repos
3. **Provide a GitHub token** for bulk scanning
4. **Add the badge to your README** to showcase your project's health!

## 🆘 Support

If you encounter any issues or have suggestions, please open an issue on the Actor's page.

---

Made with ❤️ for the Apify community
