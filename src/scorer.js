/**
 * Repository Health Scoring Engine
 * Implements the 7-Pillar weighted scoring algorithm + Recommendations
 * Optimized to reuse Git Tree and cached API data, eliminating redundant network calls.
 */

import { log } from 'apify';
import {
    getReadme,
    getWorkflows,
    getReleases,
    getTags,
    getIssueStats,
} from './github-client.js';

/**
 * License risk scoring
 */
const LICENSE_SCORES = {
    'mit': 100,
    'apache-2.0': 100,
    'bsd-2-clause': 100,
    'bsd-3-clause': 100,
    'isc': 100,
    'unlicense': 90,
    'cc0-1.0': 90,
    'wtfpl': 85,
    'lgpl-2.1': 70,
    'lgpl-3.0': 70,
    'mpl-2.0': 75,
    'gpl-2.0': 50,
    'gpl-3.0': 50,
    'agpl-3.0': 40,
    'other': 30,
    'none': 20,
};

const LINTER_FILENAMES = [
    '.eslintrc',
    '.eslintrc.js',
    '.eslintrc.json',
    '.eslintrc.yml',
    '.eslintrc.yaml',
    'eslint.config.js',
    'eslint.config.mjs',
    'eslint.config.ts',
    '.prettierrc',
    '.prettierrc.js',
    '.prettierrc.json',
    'biome.json',
    '.stylelintrc',
    'tslint.json',
    '.flake8',
    'pyproject.toml',
    'ruff.toml',
    '.golangci.yml',
    '.rustfmt.toml',
];

const TEST_DIR_PREFIXES = ['test', 'tests', '__tests__', 'spec', 'specs'];

function getLicenseRisk(licenseKey) {
    if (!licenseKey) {
        return { score: 20, risk: 'High (No License)' };
    }

    const key = licenseKey.toLowerCase();
    const score = LICENSE_SCORES[key] ?? 50;

    if (score >= 85) {
        return { score, risk: 'Low (Permissive)' };
    } else if (score >= 60) {
        return { score, risk: 'Medium (Copyleft)' };
    } else {
        return { score, risk: 'High (Restrictive)' };
    }
}

/**
 * Calculate Readability Score (15% weight)
 */
async function calculateReadabilityScore(octokit, owner, repo, repoData, cachedData = {}) {
    let score = 0;
    const details = {};

    const readme = cachedData.readme ?? (await getReadme(octokit, owner, repo));
    details.hasReadme = Boolean(readme && readme.exists);
    details.readmeLength = readme?.length || 0;

    if (details.hasReadme && readme.content) {
        score += 20;
        if (readme.length > 500) score += 10;
        if (readme.length > 2000) score += 10;

        const lowerContent = readme.content.toLowerCase();
        details.hasInstallation = lowerContent.includes('installation') || lowerContent.includes('install');
        details.hasUsage = lowerContent.includes('usage') || lowerContent.includes('getting started');

        if (details.hasInstallation) score += 15;
        if (details.hasUsage) score += 15;
    } else {
        details.hasInstallation = false;
        details.hasUsage = false;
    }

    details.hasDescription = Boolean(repoData.description && repoData.description.length > 10);
    if (details.hasDescription) score += 30;

    return { score: Math.min(score, 100), details };
}

/**
 * Calculate Stability Score (15% weight)
 */
async function calculateStabilityScore(octokit, owner, repo, repoData, cachedData = {}) {
    let score = 0;
    const details = {};

    const releases = cachedData.releases ?? (await getReleases(octokit, owner, repo));
    const tags = cachedData.tags ?? (await getTags(octokit, owner, repo));

    details.hasReleases = releases && releases.length > 0;
    details.releaseCount = releases ? releases.length : 0;
    details.hasTags = tags && tags.length > 0;
    details.tagCount = tags ? tags.length : 0;
    details.latestRelease = details.hasReleases ? (releases[0].tag_name || releases[0].name) : null;

    if (details.hasReleases || details.hasTags) {
        score += 25;
        if (details.releaseCount > 5 || details.tagCount > 5) score += 15;
    }

    const workflows = cachedData.workflows ?? (await getWorkflows(octokit, owner, repo));
    details.hasWorkflows = Boolean(workflows && workflows.exists);
    details.workflowCount = workflows ? workflows.count : 0;

    if (details.hasWorkflows) {
        score += 20;
        if (details.workflowCount > 1) score += 10;
    }

    const lastCommit = new Date(repoData.pushed_at);
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    details.lastCommit = repoData.pushed_at;
    details.isRecentlyActive = lastCommit > sixMonthsAgo;

    if (lastCommit > oneMonthAgo) {
        score += 30;
    } else if (lastCommit > sixMonthsAgo) {
        score += 20;
    } else {
        score += 5;
    }

    return { score: Math.min(score, 100), details };
}

