/**
 * Security Configuration Observatory Analyzer
 * Inspects security manifests, workflows, policies, and GitHub security features.
 */

/**
 * Known security-focused GitHub Action strings
 */
const SECURITY_ACTION_SIGNATURES = [
    { id: 'codeql', name: 'GitHub CodeQL', pattern: 'github/codeql-action' },
    { id: 'dependabot_review', name: 'Dependency Review Action', pattern: 'actions/dependency-review-action' },
    { id: 'trivy', name: 'Aqua Trivy Scanner', pattern: 'aquasecurity/trivy-action' },
    { id: 'snyk', name: 'Snyk Security Scan', pattern: 'snyk/actions' },
    { id: 'sonar', name: 'SonarCloud / SonarQube', pattern: 'sonarsource/sonarcloud-github-action' },
    { id: 'gitleaks', name: 'Gitleaks Secret Detection', pattern: 'gitleaks/gitleaks-action' },
    { id: 'osv', name: 'Google OSV-Scanner', pattern: 'google/osv-scanner-action' },
    { id: 'semgrep', name: 'Semgrep Static Analysis', pattern: 'returntocorp/semgrep-action' },
];

/**
 * Analyze repository security configuration
 * @param {Object} options - Inputs: treePaths, repoData, workflowsData, sampleWorkflows
 * @returns {Object} Security observatory data
 */
