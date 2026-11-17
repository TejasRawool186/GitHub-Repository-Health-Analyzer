/**
 * Unified Repository Intelligence Orchestrator
 * Coordinates data gathering and runs all 20 advanced analysis features on shared repository data.
 */

import { log } from 'apify';
import {
    getRepoData,
    getRepoTree,
    getFileContent,
    getReadme,
    getRepoLanguages,
    getRecentCommits,
    getContributors,
    getReleases,
    getTags,
    getIssues,
    getPullRequests,
    getWorkflows,
    getIssueStats,
} from './github-client.js';

import { calculateHealthScore } from './scorer.js';
import { generateBadgeUrl, generateBadgeMarkdown, formatDate } from './utils.js';

// Analyzers
import { analyzeRepoTree } from './analyzers/tree-analyzer.js';
import { detectTechStack } from './analyzers/tech-stack-analyzer.js';
import { generateArchitectureGraph } from './analyzers/architecture-analyzer.js';
import { generateDataFlowDiagrams } from './analyzers/data-flow-analyzer.js';
import { analyzeDependencies } from './analyzers/dependency-analyzer.js';
import { generateSbomDocuments } from './analyzers/sbom-generator.js';
import { analyzeSecurityConfiguration } from './analyzers/security-analyzer.js';
import { analyzeLicenseCompliance } from './analyzers/license-analyzer.js';
import { analyzeActivityTimeline } from './analyzers/activity-analyzer.js';
import { analyzeContributors } from './analyzers/contributor-analyzer.js';
import { analyzeReleasesAndVersions } from './analyzers/releases-analyzer.js';
import { analyzeIssuesAndPrs } from './analyzers/issues-prs-analyzer.js';
import { analyzeReproducibility } from './analyzers/reproducibility-analyzer.js';
import { analyzeAccessibilityAndLocalization } from './analyzers/accessibility-analyzer.js';
import { analyzeEvolution } from './analyzers/evolution-analyzer.js';

/**
 * Conduct comprehensive repository intelligence analysis
 * @param {Object} octokit - Configured Octokit client
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {Object} options - Scan configuration options (history limits, scan depth)
 * @returns {Promise<Object|null>} Normalized Repository Intelligence record
 */
export function analyzeRepository(octokit, owner, repo, options = {}) {
    return runAnalysis(octokit, owner, repo, options);
}