/**
 * Calculate Security Score (15% weight)
 */
function calculateSecurityScore(repoData, pathsSet) {
    let score = 0;
    const details = {};

    const licenseKey = repoData.license?.spdx_id;
    const licenseRisk = getLicenseRisk(licenseKey);

    details.licenseType = repoData.license?.name || 'No License';
    details.licenseKey = licenseKey || 'none';
    details.licenseRisk = licenseRisk.risk;
    details.licenseScore = licenseRisk.score;

    score += Math.round(licenseRisk.score * 0.4);

    details.hasSecurityMd = Boolean(
        pathsSet.has('SECURITY.md') ||
        pathsSet.has('.github/SECURITY.md') ||
        pathsSet.has('docs/SECURITY.md')
    );

    details.hasDependabot = Boolean(
        pathsSet.has('.github/dependabot.yml') ||
        pathsSet.has('.github/dependabot.yaml')
    );

    if (details.hasSecurityMd) score += 30;
    if (details.hasDependabot) score += 30;

    return { score: Math.min(score, 100), details };
}

/**
 * Calculate Community Score (10% weight)
 */
function calculateCommunityScore(repoData, pathsSet, issueStats) {
    let score = 0;
    const details = {};

    details.stars = repoData.stargazers_count || 0;
    details.forks = repoData.forks_count || 0;
    details.subscribers = repoData.subscribers_count || 0;

    if (details.stars >= 1000) {
        score += 40;
    } else if (details.stars >= 100) {
        score += 30;
    } else if (details.stars >= 50) {
        score += 20;
    } else if (details.stars >= 10) {
        score += 10;
    }

    details.openIssues = issueStats.open || 0;
    details.closedIssues = issueStats.closed || 0;
    details.issueCloseRatio = issueStats.ratio || 0;

    if (issueStats.ratio >= 70) {
        score += 30;
    } else if (issueStats.ratio >= 50) {
        score += 20;
    } else if (issueStats.ratio >= 30) {
        score += 10;
    }

    details.hasContributing = Boolean(
        pathsSet.has('CONTRIBUTING.md') ||
        pathsSet.has('.github/CONTRIBUTING.md')
    );
    if (details.hasContributing) score += 30;

    return { score: Math.min(score, 100), details };
}

/**
 * Calculate Maintainability Score (15% weight)
 */
function calculateMaintainabilityScore(treePaths, pathsSet) {
    let score = 0;
    const details = {};

    details.hasTests = treePaths.some(p => {
        const lower = p.toLowerCase();
        return TEST_DIR_PREFIXES.some(t => lower === t || lower.startsWith(`${t}/`));
    });
    if (details.hasTests) score += 50;

    details.hasLinter = LINTER_FILENAMES.some(file => pathsSet.has(file));
    if (details.hasLinter) score += 50;

    return { score: Math.min(score, 100), details };
}

/**
 * Calculate Documentation Score (15% weight)
 */
function calculateDocumentationScore(repoData, treePaths, pathsSet) {
    let score = 0;
    const details = {};

    details.hasDocsFolder = treePaths.some(p => {
        const lower = p.toLowerCase();
        return lower === 'docs' || lower.startsWith('docs/');
    });
    if (details.hasDocsFolder) score += 25;

    details.hasChangelog = Boolean(
        pathsSet.has('CHANGELOG.md') ||
        pathsSet.has('HISTORY.md') ||
        pathsSet.has('CHANGES.md')
    );
    if (details.hasChangelog) score += 25;

    details.hasExamples = treePaths.some(p => {
        const lower = p.toLowerCase();
        return lower === 'examples' || lower.startsWith('examples/') || lower === 'example' || lower.startsWith('example/');
    });
    if (details.hasExamples) score += 25;

    details.hasWiki = Boolean(repoData.has_wiki);
    if (repoData.has_wiki) score += 15;

    details.hasApiDocs = Boolean(
        pathsSet.has('API.md') ||
        pathsSet.has('docs/api.md') ||
        treePaths.some(p => p.toLowerCase().startsWith('docs/api/'))
    );
    if (details.hasApiDocs) score += 10;

    return { score: Math.min(score, 100), details };
}

/**
 * Calculate Automation Score (15% weight)
 */
