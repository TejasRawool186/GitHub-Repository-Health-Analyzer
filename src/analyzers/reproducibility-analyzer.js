/**
 * Reproducibility & Development Environment Audit Analyzer
 * Assesses how easily a developer can reproduce and bootstrap the repository locally or in containers.
 */

/**
 * Audit development environment reproducibility
 * @param {Object} options - Inputs: treePaths, packageJson, workflows
 * @returns {Object} Reproducibility audit results and score
 */
export function analyzeReproducibility({
    treePaths = [],
    packageJson = null,
    workflows = [],
}) {
    const pathsSet = new Set(treePaths);
    const checklist = [];
    let earnedPoints = 0;

    // 1. Runtime Version Pinning
    const runtimeFiles = ['.nvmrc', '.node-version', '.python-version', 'runtime.txt', '.ruby-version', 'rust-toolchain', 'rust-toolchain.toml'];
    const detectedRuntimeFile = runtimeFiles.find(f => pathsSet.has(f));
    const hasEngines = Boolean(packageJson?.engines?.node || packageJson?.engines?.python);
    const hasRuntimePinning = Boolean(detectedRuntimeFile || hasEngines);

    checklist.push({
        name: 'Runtime Version Pinning',
        status: hasRuntimePinning ? 'enabled' : 'disabled',
        file: detectedRuntimeFile || (hasEngines ? 'package.json (engines)' : 'Missing (.nvmrc / .python-version)'),
        scoreImpact: 15,
        description: 'Pinning language runtime version prevents obscure syntax or engine mismatch errors across machines',
        recommendation: 'Add .nvmrc, .python-version, or define package.json engines',
    });
    if (hasRuntimePinning) earnedPoints += 15;

    // 2. Package Lockfile Presence
    const lockfiles = ['package-lock.json', 'pnpm-lock.yaml', 'yarn.lock', 'poetry.lock', 'Cargo.lock', 'Pipfile.lock', 'go.sum'];
    const detectedLockfile = lockfiles.find(f => pathsSet.has(f));
    const hasLockfile = Boolean(detectedLockfile);

    checklist.push({
        name: 'Package Manager Lockfile',
        status: hasLockfile ? 'enabled' : 'disabled',
        file: detectedLockfile || 'Missing lockfile',
        scoreImpact: 20,
        description: 'Guarantees that exact sub-dependencies and cryptographic hashes are mirrored across dev and CI',
        recommendation: 'Commit your package-lock.json, pnpm-lock.yaml, or poetry.lock file into git',
    });
    if (hasLockfile) earnedPoints += 20;

    // 3. Containerization (Dockerfile)
    const containerFiles = ['Dockerfile', 'Containerfile', 'Dockerfile.dev'];
    const detectedDockerfile = containerFiles.find(f => pathsSet.has(f));
    const hasDocker = Boolean(detectedDockerfile);

    checklist.push({
        name: 'Containerization (Dockerfile)',
        status: hasDocker ? 'enabled' : 'disabled',
        file: detectedDockerfile || 'Missing Dockerfile',
        scoreImpact: 15,
        description: 'Provides isolated, reproducible OS and system library baseline',
        recommendation: 'Create a Dockerfile specifying base image and build steps',
    });
    if (hasDocker) earnedPoints += 15;

    // 4. Multi-Service Orchestration (Docker Compose)
    const composeFiles = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];
    const detectedCompose = composeFiles.find(f => pathsSet.has(f));
    const hasCompose = Boolean(detectedCompose);

    checklist.push({
        name: 'Multi-Service Orchestration (Docker Compose)',
        status: hasCompose ? 'enabled' : 'disabled',
        file: detectedCompose || 'Missing compose file',
        scoreImpact: 10,
        description: 'Permits one-command launch of database, cache, and service containers',
        recommendation: 'Add docker-compose.yml for local backing services like PostgreSQL or Redis',
    });
    if (hasCompose) earnedPoints += 10;

    // 5. VS Code / Dev Container Specification
    const devContainerFiles = ['.devcontainer/devcontainer.json', '.devcontainer.json'];
    const detectedDevContainer = devContainerFiles.find(f => pathsSet.has(f) || treePaths.some(p => p.startsWith('.devcontainer/')));
    const hasDevContainer = Boolean(detectedDevContainer);

    checklist.push({
        name: 'Dev Container Specification',
        status: hasDevContainer ? 'enabled' : 'disabled',
        file: detectedDevContainer || 'Missing .devcontainer/',
        scoreImpact: 10,
        description: 'Enables instant browser or VS Code development via GitHub Codespaces',
        recommendation: 'Add .devcontainer/devcontainer.json with pre-configured extensions and linters',
    });
    if (hasDevContainer) earnedPoints += 10;

    // 6. Environment Template (.env.example)
    const envExamples = ['.env.example', '.env.sample', '.env.template', '.env.dist'];
    const detectedEnv = envExamples.find(f => pathsSet.has(f));
    const hasEnvExample = Boolean(detectedEnv);

    checklist.push({
        name: 'Environment Variable Example Template',
        status: hasEnvExample ? 'enabled' : 'disabled',
        file: detectedEnv || 'Missing .env.example',
        scoreImpact: 15,
        description: 'Documents required configuration parameters and secrets without leaking values',
        recommendation: 'Provide .env.example documenting all required environment variables',
    });
    if (hasEnvExample) earnedPoints += 15;

    // 7. Setup & Automation Scripts
    const scriptFiles = ['Makefile', 'setup.sh', 'bootstrap.sh', 'Taskfile.yml', 'Justfile'];
    const detectedScript = scriptFiles.find(f => pathsSet.has(f));
    const hasScripts = Boolean(detectedScript || packageJson?.scripts?.setup || packageJson?.scripts?.build);

    checklist.push({
        name: 'Automated Setup & Build Scripts',
        status: hasScripts ? 'enabled' : 'disabled',
        file: detectedScript || (packageJson?.scripts?.setup ? 'package.json (setup script)' : 'Missing setup automation'),
        scoreImpact: 15,
        description: 'Standardized single command to install tools, seed databases, and build assets',
        recommendation: 'Add a Makefile or npm run setup script with initialization steps',
    });
    if (hasScripts) earnedPoints += 15;

    const reproducibilityScore = Math.min(earnedPoints, 100);

    return {
        status: 'completed',
        reproducibility_score: reproducibilityScore,
        readiness_rating: reproducibilityScore >= 80 ? 'Production Ready' : reproducibilityScore >= 50 ? 'Moderate Effort Required' : 'Manual Setup Dependent',
        checklist,
        recommendations: checklist.filter(c => c.status === 'disabled').map(c => ({
            feature: c.name,
            impact: `+${c.scoreImpact} pts`,
            recommendation: c.recommendation,
        })),
    };
}

