import { analyzeRepoTree } from './src/analyzers/tree-analyzer.js';
import { detectTechStack } from './src/analyzers/tech-stack-analyzer.js';
import { generateArchitectureGraph } from './src/analyzers/architecture-analyzer.js';
import { generateDataFlowDiagrams } from './src/analyzers/data-flow-analyzer.js';
import { analyzeDependencies } from './src/analyzers/dependency-analyzer.js';
import { generateSbomDocuments } from './src/analyzers/sbom-generator.js';
import { analyzeSecurityConfiguration } from './src/analyzers/security-analyzer.js';
import { analyzeLicenseCompliance } from './src/analyzers/license-analyzer.js';
import { analyzeActivityTimeline } from './src/analyzers/activity-analyzer.js';
import { analyzeContributors } from './src/analyzers/contributor-analyzer.js';
import { analyzeReleasesAndVersions } from './src/analyzers/releases-analyzer.js';
import { analyzeIssuesAndPrs } from './src/analyzers/issues-prs-analyzer.js';
import { analyzeReproducibility } from './src/analyzers/reproducibility-analyzer.js';
import { analyzeAccessibilityAndLocalization } from './src/analyzers/accessibility-analyzer.js';
import { analyzeEvolution } from './src/analyzers/evolution-analyzer.js';
import { aggregateComparison } from './src/aggregators/comparison-aggregator.js';
import { aggregateEcosystemMap } from './src/aggregators/ecosystem-aggregator.js';
import { aggregatePortfolioLeaderboard } from './src/aggregators/portfolio-aggregator.js';
import { generateCombinedDashboard } from './src/dashboard-generator.js';

// Mock repository tree
const mockTree = [
    { path: 'package.json', type: 'blob', size: 1024 },
    { path: 'package-lock.json', type: 'blob', size: 50000 },
    { path: 'src/main.ts', type: 'blob', size: 2500 },
    { path: 'src/components/Button.tsx', type: 'blob', size: 1200 },
    { path: 'src/api/routes.ts', type: 'blob', size: 3000 },
    { path: 'src/services/user.ts', type: 'blob', size: 4000 },
    { path: 'prisma/schema.prisma', type: 'blob', size: 1500 },
    { path: 'Dockerfile', type: 'blob', size: 450 },
    { path: 'docker-compose.yml', type: 'blob', size: 800 },
    { path: '.github/workflows/ci.yml', type: 'blob', size: 1200 },
    { path: 'SECURITY.md', type: 'blob', size: 600 },
    { path: '.github/dependabot.yml', type: 'blob', size: 300 },
    { path: 'tests/unit.test.ts', type: 'blob', size: 1800 },
    { path: 'docs/index.md', type: 'blob', size: 2000 },
    { path: 'CHANGELOG.md', type: 'blob', size: 3500 },
];

const mockPackageJson = {
    name: 'test-app',
    dependencies: { react: '^18.2.0', next: '^14.0.0', '@prisma/client': '^5.0.0' },
    devDependencies: { typescript: '^5.0.0', vitest: '^1.0.0', 'eslint-plugin-jsx-a11y': '^6.8.0' }
};

const mockRepoData = {
    id: 12345,
    name: 'test-app',
    full_name: 'test-owner/test-app',
    html_url: 'https://github.com/test-owner/test-app',
    stargazers_count: 500,
    forks_count: 80,
    open_issues_count: 5,
    language: 'TypeScript',
    license: { spdx_id: 'MIT', name: 'MIT License' },
    pushed_at: new Date().toISOString(),
    created_at: '2024-01-01T00:00:00Z',
};

const treeAnalysis = analyzeRepoTree(mockTree, [{ content: '// TODO: test marker\nconst x = 1;' }]);
const techAnalysis = detectTechStack({ treePaths: mockTree.map(t => t.path), packageJson: mockPackageJson });
const archAnalysis = generateArchitectureGraph({ treePaths: mockTree.map(t => t.path), packageJson: mockPackageJson, techStack: techAnalysis });
const dfAnalysis = generateDataFlowDiagrams({ treePaths: mockTree.map(t => t.path) });
const depAnalysis = analyzeDependencies({ treePaths: mockTree.map(t => t.path), packageJson: mockPackageJson });
const sbomAnalysis = generateSbomDocuments(mockRepoData, depAnalysis.dependencies);
const secAnalysis = analyzeSecurityConfiguration({ treePaths: mockTree.map(t => t.path), repoData: mockRepoData });
const licAnalysis = analyzeLicenseCompliance({ repoData: mockRepoData, treePaths: mockTree.map(t => t.path), dependencies: depAnalysis.dependencies });
const actAnalysis = analyzeActivityTimeline([{ sha: 'abc1234', commit: { author: { date: new Date().toISOString() }, message: 'Initial commit' } }], mockRepoData);
const conAnalysis = analyzeContributors([{ login: 'alice', contributions: 80 }, { login: 'bob', contributions: 20 }], mockRepoData);
const relAnalysis = analyzeReleasesAndVersions([{ tag_name: 'v1.0.0', published_at: new Date().toISOString() }], [{ name: 'v1.0.0' }], mockRepoData);
const issAnalysis = analyzeIssuesAndPrs({ repoData: mockRepoData, openIssues: [], closedIssues: [], openPrs: [], closedPrs: [] });
const repAnalysis = analyzeReproducibility({ treePaths: mockTree.map(t => t.path), packageJson: mockPackageJson });
const a11Analysis = analyzeAccessibilityAndLocalization({ treePaths: mockTree.map(t => t.path), packageJson: mockPackageJson });
const evoAnalysis = analyzeEvolution({ repoData: mockRepoData, treeSummary: treeAnalysis, dependencies: depAnalysis.dependencies });