async function runAnalysis(octokit, owner, repo, options = {}) {
    log.info(`Initiating comprehensive intelligence audit for ${owner}/${repo}`);

    // 1. Fetch Repository Metadata
    const repoData = await getRepoData(octokit, owner, repo);
    if (!repoData) {
        log.warning(`Repository ${owner}/${repo} is inaccessible or not found.`);
        return null;
    }

    const defaultBranch = repoData.default_branch || 'main';

    // 2. Efficient Data Collection: Fetch Git Tree, Languages, Workflows in parallel
    const [treeResult, languagesData, workflowsData] = await Promise.all([
        getRepoTree(octokit, owner, repo, defaultBranch),
        getRepoLanguages(octokit, owner, repo),
        getWorkflows(octokit, owner, repo),
    ]);

    const treeItems = treeResult.tree || [];
    const treePaths = treeItems.map(item => item.path);
    const pathsSet = new Set(treePaths);

    // 3. Fetch essential manifests based on paths found in the tree
    const manifestPromises = [];

    // package.json & package-lock.json
    let packageJson = null;
    let packageLockJson = null;
    if (pathsSet.has('package.json')) {
        manifestPromises.push(
            getFileContent(octokit, owner, repo, 'package.json').then(res => {
                if (res.exists && res.content) {
                    try { packageJson = JSON.parse(res.content); } catch (e) { /* ignore parse error */ }
                }
            })
        );
    }
    if (pathsSet.has('package-lock.json')) {
        manifestPromises.push(
            getFileContent(octokit, owner, repo, 'package-lock.json').then(res => {
                if (res.exists && res.content) {
                    try { packageLockJson = JSON.parse(res.content); } catch (e) { /* ignore parse error */ }
                }
            })
        );
    }

    // Python requirements.txt
    let requirementsTxt = '';
    if (pathsSet.has('requirements.txt')) {
        manifestPromises.push(
            getFileContent(octokit, owner, repo, 'requirements.txt').then(res => {
                if (res.exists && res.content) requirementsTxt = res.content;
            })
        );
    }

    // Go mod
    let goMod = '';
    if (pathsSet.has('go.mod')) {
        manifestPromises.push(
            getFileContent(octokit, owner, repo, 'go.mod').then(res => {
                if (res.exists && res.content) goMod = res.content;
            })
        );
    }

    // Rust Cargo.toml
    let cargoToml = '';
    if (pathsSet.has('Cargo.toml')) {
        manifestPromises.push(
            getFileContent(octokit, owner, repo, 'Cargo.toml').then(res => {
                if (res.exists && res.content) cargoToml = res.content;
            })
        );
    }

    // Dockerfile content
    let dockerfileContent = '';
    if (pathsSet.has('Dockerfile')) {
        manifestPromises.push(
            getFileContent(octokit, owner, repo, 'Dockerfile').then(res => {
                if (res.exists && res.content) dockerfileContent = res.content;
            })
        );
    }

    // Sample workflow files (up to 3 workflows)
    const sampleWorkflows = [];
    const workflowFilePaths = treePaths.filter(p => p.startsWith('.github/workflows/') && (p.endsWith('.yml') || p.endsWith('.yaml'))).slice(0, 4);
    for (const wfPath of workflowFilePaths) {
        manifestPromises.push(
            getFileContent(octokit, owner, repo, wfPath).then(res => {
                if (res.exists && res.content) {
                    sampleWorkflows.push({ path: wfPath, content: res.content });
                }
            })
        );
    }

    // Sample code files for TODO/debt inspection (up to 5 source files)
    const sampleSourceFiles = [];
    const samplePaths = treePaths.filter(p => (
        p.endsWith('.js') || p.endsWith('.ts') || p.endsWith('.py') || p.endsWith('.go') || p.endsWith('.rs')
    ) && !p.includes('test') && !p.includes('dist') && !p.includes('vendor')).slice(0, 5);

    for (const sp of samplePaths) {
        manifestPromises.push(
            getFileContent(octokit, owner, repo, sp).then(res => {
                if (res.exists && res.content) {
                    sampleSourceFiles.push({ path: sp, content: res.content });
                }
            })
        );
    }

    // Wait for all manifest and file fetches
    await Promise.all(manifestPromises);

    // 4. Fetch activity, contributors, releases, issues, PRs
    const maxCommits = options.maxCommitHistory || 50;
    const maxIssuesPrs = options.maxIssuesAndPrs || 30;

    const [
        recentCommits,
        contributors,
        releases,
        tags,
        openIssues,
        closedIssues,
        openPrs,
        closedPrs,
        issueStats,
        healthResult,
    ] = await Promise.all([
        getRecentCommits(octokit, owner, repo, maxCommits),
        getContributors(octokit, owner, repo, 30),
        getReleases(octokit, owner, repo, 20),
        getTags(octokit, owner, repo, 20),
        getIssues(octokit, owner, repo, 'open', maxIssuesPrs),
        getIssues(octokit, owner, repo, 'closed', maxIssuesPrs),
        getPullRequests(octokit, owner, repo, 'open', maxIssuesPrs),
        getPullRequests(octokit, owner, repo, 'closed', maxIssuesPrs),
        getIssueStats(octokit, owner, repo),
        calculateHealthScore(octokit, owner, repo, repoData),
    ]);

    // 5. Run Deterministic Analyzers
    // 6.4 & 6.13: File structure and code complexity
    const structureAnalysis = analyzeRepoTree(treeItems, sampleSourceFiles);

    // 6.1: Technology Stack Explorer
    const techStackAnalysis = detectTechStack({
        treePaths,
        packageJson,
        requirementsTxt,
        dockerfileContent,
        githubWorkflows: workflowsData.workflows,
        githubLanguages: languagesData,
    });

    // 6.2: Architecture Diagram Generator
    const architectureAnalysis = generateArchitectureGraph({
        treePaths,
        packageJson,
        techStack: techStackAnalysis,
        dockerfileContent,
        workflows: workflowsData.workflows,
    });

    // 6.3: Data Flow Diagram Generator
    const dataFlowAnalysis = generateDataFlowDiagrams({
        treePaths,
        packageJson,
        techStack: techStackAnalysis,
    });

    // 6.6: Dependency Ecosystem Analyzer
    const dependencyAnalysis = analyzeDependencies({
        treePaths,
        packageJson,
        packageLockJson,
        requirementsTxt,
        goMod,
        cargoToml,
    });

    // 6.17: SBOM Generator
    const sbomAnalysis = generateSbomDocuments(repoData, dependencyAnalysis.dependencies);

    // 6.11: Security Configuration Observatory
    const securityAnalysis = analyzeSecurityConfiguration({
        treePaths,
        repoData,
        workflowsData,
        sampleWorkflows,
    });

    // 6.12: License Compliance Matrix
    const licenseAnalysis = analyzeLicenseCompliance({
        repoData,
        treePaths,
        dependencies: dependencyAnalysis.dependencies,
    });

    // 6.7: Activity Timeline & Heatmap
    const activityAnalysis = analyzeActivityTimeline(recentCommits, repoData);

    // 6.8: Contributor & Bus Factor Analytics
    const contributorAnalysis = analyzeContributors(contributors, repoData);

    // 6.9: Release & Version Intelligence
    const releaseAnalysis = analyzeReleasesAndVersions(releases, tags, repoData);

    // 6.10: Issues & Pull Requests Intelligence
    const issuesPrsAnalysis = analyzeIssuesAndPrs({
        repoData,
        openIssues,
        closedIssues,
        openPrs,
        closedPrs,
        issueStats,
    });

    // 6.19: Reproducibility & Dev Env Audit
    const reproducibilityAnalysis = analyzeReproducibility({
        treePaths,
        packageJson,
        workflows: workflowsData.workflows,
    });

    // 6.20: Accessibility & Localization Audit
    const a11yAnalysis = analyzeAccessibilityAndLocalization({
        treePaths,
        packageJson,
    });

    // 6.16: Evolution & Technical Debt Timeline
    const evolutionAnalysis = analyzeEvolution({
        repoData,
        commits: recentCommits,
        releases,
        healthScore: healthResult.totalScore,
        treeSummary: structureAnalysis,
        dependencies: dependencyAnalysis.dependencies,
    });

    // 6.5: Programming Language Distribution Analytics
    const totalBytes = Object.values(languagesData).reduce((sum, b) => sum + b, 0);
    const languagesList = Object.entries(languagesData).map(([lang, bytes]) => ({
        language: lang,
        bytes,
        percentage: totalBytes > 0 ? Math.round((bytes / totalBytes) * 1000) / 10 : 0,
    })).sort((a, b) => b.bytes - a.bytes);

    const languageDistribution = {
        status: languagesList.length > 0 ? 'completed' : 'empty',
        primary_language: repoData.language || (languagesList.length > 0 ? languagesList[0].language : 'Unknown'),
        total_languages: languagesList.length,
        total_bytes: totalBytes,
        languages: languagesList,
    };

    // Generate badge
    const badgeUrl = generateBadgeUrl(healthResult.totalScore, healthResult.grade);
    const badgeMarkdown = generateBadgeMarkdown(healthResult.totalScore, healthResult.grade, repoData.html_url);

    // 6.22: Unified Repository Intelligence Data Model
    const normalizedRecord = {
        // Backwards-compatible root fields
        repo_name: repoData.full_name,
        repo_url: repoData.html_url,
        health_score: healthResult.totalScore,
        health_grade: healthResult.grade,
        badge_url: badgeUrl,
        badge_markdown: badgeMarkdown,
        risk_level: healthResult.riskLevel,
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        last_commit: formatDate(repoData.pushed_at),
        dashboard_info: 'Go to Storage -> Key-Value Store -> OUTPUT to preview the interactive intelligence platform dashboard.',

        // Security pillar fields
        license_type: repoData.license?.name || 'No License',
        license_risk: healthResult.pillars.security.details.licenseRisk,
        has_security_md: healthResult.pillars.security.details.hasSecurityMd ? 'Yes' : 'No',
        dependabot_enabled: healthResult.pillars.security.details.hasDependabot ? 'Yes' : 'No',

        // Community pillar fields
        open_issues: repoData.open_issues_count,
        closed_issues: healthResult.pillars.community.details.closedIssues,
        issue_close_ratio: `${healthResult.pillars.community.details.issueCloseRatio}%`,
        has_contributing_md: healthResult.pillars.community.details.hasContributing ? 'Yes' : 'No',
        subscribers: repoData.subscribers_count,

        // Documentation pillar fields
        has_docs_folder: healthResult.pillars.documentation.details.hasDocsFolder ? 'Yes' : 'No',
        has_changelog: healthResult.pillars.documentation.details.hasChangelog ? 'Yes' : 'No',
        has_examples: healthResult.pillars.documentation.details.hasExamples ? 'Yes' : 'No',
        has_wiki: healthResult.pillars.documentation.details.hasWiki ? 'Yes' : 'No',

        // Automation pillar fields
        workflow_count: healthResult.pillars.automation.details.workflowCount,
        has_pr_template: healthResult.pillars.automation.details.hasPRTemplate ? 'Yes' : 'No',
        has_issue_template: healthResult.pillars.automation.details.hasIssueTemplate ? 'Yes' : 'No',
        has_code_of_conduct: healthResult.pillars.automation.details.hasCodeOfConduct ? 'Yes' : 'No',

        // Detailed scores (7 pillars)
        readability_score: healthResult.pillars.readability.score,
        stability_score: healthResult.pillars.stability.score,
        security_score: healthResult.pillars.security.score,
        community_score: healthResult.pillars.community.score,
        maintainability_score: healthResult.pillars.maintainability.score,
        documentation_score: healthResult.pillars.documentation.score,
        automation_score: healthResult.pillars.automation.score,

        // Recommendations
        recommendation_count: healthResult.recommendationCount,
        recommendations: healthResult.recommendations,
        top_recommendations: healthResult.recommendations.slice(0, 3).map(r =>
            `[${r.priority}] ${r.issue.substring(0, 45)}${r.issue.length > 45 ? '...' : ''}`
        ).join(' | '),

        // Pillar rows for vertical display
        pillar_rows: [
            { metric: 'Overall Health Index', value: `${healthResult.totalScore}/100`, grade: healthResult.grade },
            { metric: 'Readability (15%)', value: `${healthResult.pillars.readability.score}/100`, status: healthResult.pillars.readability.score >= 70 ? 'Optimal' : 'Needs Attention' },
            { metric: 'Stability (15%)', value: `${healthResult.pillars.stability.score}/100`, status: healthResult.pillars.stability.score >= 70 ? 'Optimal' : 'Needs Attention' },
            { metric: 'Security (15%)', value: `${healthResult.pillars.security.score}/100`, status: healthResult.pillars.security.score >= 70 ? 'Optimal' : 'Needs Attention' },
            { metric: 'Community (10%)', value: `${healthResult.pillars.community.score}/100`, status: healthResult.pillars.community.score >= 70 ? 'Optimal' : 'Needs Attention' },
            { metric: 'Maintainability (15%)', value: `${healthResult.pillars.maintainability.score}/100`, status: healthResult.pillars.maintainability.score >= 70 ? 'Optimal' : 'Needs Attention' },
            { metric: 'Documentation (15%)', value: `${healthResult.pillars.documentation.score}/100`, status: healthResult.pillars.documentation.score >= 70 ? 'Optimal' : 'Needs Attention' },
            { metric: 'Automation (15%)', value: `${healthResult.pillars.automation.score}/100`, status: healthResult.pillars.automation.score >= 70 ? 'Optimal' : 'Needs Attention' },
        ],

        // Metadata
        description: repoData.description || '',
        language: repoData.language || 'Unknown',
        created_at: formatDate(repoData.created_at),
        default_branch: repoData.default_branch,
        is_fork: repoData.fork,
        is_archived: repoData.archived,

        // UNIFIED REPOSITORY INTELLIGENCE DATA MODEL (6.22)
        repository_metadata: {
            id: repoData.id,
            name: repoData.name,
            full_name: repoData.full_name,
            owner: repoData.owner?.login,
            html_url: repoData.html_url,
            description: repoData.description || '',
            stargazers_count: repoData.stargazers_count,
            forks_count: repoData.forks_count,
            open_issues_count: repoData.open_issues_count,
            subscribers_count: repoData.subscribers_count,
            default_branch: repoData.default_branch,
            created_at: repoData.created_at,
            updated_at: repoData.updated_at,
            pushed_at: repoData.pushed_at,
            size_kb: repoData.size,
            license: repoData.license,
            is_fork: repoData.fork,
            is_archived: repoData.archived,
            is_private: repoData.private,
        },
        health_analysis: {
            status: 'completed',
            total_score: healthResult.totalScore,
            grade: healthResult.grade,
            risk_level: healthResult.riskLevel,
            pillars: healthResult.pillars,
        },
        technology_stack: techStackAnalysis,
        architecture: architectureAnalysis,
        data_flow: dataFlowAnalysis,
        repository_structure: structureAnalysis,
        language_distribution: languageDistribution,
        dependencies: dependencyAnalysis,
        activity: activityAnalysis,
        contributors: contributorAnalysis,
        releases: releaseAnalysis,
        issues_and_prs: issuesPrsAnalysis,
        security: securityAnalysis,
        licenses: licenseAnalysis,
        code_quality: structureAnalysis.code_complexity,
        evolution: evolutionAnalysis,
        sbom: {
            status: sbomAnalysis.status,
            total_components: sbomAnalysis.total_components,
            cyclonedx_json: sbomAnalysis.cyclonedx_json,
            spdx_json: sbomAnalysis.spdx_json,
        },
        reproducibility: reproducibilityAnalysis,
        accessibility: a11yAnalysis,
        recommendations: healthResult.recommendations,
        scan_metadata: {
            scanner: 'Apify-GitHub-Repository-Intelligence-Platform',
            version: '2.0.0',
            analyzed_at: new Date().toISOString(),
            git_tree_truncated: treeResult.truncated || false,
            api_requests_tracked: true,
        }
    };

    return normalizedRecord;
}

