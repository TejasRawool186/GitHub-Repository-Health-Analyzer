/**
 * Repository Health Scoring Engine
 * Implements the 7-Pillar weighted scoring algorithm + Recommendations
 */

import { log } from 'crawlee';
import {
    getReadme,
    getWorkflows,
    getReleases,
    getTags,
    getIssueStats,
    getSecurityFiles,
    hasLinterConfig,
    hasTestDirectory,
    fileExists,
    directoryExists,
} from './github-client.js';

/**
 * License risk scoring
 * MIT/Apache = Low risk (full score)
 * BSD/ISC = Low risk (full score)
 * GPL/LGPL = Medium risk (partial score)
 * No license = High risk (low score)
 */
const LICENSE_SCORES = {
    // Permissive licenses (Low Risk)
    'mit': 100,
    'apache-2.0': 100,
    'bsd-2-clause': 100,
    'bsd-3-clause': 100,
    'isc': 100,
    'unlicense': 90,
    'cc0-1.0': 90,
    'wtfpl': 85,

    // Weak copyleft (Medium Risk)
    'lgpl-2.1': 70,
    'lgpl-3.0': 70,
    'mpl-2.0': 75,

    // Strong copyleft (Higher Risk for commercial use)
    'gpl-2.0': 50,
    'gpl-3.0': 50,
    'agpl-3.0': 40,

    // No license (High Risk)
    'other': 30,
    'none': 20,
};

/**
 * Get license risk category
 */
function getLicenseRisk(licenseKey) {
    if (!licenseKey) {
        return { score: 20, risk: '🔴 High (No License)' };
    }

    const key = licenseKey.toLowerCase();
    const score = LICENSE_SCORES[key] ?? 50;

    if (score >= 85) {
        return { score, risk: '🟢 Low (Permissive)' };
    } else if (score >= 60) {
        return { score, risk: '🟡 Medium (Copyleft)' };
    } else {
        return { score, risk: '🔴 High (Restrictive)' };
    }
}

/**
 * Calculate Readability Score (15% weight)
 */
async function calculateReadabilityScore(octokit, owner, repo, repoData) {
    let score = 0;
    const details = {};

    const readme = await getReadme(octokit, owner, repo);
    details.hasReadme = readme.exists;
    details.readmeLength = readme.length;

    if (readme.exists) {
        score += 20;
        if (readme.length > 500) score += 10;
        if (readme.length > 2000) score += 10;

        const lowerContent = readme.content.toLowerCase();
        details.hasInstallation = lowerContent.includes('installation') || lowerContent.includes('install');
        details.hasUsage = lowerContent.includes('usage') || lowerContent.includes('getting started');

        if (details.hasInstallation) score += 15;
        if (details.hasUsage) score += 15;
    }

    details.hasDescription = !!repoData.description && repoData.description.length > 10;
    if (details.hasDescription) score += 30;

    return { score: Math.min(score, 100), details };
}

/**
 * Calculate Stability Score (15% weight)
 */