function calculateAutomationScore(workflows, treePaths, pathsSet) {
    let score = 0;
    const details = {};

    details.workflowCount = workflows?.count || 0;
    if (details.workflowCount >= 3) {
        score += 30;
    } else if (details.workflowCount >= 1) {
        score += 20;
    }

    details.hasPRTemplate = Boolean(
        pathsSet.has('.github/PULL_REQUEST_TEMPLATE.md') ||
        pathsSet.has('.github/pull_request_template.md') ||
        treePaths.some(p => p.startsWith('.github/PULL_REQUEST_TEMPLATE/'))
    );
    if (details.hasPRTemplate) score += 20;

    details.hasIssueTemplate = Boolean(
        pathsSet.has('.github/ISSUE_TEMPLATE.md') ||
        treePaths.some(p => p.startsWith('.github/ISSUE_TEMPLATE/'))
    );
    if (details.hasIssueTemplate) score += 20;

    details.hasReleaseConfig = Boolean(
        pathsSet.has('.releaserc') ||
        pathsSet.has('.releaserc.json') ||
        pathsSet.has('release.config.js')
    );
    if (details.hasReleaseConfig) score += 15;

    details.hasCodeOfConduct = pathsSet.has('CODE_OF_CONDUCT.md');
    if (details.hasCodeOfConduct) score += 15;

    return { score: Math.min(score, 100), details };
}

/**
 * Generate actionable recommendations based on missing items
 */
function generateRecommendations(pillars) {
    const recommendations = [];

    // Readability recommendations
    if (!pillars.readability.details.hasReadme) {
        recommendations.push({
            priority: 'Critical',
            category: 'Readability',
            issue: 'Missing README.md',
            action: 'Create a README.md file with project description, installation, and usage instructions.',
            impact: '+20 points',
        });
    } else {
        if (!pillars.readability.details.hasInstallation) {
            recommendations.push({
                priority: 'Medium',
                category: 'Readability',
                issue: 'Missing installation instructions',
                action: 'Add an "Installation" section to your README with setup steps.',
                impact: '+15 points',
            });
        }
        if (!pillars.readability.details.hasUsage) {
            recommendations.push({
                priority: 'Medium',
                category: 'Readability',
                issue: 'Missing usage documentation',
                action: 'Add a "Usage" or "Getting Started" section with examples.',
                impact: '+15 points',
            });
        }
    }

    if (!pillars.readability.details.hasDescription) {
        recommendations.push({
            priority: 'Medium',
            category: 'Readability',
            issue: 'Missing repository description',
            action: 'Add a description in the repository settings (About section).',
            impact: '+30 points',
        });
    }

    // Security recommendations
    if (!pillars.security.details.hasSecurityMd) {
        recommendations.push({
            priority: 'Critical',
            category: 'Security',
            issue: 'Missing SECURITY.md',
            action: 'Create SECURITY.md with vulnerability reporting guidelines.',
            impact: '+30 points',
        });
    }

    if (!pillars.security.details.hasDependabot) {
        recommendations.push({
            priority: 'Medium',
            category: 'Security',
            issue: 'Dependabot not configured',
            action: 'Enable Dependabot by adding .github/dependabot.yml for automatic security updates.',
            impact: '+30 points',
        });
    }

    if (pillars.security.details.licenseRisk?.includes('High')) {
        recommendations.push({
            priority: 'Critical',
            category: 'Security',
            issue: 'No license or restrictive license',
            action: 'Add an open-source license (MIT, Apache-2.0 recommended).',
            impact: '+40 points',
        });
    }

    // Maintainability recommendations
    if (!pillars.maintainability.details.hasTests) {
        recommendations.push({
            priority: 'Critical',
            category: 'Maintainability',
            issue: 'No tests detected',
            action: 'Add a test/ or __tests__/ directory with unit tests.',
            impact: '+50 points',
        });
    }

    if (!pillars.maintainability.details.hasLinter) {
        recommendations.push({
            priority: 'Medium',
            category: 'Maintainability',
            issue: 'No linter configuration',
            action: 'Add .eslintrc, .prettierrc, or biome.json for code quality.',
            impact: '+50 points',
        });
    }

    // Documentation recommendations
    if (!pillars.documentation.details.hasDocsFolder) {
        recommendations.push({
            priority: 'Medium',
            category: 'Documentation',
            issue: 'No docs/ folder',
            action: 'Create a docs/ directory with detailed documentation.',
            impact: '+25 points',
        });
    }

    if (!pillars.documentation.details.hasChangelog) {
        recommendations.push({
            priority: 'Medium',
            category: 'Documentation',
            issue: 'No CHANGELOG.md',
            action: 'Add CHANGELOG.md to track version history and changes.',
            impact: '+25 points',
        });
    }

    if (!pillars.documentation.details.hasExamples) {
        recommendations.push({
            priority: 'Low',
            category: 'Documentation',
            issue: 'No examples/ folder',
            action: 'Add an examples/ directory with usage examples.',
            impact: '+25 points',
        });
    }

    // Automation recommendations
    if (!pillars.automation.details.hasPRTemplate) {
        recommendations.push({
            priority: 'Low',
            category: 'Automation',
            issue: 'No PR template',
            action: 'Create .github/PULL_REQUEST_TEMPLATE.md for consistent PRs.',
            impact: '+20 points',
        });
    }

    if (!pillars.automation.details.hasIssueTemplate) {
        recommendations.push({
            priority: 'Low',
            category: 'Automation',
            issue: 'No issue templates',
            action: 'Add .github/ISSUE_TEMPLATE/ with bug and feature templates.',
            impact: '+20 points',
        });
    }

    if (!pillars.automation.details.hasCodeOfConduct) {
        recommendations.push({
            priority: 'Low',
            category: 'Automation',
            issue: 'No Code of Conduct',
            action: 'Add CODE_OF_CONDUCT.md for community guidelines.',
            impact: '+15 points',
        });
    }

    // Community recommendations
    if (!pillars.community.details.hasContributing) {
        recommendations.push({
            priority: 'Medium',
            category: 'Community',
            issue: 'No CONTRIBUTING.md',
            action: 'Create CONTRIBUTING.md with contribution guidelines.',
            impact: '+30 points',
        });
    }

    // Stability recommendations
    if (!pillars.stability.details.hasReleases && !pillars.stability.details.hasTags) {
        recommendations.push({
            priority: 'Medium',
            category: 'Stability',
            issue: 'No releases or tags',
            action: 'Create GitHub releases with semantic versioning.',
            impact: '+25 points',
        });
    }

    const priorityOrder = { 'Critical': 0, 'Medium': 1, 'Low': 2 };
    recommendations.sort((a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3));

    return recommendations;
}

