# GitHub Repository Health Analyzer & Intelligence Platform

Audit any GitHub repository or organization profile and get an instant Health Score (0-100), automated engineering analytics, 10-category technology detection, interactive architecture diagrams, CycloneDX/SPDX SBOM generation, Bus Factor metrics, and visual fintech dashboards.

[![Apify Actor](https://img.shields.io/badge/Apify-Actor-blue?style=for-the-badge)](https://apify.com)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green?style=for-the-badge)](https://nodejs.org)
[![Analysis](https://img.shields.io/badge/Analysis-20%20Intelligence%20Features-purple?style=for-the-badge)](https://github.com)
[![SBOM](https://img.shields.io/badge/SBOM-CycloneDX%20%7C%20SPDX-blueviolet?style=for-the-badge)](https://cyclonedx.org)
[![Scoring](https://img.shields.io/badge/Scoring-7%20Pillars-brightgreen?style=for-the-badge)](https://shields.io)

---

## What Does GitHub Repository Health Analyzer Do?

The **GitHub Repository Health Analyzer** is an enterprise-grade repository intelligence and code audit platform on Apify. It deterministically analyzes GitHub repositories using the GitHub REST API, Git Trees API, dependency manifests, and static codebase inspection to produce a **comprehensive 0-100 Health Score across 7 pillars**, actionable remediation roadmaps, and **20 advanced repository intelligence dimensions**.

Every run automatically generates:
1. **Interactive Visual Dashboard**: A standalone single-page fintech dashboard (`#090A07` dark theme with neon lime accents) saved under Key-Value Store key `OUTPUT` with 21 navigable sections.
2. **Software Bill of Materials (SBOM)**: CycloneDX 1.5 JSON and SPDX 2.3 JSON component inventories downloadable from the dashboard or via API.
3. **Structured Apify Dataset**: Tabular results with 4 views (Overview, 7 Pillars, Security, Recommendations).
4. **Embeddable README Badges**: Dynamic vector badges (`[![Health: A](...)]`) to advertise project credibility.

---

## Why Use the GitHub Repository Intelligence Platform?

### Problem vs. Solution

| The Challenge | How This Actor Solves It |
|---|---|
| Evaluating third-party open-source libraries before `npm install` or `pip install` is tedious and subjective. | Calculates an objective, reproducible 0-100 Health Score and flags inactive maintainers, licensing risks, and broad version ranges. |
| CTOs and engineering managers lack visibility into contractor codebases and technical debt. | Generates architectural component diagrams, code complexity metrics, TODO counts, and test coverage indicators in seconds. |
| Compliance and security audits require manual inventory of packages and license obligations. | Automatically outputs CycloneDX and SPDX SBOMs and flags Copyleft GPL risks inside permissive projects. |
| Due diligence teams need to assess maintainer centralization and project abandonment risk. | Computes a statistical **Bus Factor Indicator** identifying if a single contributor controls over 50% of contributions. |
| Developer onboarding requires understanding repository structure and data flow without runtime tracing. | Automatically maps 10-category tech stacks, directory hierarchies, and 4 static data flow diagrams. |

---

## 20 Advanced Repository Intelligence Features

This Actor implements all 20 deterministic intelligence features without requiring AI APIs:

1. **Interactive Technology Stack Explorer**: Detects frontend frameworks, backend services, languages, databases, cloud, DevOps, AI/ML, test runners, build tools, and monitoring across 10 categories with official Simple Icons logos.
2. **Interactive System Architecture Diagram**: Deterministically maps client entries, frontend layers, API gateways, backend logic, databases, external services, and CI/CD pipelines with source file evidence.
3. **Data Flow Diagram Generator**: Constructs 4 static flow views (High-Level Data Lifecycle, Application Request Flow, Frontend-to-Backend API Flow, and Database Interaction Flow).
4. **Repository File Structure Visualizer**: Analyzes complete directory hierarchies, total file sizes, deepest directory nesting, extension breakdowns, and top 20 largest files.
5. **Programming Language Distribution Analytics**: Tracks exact byte counts and percentages from the GitHub Languages API alongside primary language indicators.
6. **Dependency Ecosystem & Package Analyzer**: Inspects npm, pnpm, yarn, pip, poetry, go, and cargo manifests; tracks direct vs transitive counts and unpinned/broad version ranges.
7. **GitHub Activity Timeline & Heatmap**: Computes commit velocity (commits/week), inactivity duration, and renders a 52-week rolling GitHub-style contribution heatmap.
8. **Contributor & Team Analytics (Bus Factor)**: Analyzes contributor rankings and calculates the statistical Bus Factor heuristic (contributors required for 50% of contributions).
9. **Release & Version Intelligence**: Audits release cadence, average days between deployments, semantic versioning tags, and release notes availability.
10. **Issues & Pull Request Intelligence**: Measures issue close ratio, PR merge velocity, average issue age, stale issues (>60d), and backlog aging distributions.
11. **Security Configuration Observatory**: Audits `SECURITY.md`, Dependabot, CodeQL SAST workflows, secret scanning, and third-party security actions (Trivy, Snyk, Gitleaks, OSV).
12. **License Compatibility & Compliance Matrix**: Classifies SPDX licenses into families (Permissive, Weak Copyleft, Strong Copyleft), flags policy conflicts, and audits attribution files.
13. **Repository Size & Code Complexity Observatory**: Measures estimated lines of code (LOC), directory nesting depth, complexity ratings, and counts TODO/FIXME/HACK debt markers.
14. **Repository Comparison & Benchmarking**: Compares multiple repositories side-by-side with 7-pillar radar charts, technology overlap matrices, and strengths/weaknesses.
15. **Ecosystem & Technology Relationship Map**: Maps multi-repository networks connected by shared programming languages, frameworks, and packages.
16. **Repository Evolution & Technical Debt Timeline**: Tracks inception, releases, commit milestones, and timestamped health snapshot deltas.
17. **SBOM Generator (Software Bill of Materials)**: Generates and exports CycloneDX 1.5 JSON and SPDX 2.3 JSON documents with Package URLs (PURL).
18. **Repository Portfolio Leaderboard**: Ranks scanned repositories and awards accolades (Highest Health Score, Best Maintained, Most Popular, Best Security).
19. **Reproducibility & Dev Environment Audit**: Checks runtime version files (`.nvmrc`, `.python-version`), lockfiles, Dockerfiles, devcontainers, and `.env.example`.
20. **Accessibility & Localization Readiness Audit**: Statically audits frontend repositories for a11y linters (`axe-core`, `eslint-plugin-jsx-a11y`) and internationalization frameworks (`i18next`, `next-intl`).

---

## 7-Pillar Health Scoring Formula

The overall Health Score (0-100) is calculated using a weighted average across 7 pillars:

| Pillar | Weight | Key Evaluation Criteria |
|---|---|---|
| **Readability** | 15% | README length, installation instructions, usage guidelines, repository description |
| **Stability** | 15% | Release tags, CI workflows, recent commit recency (within 30/180 days) |
| **Security** | 15% | Open-source license risk, `SECURITY.md` disclosure policy, Dependabot configuration |
| **Community** | 10% | Stars, closed issue ratio (>50%), `CONTRIBUTING.md` guidelines, subscribers |
| **Maintainability** | 15% | Test directory presence (`test/`, `spec/`), linter configuration (`.eslintrc`, `biome.json`, `pyproject.toml`) |
| **Documentation** | 15% | Dedicated `docs/` folder, `CHANGELOG.md` version notes, `examples/` directory, Wiki |
| **Automation** | 15% | Multiple CI workflows, PR templates, Issue templates, release automation configs |

### Grading Scale & Risk Levels
- **90 - 100**: Grade **A+** (Low Risk)
- **80 - 89**: Grade **A** (Low Risk)
- **70 - 79**: Grade **B** (Low Risk)
- **60 - 69**: Grade **C** (Medium Risk)
- **50 - 59**: Grade **D** (Medium Risk)
- **0 - 49**: Grade **F** (High Risk)

---

## How to Audit GitHub Repositories (Step-by-Step)

1. **Enter Repository or Profile URLs**: Paste one or more repository URLs (e.g. `https://github.com/facebook/react`) or a user/organization profile URL (e.g. `https://github.com/apify`).
2. **Add GitHub Token (Optional)**: Provide a Personal Access Token (PAT) to increase API rate limits from 60 to 5,000 requests/hour and scan private repositories.
3. **Configure Scan Depth**: Set maximum commits (default 50) and issues/PRs sample size (default 30).
4. **Click Start**: The Actor completes deterministic scanning in seconds.
5. **Inspect the Interactive Dashboard**: Click **Preview in new tab** or navigate to **Storage > Key-Value Store > OUTPUT** to view the interactive fintech report.
6. **Download SBOM or Dataset**: Export CycloneDX SBOM, SPDX SBOM, JSON, or CSV data.

---

## Input Configuration

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `startUrls` | Array | Yes | `[{"url": "https://github.com/apify/crawlee"}]` | List of GitHub repository URLs or user/org profile URLs. |
| `maxReposPerUser` | Integer | No | `10` | Maximum repositories to scan when a user profile URL is supplied (0 for unlimited). |
| `githubToken` | String | No | `null` | GitHub PAT to elevate rate limits from 60 to 5,000 requests/hour. |
| `minHealthScore` | Integer | No | `0` | Minimum score threshold (0-100) to output results. |
| `maxCommitHistory` | Integer | No | `50` | Maximum commits sampled for cadence, activity, and heatmaps. |
| `maxIssuesAndPrs` | Integer | No | `30` | Maximum issues and pull requests sampled for aging and merge analysis. |
| `proxyConfiguration` | Object | No | `{"useApifyProxy": false}` | Optional Apify Proxy configuration for high-volume enterprise crawls. |

### Example Input JSON

```json
{
  "startUrls": [
    { "url": "https://github.com/facebook/react" },
    { "url": "https://github.com/apify" }
  ],
  "maxReposPerUser": 5,
  "githubToken": "ghp_yourPersonalAccessTokenHere",
  "minHealthScore": 50,
  "maxCommitHistory": 50
}
```

---

## Output Data Structure

The Actor pushes comprehensive records to the default Apify Dataset. Below is a representative JSON output snippet:

```json
{
  "repo_name": "apify/crawlee",
  "repo_url": "https://github.com/apify/crawlee",
  "health_score": 92,
  "health_grade": "A+",
  "risk_level": "Low Risk",
  "stars": 16400,
  "forks": 1200,
  "last_commit": "2026-11-15",
  "license_type": "Apache License 2.0",
  "license_risk": "Low (Permissive)",
  "has_security_md": "Yes",
  "dependabot_enabled": "Yes",
  "workflow_count": 8,
  "readability_score": 95,
  "stability_score": 90,
  "security_score": 95,
  "community_score": 90,
  "maintainability_score": 90,
  "documentation_score": 90,
  "automation_score": 95,
  "recommendation_count": 2,
  "technology_stack": {
    "total_technologies": 16,
    "declared_count": 12,
    "inferred_count": 4
  },
  "security": {
    "security_readiness_score": 90,
    "has_security_md": true,
    "has_dependabot": true
  },
  "sbom": {
    "status": "completed",
    "total_components": 58
  }
}
```

---

## Runtime & Pricing Estimates

- **Execution Speed**: 2 - 5 seconds per repository.
- **Compute Unit (CU) Consumption**: ~0.0003 CU per single repository audit (~$0.001 per audit).
- **Free Tier Capacity**: The Apify free monthly tier ($5.00) enables auditing over **3,000 repositories** every month.
- **API Optimization**: Utilizes single recursive Git Trees API queries to retrieve complete file structures in one request, preserving your GitHub rate limit budget.

---

## Integrations (Make, Zapier, Webhooks, Python, Node.js)

### Python Integration
```python
from apify_client import ApifyClient

client = ApifyClient('YOUR_APIFY_TOKEN')
run = client.actor('your-username/github-health-analyzer').call(run_input={
    'startUrls': [{'url': 'https://github.com/facebook/react'}],
    'githubToken': 'YOUR_GITHUB_PAT'
})

for item in client.dataset(run['defaultDatasetId']).iterate_items():
    print(f"Repository: {item['repo_name']} | Health Score: {item['health_score']} ({item['health_grade']})")
```

### Node.js Integration
```javascript
import { ApifyClient } from 'apify-client';

const client = new ApifyClient({ token: 'YOUR_APIFY_TOKEN' });
const run = await client.actor('your-username/github-health-analyzer').call({
    startUrls: [{ url: 'https://github.com/facebook/react' }],
});

const { items } = await client.dataset(run.defaultDatasetId).listItems();
console.log(`Audited ${items[0].repo_name} - Score: ${items[0].health_score}`);
```

### Zapier & Make (Integromat)
- Connect Apify to Slack or Discord via Webhooks to alert your engineering team whenever a scanned repository's health score drops below 70.
- Trigger automatic audits on every new candidate GitHub profile submitted in Google Forms or Typeform.

### GitHub Actions CI/CD Pipeline
```yaml
name: Audit Third-Party Dependencies
on: [push]
jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Apify Health Analyzer
        run: |
          curl -X POST "https://api.apify.com/v2/acts/your-username~github-health-analyzer/runs?token=${{ secrets.APIFY_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{"startUrls": [{"url": "https://github.com/${{ github.repository }}"}]}'
```

---

## Disclaimers & Fair Use

This Actor performs read-only analysis of public repository metadata, file trees, and configuration files via GitHub's public REST API. It does not clone repository source trees to disk, execute untrusted scripts, or access private email addresses. Static security checks assess declared policies (`SECURITY.md`, CodeQL workflows, Dependabot) and do not substitute for formal manual penetration testing or dynamic vulnerability audits. License evaluations represent automated heuristic classifications and do not constitute legal counsel.