async function calculateStabilityScore(octokit, owner, repo, repoData) {
    let score = 0;
    const details = {};

    const [releases, tags] = await Promise.all([
        getReleases(octokit, owner, repo),
        getTags(octokit, owner, repo),
    ]);

    details.hasReleases = releases.exists;
    details.releaseCount = releases.count;
    details.hasTags = tags.exists;
    details.tagCount = tags.count;
    details.latestRelease = releases.latest;

    if (releases.exists || tags.exists) {
        score += 25;
        if (releases.count > 5 || tags.count > 5) score += 15;
    }

    const workflows = await getWorkflows(octokit, owner, repo);
    details.hasWorkflows = workflows.exists;
    details.workflowCount = workflows.count;

    if (workflows.exists) {
        score += 20;
        if (workflows.count > 1) score += 10;
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
async function calculateSecurityScore(octokit, owner, repo, repoData) {
    let score = 0;
    const details = {};

    const licenseKey = repoData.license?.spdx_id;
    const licenseRisk = getLicenseRisk(licenseKey);

    details.licenseType = repoData.license?.name || 'No License';
    details.licenseKey = licenseKey || 'none';
    details.licenseRisk = licenseRisk.risk;
    details.licenseScore = licenseRisk.score;

    score += Math.round(licenseRisk.score * 0.4);

    const securityFiles = await getSecurityFiles(octokit, owner, repo);
    details.hasSecurityMd = securityFiles.securityMd;
    details.hasDependabot = securityFiles.dependabot;

    if (securityFiles.securityMd) score += 30;
    if (securityFiles.dependabot) score += 30;

    return { score: Math.min(score, 100), details };
}

/**
 * Calculate Community Score (10% weight)
 */
async function calculateCommunityScore(octokit, owner, repo, repoData) {
    let score = 0;
    const details = {};

    details.stars = repoData.stargazers_count;
    details.forks = repoData.forks_count;
    details.subscribers = repoData.subscribers_count;

    if (repoData.stargazers_count >= 1000) {
        score += 40;
    } else if (repoData.stargazers_count >= 100) {
        score += 30;
    } else if (repoData.stargazers_count >= 50) {
        score += 20;
    } else if (repoData.stargazers_count >= 10) {
        score += 10;
    }

    const issueStats = await getIssueStats(octokit, owner, repo);
    details.openIssues = issueStats.open;
    details.closedIssues = issueStats.closed;
    details.issueCloseRatio = issueStats.ratio;

    if (issueStats.ratio >= 70) {
        score += 30;
    } else if (issueStats.ratio >= 50) {
        score += 20;
    } else if (issueStats.ratio >= 30) {
        score += 10;
    }

    details.hasContributing = await fileExists(octokit, owner, repo, 'CONTRIBUTING.md');
    if (details.hasContributing) score += 30;

    return { score: Math.min(score, 100), details };
}

/**
 * Calculate Maintainability Score (15% weight)
 */
async function calculateMaintainabilityScore(octokit, owner, repo) {
    let score = 0;
    const details = {};

    details.hasTests = await hasTestDirectory(octokit, owner, repo);
    if (details.hasTests) score += 50;

    details.hasLinter = await hasLinterConfig(octokit, owner, repo);
    if (details.hasLinter) score += 50;

    return { score: Math.min(score, 100), details };
}

/**
 * Calculate Documentation Score (15% weight) - NEW!
 * - Has /docs folder or wiki
 * - Has CHANGELOG.md
 * - Has /examples folder
 * - Has API documentation
 */
async function calculateDocumentationScore(octokit, owner, repo, repoData) {
    let score = 0;
    const details = {};

    // Check for docs folder (25 points)
    details.hasDocsFolder = await directoryExists(octokit, owner, repo, 'docs');
    if (details.hasDocsFolder) score += 25;

    // Check for CHANGELOG.md (25 points)
    details.hasChangelog = await fileExists(octokit, owner, repo, 'CHANGELOG.md') ||
        await fileExists(octokit, owner, repo, 'HISTORY.md') ||
        await fileExists(octokit, owner, repo, 'CHANGES.md');
    if (details.hasChangelog) score += 25;

    // Check for examples folder (25 points)
    details.hasExamples = await directoryExists(octokit, owner, repo, 'examples') ||
        await directoryExists(octokit, owner, repo, 'example');
    if (details.hasExamples) score += 25;

    // Check for wiki or has_wiki flag (15 points)
    details.hasWiki = repoData.has_wiki;
    if (repoData.has_wiki) score += 15;

    // Check for API docs (various formats) (10 points)
    details.hasApiDocs = await fileExists(octokit, owner, repo, 'API.md') ||
        await fileExists(octokit, owner, repo, 'docs/api.md') ||
        await directoryExists(octokit, owner, repo, 'docs/api');
    if (details.hasApiDocs) score += 10;

    return { score: Math.min(score, 100), details };
}

/**
 * Calculate Automation Score (15% weight) - NEW!
 * - Has multiple CI workflows
 * - Has PR templates
 * - Has issue templates
 * - Has automated releases/semantic versioning
 */
async function calculateAutomationScore(octokit, owner, repo) {
    let score = 0;
    const details = {};

    // Check for CI workflows (30 points)
    const workflows = await getWorkflows(octokit, owner, repo);
    details.workflowCount = workflows.count;
    if (workflows.count >= 3) {
        score += 30;
    } else if (workflows.count >= 1) {
        score += 20;
    }

    // Check for PR template (20 points)
    details.hasPRTemplate = await fileExists(octokit, owner, repo, '.github/PULL_REQUEST_TEMPLATE.md') ||
        await fileExists(octokit, owner, repo, '.github/pull_request_template.md') ||
        await directoryExists(octokit, owner, repo, '.github/PULL_REQUEST_TEMPLATE');
    if (details.hasPRTemplate) score += 20;

    // Check for issue templates (20 points)
    details.hasIssueTemplate = await fileExists(octokit, owner, repo, '.github/ISSUE_TEMPLATE.md') ||
        await directoryExists(octokit, owner, repo, '.github/ISSUE_TEMPLATE');
    if (details.hasIssueTemplate) score += 20;

    // Check for release automation (15 points)
    details.hasReleaseConfig = await fileExists(octokit, owner, repo, '.releaserc') ||
        await fileExists(octokit, owner, repo, '.releaserc.json') ||
        await fileExists(octokit, owner, repo, 'release.config.js');
    if (details.hasReleaseConfig) score += 15;

    // Check for CODE_OF_CONDUCT.md (15 points)
    details.hasCodeOfConduct = await fileExists(octokit, owner, repo, 'CODE_OF_CONDUCT.md');
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
            priority: '🔴 Critical',
            category: 'Readability',
            issue: 'Missing README.md',
            action: 'Create a README.md file with project description, installation, and usage instructions.',
            impact: '+20 points',
        });
    } else {
        if (!pillars.readability.details.hasInstallation) {
            recommendations.push({
                priority: '🟡 Medium',
                category: 'Readability',
                issue: 'Missing installation instructions',
                action: 'Add an "Installation" section to your README with setup steps.',
                impact: '+15 points',
            });
        }
        if (!pillars.readability.details.hasUsage) {
            recommendations.push({
                priority: '🟡 Medium',
                category: 'Readability',
                issue: 'Missing usage documentation',
                action: 'Add a "Usage" or "Getting Started" section with examples.',
                impact: '+15 points',
            });
        }
    }

    if (!pillars.readability.details.hasDescription) {
        recommendations.push({
            priority: '🟡 Medium',
            category: 'Readability',
            issue: 'Missing repository description',
            action: 'Add a description in the repository settings (About section).',
            impact: '+30 points',
        });
    }

    // Security recommendations
    if (!pillars.security.details.hasSecurityMd) {
        recommendations.push({
            priority: '🔴 Critical',
            category: 'Security',
            issue: 'Missing SECURITY.md',
            action: 'Create SECURITY.md with vulnerability reporting guidelines.',
            impact: '+30 points',
        });
    }

    if (!pillars.security.details.hasDependabot) {
        recommendations.push({
            priority: '🟡 Medium',
            category: 'Security',
            issue: 'Dependabot not configured',
            action: 'Enable Dependabot by adding .github/dependabot.yml for automatic security updates.',
            impact: '+30 points',
        });
    }

    if (pillars.security.details.licenseRisk?.includes('High')) {
        recommendations.push({
            priority: '🔴 Critical',
            category: 'Security',
            issue: 'No license or restrictive license',
            action: 'Add an open-source license (MIT, Apache-2.0 recommended).',
            impact: '+40 points',
        });
    }

    // Maintainability recommendations
    if (!pillars.maintainability.details.hasTests) {
        recommendations.push({
            priority: '🔴 Critical',
            category: 'Maintainability',
            issue: 'No tests detected',
            action: 'Add a test/ or __tests__/ directory with unit tests.',
            impact: '+50 points',
        });
    }

    if (!pillars.maintainability.details.hasLinter) {
        recommendations.push({
            priority: '🟡 Medium',
            category: 'Maintainability',
            issue: 'No linter configuration',
            action: 'Add .eslintrc, .prettierrc, or biome.json for code quality.',
            impact: '+50 points',
        });
    }

    // Documentation recommendations
    if (!pillars.documentation.details.hasDocsFolder) {
        recommendations.push({
            priority: '🟡 Medium',
            category: 'Documentation',
            issue: 'No docs/ folder',
            action: 'Create a docs/ directory with detailed documentation.',
            impact: '+25 points',
        });
    }

    if (!pillars.documentation.details.hasChangelog) {
        recommendations.push({
            priority: '🟡 Medium',
            category: 'Documentation',
            issue: 'No CHANGELOG.md',
            action: 'Add CHANGELOG.md to track version history and changes.',
            impact: '+25 points',
        });
    }

    if (!pillars.documentation.details.hasExamples) {
        recommendations.push({
            priority: '🟢 Nice-to-have',
            category: 'Documentation',
            issue: 'No examples/ folder',
            action: 'Add an examples/ directory with usage examples.',
            impact: '+25 points',
        });
    }

    // Automation recommendations
    if (!pillars.automation.details.hasPRTemplate) {
        recommendations.push({
            priority: '🟢 Nice-to-have',
            category: 'Automation',
            issue: 'No PR template',
            action: 'Create .github/PULL_REQUEST_TEMPLATE.md for consistent PRs.',
            impact: '+20 points',
        });
    }

    if (!pillars.automation.details.hasIssueTemplate) {
        recommendations.push({
            priority: '🟢 Nice-to-have',
            category: 'Automation',
            issue: 'No issue templates',
            action: 'Add .github/ISSUE_TEMPLATE/ with bug and feature templates.',
            impact: '+20 points',
        });
    }

    if (!pillars.automation.details.hasCodeOfConduct) {
        recommendations.push({
            priority: '🟢 Nice-to-have',
            category: 'Automation',
            issue: 'No Code of Conduct',
            action: 'Add CODE_OF_CONDUCT.md for community guidelines.',
            impact: '+15 points',
        });
    }

    // Community recommendations
    if (!pillars.community.details.hasContributing) {
        recommendations.push({
            priority: '🟡 Medium',
            category: 'Community',
            issue: 'No CONTRIBUTING.md',
            action: 'Create CONTRIBUTING.md with contribution guidelines.',
            impact: '+30 points',
        });
    }

    // Stability recommendations
    if (!pillars.stability.details.hasReleases && !pillars.stability.details.hasTags) {
        recommendations.push({
            priority: '🟡 Medium',
            category: 'Stability',
            issue: 'No releases or tags',
            action: 'Create GitHub releases with semantic versioning.',
            impact: '+25 points',
        });
    }

    // Sort by priority
    const priorityOrder = { '🔴 Critical': 0, '🟡 Medium': 1, '🟢 Nice-to-have': 2 };
    recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    return recommendations;
}