/**
 * Calculate overall health score using weighted average (7 pillars)
 * @param {Octokit} octokit - GitHub client instance
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Object} repoData - Repository metadata
 * @param {Object} cachedData - Optional pre-fetched tree and API data to prevent duplicate calls
 */
export async function calculateHealthScore(octokit, owner, repo, repoData, cachedData = {}) {
    log.info(`Calculating 7-pillar health score for ${owner}/${repo}...`);

    const treePaths = cachedData.treePaths || [];
    const pathsSet = cachedData.pathsSet || new Set(treePaths);
    const workflows = cachedData.workflows || (await getWorkflows(octokit, owner, repo));
    const issueStats = cachedData.issueStats || (await getIssueStats(octokit, owner, repo, repoData.open_issues_count));

    // Calculate all 7 pillars
    const [readability, stability] = await Promise.all([
        calculateReadabilityScore(octokit, owner, repo, repoData, cachedData),
        calculateStabilityScore(octokit, owner, repo, repoData, cachedData),
    ]);

    // Memory-computed pillars (0 additional API calls)
    const security = calculateSecurityScore(repoData, pathsSet);
    const community = calculateCommunityScore(repoData, pathsSet, issueStats);
    const maintainability = calculateMaintainabilityScore(treePaths, pathsSet);
    const documentation = calculateDocumentationScore(repoData, treePaths, pathsSet);
    const automation = calculateAutomationScore(workflows, treePaths, pathsSet);

    // 7 pillar weights sum to 1.0 (100%)
    const weights = {
        readability: 0.15,
        stability: 0.15,
        security: 0.15,
        community: 0.10,
        maintainability: 0.15,
        documentation: 0.15,
        automation: 0.15,
    };

    const totalScore = Math.round(
        readability.score * weights.readability +
        stability.score * weights.stability +
        security.score * weights.security +
        community.score * weights.community +
        maintainability.score * weights.maintainability +
        documentation.score * weights.documentation +
        automation.score * weights.automation
    );

    // Determine grade
    let grade;
    if (totalScore >= 90) grade = 'A+';
    else if (totalScore >= 80) grade = 'A';
    else if (totalScore >= 70) grade = 'B';
    else if (totalScore >= 60) grade = 'C';
    else if (totalScore >= 50) grade = 'D';
    else grade = 'F';

    // Determine risk level
    let riskLevel;
    if (totalScore >= 80) riskLevel = 'Low Risk';
    else if (totalScore >= 50) riskLevel = 'Medium Risk';
    else riskLevel = 'High Risk';

    const pillars = {
        readability: { score: readability.score, weight: '15%', details: readability.details },
        stability: { score: stability.score, weight: '15%', details: stability.details },
        security: { score: security.score, weight: '15%', details: security.details },
        community: { score: community.score, weight: '10%', details: community.details },
        maintainability: { score: maintainability.score, weight: '15%', details: maintainability.details },
        documentation: { score: documentation.score, weight: '15%', details: documentation.details },
        automation: { score: automation.score, weight: '15%', details: automation.details },
    };

    const recommendations = generateRecommendations(pillars);

    log.info(`${owner}/${repo}: Health Score = ${totalScore}/100, Grade = ${grade}, Recommendations = ${recommendations.length}`);

    return {
        totalScore,
        grade,
        riskLevel,
        pillars,
        recommendations,
        recommendationCount: recommendations.length,
    };
}