console.log('Tree analysis total files:', treeAnalysis.total_files);
console.log('Tech stack detected:', techAnalysis.total_technologies);
console.log('Arch components:', archAnalysis.total_components);
console.log('Dependencies count:', depAnalysis.total_dependencies);
console.log('CycloneDX components:', sbomAnalysis.cyclonedx_json.components.length);
console.log('SPDX packages:', sbomAnalysis.spdx_json.packages.length);
console.log('Security readiness score:', secAnalysis.security_readiness_score);
console.log('Bus factor:', conAnalysis.bus_factor.value);
console.log('Reproducibility score:', repAnalysis.reproducibility_score);

// Build mock full record
const mockRecord = {
    repo_name: mockRepoData.full_name,
    repo_url: mockRepoData.html_url,
    health_score: 90,
    health_grade: 'A+',
    risk_level: 'Low Risk',
    stars: 500,
    forks: 80,
    last_commit: '2026-11-15',
    license_type: 'MIT License',
    has_security_md: 'Yes',
    dependabot_enabled: 'Yes',
    workflow_count: 1,
    recommendation_count: 1,
    recommendations: [{ priority: 'Medium', category: 'Documentation', issue: 'Missing CHANGELOG.md', action: 'Add CHANGELOG.md', impact: '+15 points' }],
    pillar_rows: [
        { metric: 'Overall Health Index', value: '90/100', grade: 'A+' },
        { metric: 'Readability', value: '90/100', status: 'Optimal' },
        { metric: 'Stability', value: '85/100', status: 'Optimal' },
        { metric: 'Security', value: '95/100', status: 'Optimal' },
        { metric: 'Community', value: '80/100', status: 'Optimal' },
        { metric: 'Maintainability', value: '90/100', status: 'Optimal' },
        { metric: 'Documentation', value: '85/100', status: 'Optimal' },
        { metric: 'Automation', value: '90/100', status: 'Optimal' }
    ],
    repository_metadata: mockRepoData,
    technology_stack: techAnalysis,
    architecture: archAnalysis,
    data_flow: dfAnalysis,
    repository_structure: treeAnalysis,
    language_distribution: { primary_language: 'TypeScript', languages: [{ language: 'TypeScript', bytes: 10000, percentage: 100 }] },
    dependencies: depAnalysis,
    activity: actAnalysis,
    contributors: conAnalysis,
    releases: relAnalysis,
    issues_and_prs: issAnalysis,
    security: secAnalysis,
    licenses: licAnalysis,
    code_quality: treeAnalysis.code_complexity,
    evolution: evoAnalysis,
    sbom: sbomAnalysis,
    reproducibility: repAnalysis,
    accessibility: a11Analysis
};

const dashboardHtml = generateCombinedDashboard([mockRecord]);
console.log('Generated Dashboard HTML length:', dashboardHtml.length);

const sections = [
    'sec-overview', 'sec-architecture', 'sec-dataflow', 'sec-techstack',
    'sec-codebase', 'sec-languages', 'sec-dependencies', 'sec-activity',
    'sec-contributors', 'sec-releases', 'sec-issues-prs', 'sec-security',
    'sec-licenses', 'sec-codequality', 'sec-comparison', 'sec-ecosystem',
    'sec-evolution', 'sec-sbom', 'sec-portfolio', 'sec-reproducibility',
    'sec-recommendations'
];

let allSectionsPresent = true;
for (const sec of sections) {
    if (!dashboardHtml.includes('id="' + sec + '"')) {
        console.error('Missing section:', sec);
        allSectionsPresent = false;
    }
}

if (allSectionsPresent) {
    console.log('SUCCESS: All 21 navigation sections verified in generated HTML dashboard!');
} else {
    console.error('FAILURE: Some sections missing!');
    process.exit(1);
}