/**
 * Calculate overall health score using weighted average (7 pillars)
 */
export async function calculateHealthScore(octokit, owner, repo, repoData) {
    log.info(`Calculating health score for ${owner}/${repo}...`);

    // Calculate all 7 pillar scores
    const [readability, stability, security, community, maintainability, documentation, automation] = await Promise.all([
        calculateReadabilityScore(octokit, owner, repo, repoData),
        calculateStabilityScore(octokit, owner, repo, repoData),
        calculateSecurityScore(octokit, owner, repo, repoData),
        calculateCommunityScore(octokit, owner, repo, repoData),
        calculateMaintainabilityScore(octokit, owner, repo),
        calculateDocumentationScore(octokit, owner, repo, repoData),
        calculateAutomationScore(octokit, owner, repo),
    ]);

    // New weighted average (7 pillars)
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
    if (totalScore >= 80) riskLevel = '🟢 Low Risk';
    else if (totalScore >= 50) riskLevel = '🟡 Medium Risk';
    else riskLevel = '🔴 High Risk';

    const pillars = {
        readability: { score: readability.score, weight: '15%', details: readability.details },
        stability: { score: stability.score, weight: '15%', details: stability.details },
        security: { score: security.score, weight: '15%', details: security.details },
        community: { score: community.score, weight: '10%', details: community.details },
        maintainability: { score: maintainability.score, weight: '15%', details: maintainability.details },
        documentation: { score: documentation.score, weight: '15%', details: documentation.details },
        automation: { score: automation.score, weight: '15%', details: automation.details },
    };

    // Generate recommendations
    const recommendations = generateRecommendations(pillars);

    log.info(`${owner}/${repo}: Score=${totalScore}, Grade=${grade}, Recommendations=${recommendations.length}`);

    return {
        totalScore,
        grade,
        riskLevel,
        pillars,
        recommendations,
        recommendationCount: recommendations.length,
    };
}