export function analyzeSecurityConfiguration({
    treePaths = [],
    repoData = {},
    workflowsData = { workflows: [] },
    sampleWorkflows = [],
}) {
    const pathsSet = new Set(treePaths);
    const checklist = [];
    let earnedPoints = 0;
    const totalMaxPoints = 100;

    // 1. SECURITY.md policy
    const hasSecurityMd = pathsSet.has('SECURITY.md') || pathsSet.has('.github/SECURITY.md') || pathsSet.has('docs/SECURITY.md');
    checklist.push({
        name: 'Vulnerability Disclosure Policy',
        file: hasSecurityMd ? (pathsSet.has('SECURITY.md') ? 'SECURITY.md' : '.github/SECURITY.md') : 'Missing',
        status: hasSecurityMd ? 'enabled' : 'disabled',
        scoreImpact: 20,
        description: 'SECURITY.md file providing instructions for responsible disclosure of security vulnerabilities',
        remediation: 'Create a SECURITY.md in the root or .github directory detailing security contact details and disclosure policy',
    });
    if (hasSecurityMd) earnedPoints += 20;

    // 2. Automated Dependency Scanning (Dependabot)
    const hasDependabot = pathsSet.has('.github/dependabot.yml') || pathsSet.has('.github/dependabot.yaml');
    checklist.push({
        name: 'Dependabot Security Updates',
        file: hasDependabot ? (pathsSet.has('.github/dependabot.yml') ? '.github/dependabot.yml' : '.github/dependabot.yaml') : 'Missing',
        status: hasDependabot ? 'enabled' : 'disabled',
        scoreImpact: 20,
        description: 'Automated monitoring of package dependencies for known CVEs and automated PR fixes',
        remediation: 'Add .github/dependabot.yml configured for your package ecosystems (npm, pip, docker, etc.)',
    });
    if (hasDependabot) earnedPoints += 20;

    // 3. Open Source License Configuration
    const hasLicense = Boolean(repoData.license?.spdx_id);
    checklist.push({
        name: 'Approved Open-Source License',
        file: repoData.license?.spdx_id ? `SPDX: ${repoData.license.spdx_id}` : 'Missing LICENSE',
        status: hasLicense ? 'enabled' : 'disabled',
        scoreImpact: 15,
        description: 'Explicit legal licensing ensuring safe distribution and clarity on liability/warranty',
        remediation: 'Choose and commit an OSI-approved license such as MIT, Apache-2.0, or BSD',
    });
    if (hasLicense) earnedPoints += 15;

    // 4. CodeQL Static Application Security Testing (SAST)
    const hasCodeQlWorkflow = treePaths.some(p => p.toLowerCase().includes('codeql') && p.includes('.github/workflows'));
    checklist.push({
        name: 'CodeQL Static Analysis Workflow',
        file: hasCodeQlWorkflow ? 'Detected in .github/workflows/' : 'Missing',
        status: hasCodeQlWorkflow ? 'enabled' : 'disabled',
        scoreImpact: 15,
        description: 'GitHub advanced code analysis to find common security bugs and query injection flaws',
        remediation: 'Enable GitHub CodeQL analysis workflow to scan pull requests automatically',
    });
    if (hasCodeQlWorkflow) earnedPoints += 15;

    // 5. Dependency Review in CI
    const hasDepReview = treePaths.some(p => p.toLowerCase().includes('dependency-review') && p.includes('.github/workflows'));
    checklist.push({
        name: 'Dependency Review Workflow',
        file: hasDepReview ? 'Detected in .github/workflows/' : 'Missing',
        status: hasDepReview ? 'enabled' : 'disabled',
        scoreImpact: 10,
        description: 'Blocks pull requests that introduce vulnerable or non-compliant new dependencies',
        remediation: 'Add actions/dependency-review-action to pull_request workflows',
    });
    if (hasDepReview) earnedPoints += 10;

    // 6. Security-focused GitHub Actions
    const detectedSecurityActions = [];
    for (const actionSig of SECURITY_ACTION_SIGNATURES) {
        for (const wf of sampleWorkflows) {
            if (wf.content && wf.content.toLowerCase().includes(actionSig.pattern.toLowerCase())) {
                detectedSecurityActions.push({
                    id: actionSig.id,
                    name: actionSig.name,
                    workflowFile: wf.path,
                });
                break;
            }
        }
    }

    const hasThirdPartyScanner = detectedSecurityActions.length > 0;
    checklist.push({
        name: 'Third-Party Security Tooling (Trivy/Snyk/Gitleaks/OSV)',
        file: hasThirdPartyScanner ? detectedSecurityActions.map(a => a.name).join(', ') : 'None detected',
        status: hasThirdPartyScanner ? 'enabled' : 'disabled',
        scoreImpact: 10,
        description: 'Continuous container, container-image, or secret detection via specialized scanning actions',
        remediation: 'Integrate Trivy for container scanning or Gitleaks for commit secret prevention',
    });
    if (hasThirdPartyScanner) earnedPoints += 10;

    // 7. Secret Scanning & Push Protection (Public repo / Admin API status)
    // Note: Secret scanning is enabled by default on public repositories on GitHub
    const isPublic = !repoData.private;
    checklist.push({
        name: 'Secret Scanning & Push Protection',
        file: isPublic ? 'GitHub Public Repo Default' : 'API permission restricted',
        status: isPublic ? 'enabled' : 'unavailable',
        scoreImpact: 10,
        description: 'Detection of exposed tokens, passwords, and private keys before commits are accepted',
        remediation: 'Ensure Secret Scanning and Push Protection are toggled on in Repository Settings > Security',
    });
    if (isPublic) earnedPoints += 10;

    // Calculate final Security Readiness Score
    const securityScore = Math.min(earnedPoints, 100);

    return {
        status: 'completed',
        security_readiness_score: securityScore,
        score_rating: securityScore >= 80 ? 'High Security Posture' : securityScore >= 50 ? 'Moderate Security Posture' : 'Needs Immediate Hardening',
        has_security_md: hasSecurityMd,
        has_dependabot: hasDependabot,
        has_codeql: hasCodeQlWorkflow,
        has_dependency_review: hasDepReview,
        detected_security_actions: detectedSecurityActions,
        checklist,
        recommendations: checklist.filter(c => c.status === 'disabled').map(c => ({
            name: c.name,
            impact: `+${c.scoreImpact} pts`,
            remediation: c.remediation,
        })),
        disclaimer: 'Detecting configuration files and workflows confirms repository security policies and automated pipelines; it does not constitute a certified manual penetration test or full dynamic vulnerability audit.',
    };
}

