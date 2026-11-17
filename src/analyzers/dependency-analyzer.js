/**
 * Dependency Ecosystem & Package Analyzer
 * Analyzes manifests and lockfiles across npm, pnpm, yarn, pip, poetry, go, cargo, maven, gradle.
 */

/**
 * Determine if a version range is unpinned / broad
 */
export function isBroadVersionRange(versionStr) {
    if (!versionStr) return true;
    const v = versionStr.trim();
    if (v === '*' || v === 'latest' || v === 'x' || v === 'X') return true;
    if (v.startsWith('>=')) return true;
    if (v.includes('||')) return true;
    return false;
}

/**
 * Classify version type: 'pinned', 'caret', 'tilde', 'broad', 'url'
 */
export function classifyVersionSpecifier(versionStr) {
    if (!versionStr) return 'unspecified';
    const v = versionStr.trim();
    if (isBroadVersionRange(v)) return 'broad';
    if (v.startsWith('^')) return 'caret';
    if (v.startsWith('~')) return 'tilde';
    if (v.startsWith('http') || v.startsWith('git') || v.startsWith('file:')) return 'url';
    if (/^[0-9]/.test(v)) return 'pinned';
    return 'other';
}

/**
 * Generate standard Package URL (PURL)
 */
export function generatePurl(ecosystem, name, version) {
    const cleanEcosystem = (ecosystem || 'generic').toLowerCase();
    const cleanName = encodeURIComponent(name);
    const cleanVer = version ? `@${encodeURIComponent(version)}` : '';
    return `pkg:${cleanEcosystem}/${cleanName}${cleanVer}`;
}

/**
 * Parse dependency manifests and lockfiles
 * @param {Object} options - Inputs: treePaths, packageJson, packageLockJson, requirementsTxt, pyprojectToml, goMod, cargoToml
 * @returns {Object} Structured dependency intelligence
 */
export function analyzeDependencies({
    treePaths = [],
    packageJson = null,
    packageLockJson = null,
    requirementsTxt = '',
    pyprojectToml = '',
    goMod = '',
    cargoToml = '',
}) {
    const pathsSet = new Set(treePaths);
    const dependenciesList = [];
    const ecosystemsDetected = new Set();
    const missingLockfiles = [];

    let hasPackageJson = Boolean(packageJson);
    let hasNpmLock = pathsSet.has('package-lock.json') || pathsSet.has('npm-shrinkwrap.json');
    let hasYarnLock = pathsSet.has('yarn.lock');
    let hasPnpmLock = pathsSet.has('pnpm-lock.yaml') || pathsSet.has('pnpm-lock.yml');

    // 1. JavaScript / Node.js Ecosystem
    if (hasPackageJson) {
        ecosystemsDetected.add('npm');

        if (!hasNpmLock && !hasYarnLock && !hasPnpmLock) {
            missingLockfiles.push({
                ecosystem: 'npm',
                manifest: 'package.json',
                recommendedLockfile: 'package-lock.json or pnpm-lock.yaml',
                impact: 'Build non-reproducibility and potential dependency drifting',
            });
        }

        // Map resolved versions from package-lock.json if available
        const resolvedLockMap = new Map();
        if (packageLockJson && packageLockJson.packages) {
            for (const [pkgPath, pkgData] of Object.entries(packageLockJson.packages)) {
                if (pkgPath && pkgData.version) {
                    const cleanName = pkgPath.replace(/^node_modules\//, '');
                    resolvedLockMap.set(cleanName, {
                        version: pkgData.version,
                        license: pkgData.license || null,
                        dev: Boolean(pkgData.dev),
                    });
                }
            }
        }

        const sections = [
            { key: 'dependencies', type: 'production' },
            { key: 'devDependencies', type: 'development' },
            { key: 'peerDependencies', type: 'peer' },
            { key: 'optionalDependencies', type: 'optional' },
        ];

        for (const { key, type } of sections) {
            if (packageJson[key] && typeof packageJson[key] === 'object') {
                for (const [name, declaredVer] of Object.entries(packageJson[key])) {
                    const lockInfo = resolvedLockMap.get(name);
                    const resolvedVer = lockInfo ? lockInfo.version : (declaredVer.replace(/^[^0-9]/, ''));
                    const specType = classifyVersionSpecifier(declaredVer);

                    dependenciesList.push({
                        name,
                        ecosystem: 'npm',
                        scope: type,
                        direct: true,
                        declaredVersion: declaredVer,
                        resolvedVersion: resolvedVer,
                        versionSpecifierType: specType,
                        isUnpinned: specType === 'broad',
                        license: lockInfo?.license || 'Unspecified',
                        purl: generatePurl('npm', name, resolvedVer),
                        sourceFile: 'package.json',
                    });
                }
            }
        }

        // If package-lock has transitive dependencies, capture sample of them
        if (packageLockJson && packageLockJson.packages) {
            for (const [pkgPath, pkgData] of Object.entries(packageLockJson.packages)) {
                if (!pkgPath) continue; // Root package
                const cleanName = pkgPath.replace(/^node_modules\//, '');
                // Skip if already captured as direct
                if (!dependenciesList.some(d => d.name === cleanName && d.direct)) {
                    dependenciesList.push({
                        name: cleanName,
                        ecosystem: 'npm',
                        scope: pkgData.dev ? 'development' : 'production',
                        direct: false,
                        declaredVersion: pkgData.version,
                        resolvedVersion: pkgData.version,
                        versionSpecifierType: 'pinned',
                        isUnpinned: false,
                        license: pkgData.license || 'Unspecified',
                        purl: generatePurl('npm', cleanName, pkgData.version),
                        sourceFile: 'package-lock.json',
                    });
                }
            }
        }
    }

    // 2. Python Ecosystem (requirements.txt / pyproject.toml)
    if (requirementsTxt) {
        ecosystemsDetected.add('pypi');
        const hasPipLock = pathsSet.has('Pipfile.lock') || pathsSet.has('poetry.lock') || pathsSet.has('requirements.lock');
        if (!hasPipLock && !pathsSet.has('uv.lock')) {
            missingLockfiles.push({
                ecosystem: 'pypi',
                manifest: 'requirements.txt',
                recommendedLockfile: 'poetry.lock or uv.lock',
                impact: 'Sub-dependency version drift across environments',
            });
        }

        const lines = requirementsTxt.split('\n');
        for (const line of lines) {
            const clean = line.trim().split('#')[0];
            if (!clean || clean.startsWith('-r') || clean.startsWith('-e')) continue;

            const match = clean.match(/^([a-zA-Z0-9_\-.]+)(?:([=<>!~]+)(.*))?$/);
            if (match) {
                const name = match[1].toLowerCase();
                const op = match[2] || '';
                const ver = match[3] || '';
                const declaredVer = `${op}${ver}`.trim() || '*';
                const isUnpinned = isBroadVersionRange(declaredVer);

                dependenciesList.push({
                    name,
                    ecosystem: 'pypi',
                    scope: 'production',
                    direct: true,
                    declaredVersion: declaredVer,
                    resolvedVersion: ver || declaredVer,
                    versionSpecifierType: classifyVersionSpecifier(declaredVer),
                    isUnpinned,
                    license: 'Unspecified',
                    purl: generatePurl('pypi', name, ver || null),
                    sourceFile: 'requirements.txt',
                });
            }
        }
    }

    // 3. Go Modules (go.mod)
    if (goMod) {
        ecosystemsDetected.add('golang');
        const lines = goMod.split('\n');
        let inRequireBlock = false;

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (line.startsWith('require (')) {
                inRequireBlock = true;
                continue;
            }
            if (inRequireBlock && line.startsWith(')')) {
                inRequireBlock = false;
                continue;
            }

            if (line.startsWith('require ') || inRequireBlock) {
                const clean = line.replace(/^require\s+/, '').trim();
                const isIndirect = clean.includes('// indirect');
                const parts = clean.split(/\s+/);
                if (parts.length >= 2) {
                    const modName = parts[0];
                    const modVer = parts[1];
                    dependenciesList.push({
                        name: modName,
                        ecosystem: 'golang',
                        scope: 'production',
                        direct: !isIndirect,
                        declaredVersion: modVer,
                        resolvedVersion: modVer,
                        versionSpecifierType: 'pinned',
                        isUnpinned: false,
                        license: 'Unspecified',
                        purl: generatePurl('golang', modName, modVer),
                        sourceFile: 'go.mod',
                    });
                }
            }
        }
    }

    // 4. Rust Cargo (Cargo.toml)
    if (cargoToml) {
        ecosystemsDetected.add('cargo');
        const hasCargoLock = pathsSet.has('Cargo.lock');
        if (!hasCargoLock) {
            missingLockfiles.push({
                ecosystem: 'cargo',
                manifest: 'Cargo.toml',
                recommendedLockfile: 'Cargo.lock',
                impact: 'Crate version shifts across compiler runs',
            });
        }
    }

    // Grouping & analytics
    const directCount = dependenciesList.filter(d => d.direct).length;
    const transitiveCount = dependenciesList.filter(d => !d.direct).length;
    const productionCount = dependenciesList.filter(d => d.scope === 'production').length;
    const developmentCount = dependenciesList.filter(d => d.scope === 'development').length;
    const unpinnedCount = dependenciesList.filter(d => d.isUnpinned).length;

    // Build interactive dependency graph representation (up to 50 top deps)
    const graphNodes = [
        { id: 'root_project', label: packageJson?.name || 'Root Application', type: 'project' }
    ];
    const graphEdges = [];

    const sampleDeps = dependenciesList.slice(0, 40);
    for (const dep of sampleDeps) {
        graphNodes.push({
            id: `dep_${dep.name}`,
            label: `${dep.name} (${dep.resolvedVersion || dep.declaredVersion})`,
            type: dep.direct ? 'direct_dep' : 'transitive_dep',
            scope: dep.scope,
            ecosystem: dep.ecosystem,
        });

        graphEdges.push({
            id: `edge_root_${dep.name}`,
            source: 'root_project',
            target: `dep_${dep.name}`,
            label: dep.scope,
        });
    }

    return {
        status: dependenciesList.length > 0 ? 'completed' : 'empty',
        total_dependencies: dependenciesList.length,
        direct_dependencies_count: directCount,
        transitive_dependencies_count: transitiveCount,
        production_count: productionCount,
        development_count: developmentCount,
        unpinned_dependencies_count: unpinnedCount,
        unpinned_ratio_percent: dependenciesList.length > 0 ? Math.round((unpinnedCount / dependenciesList.length) * 100) : 0,
        ecosystems: Array.from(ecosystemsDetected),
        missing_lockfiles: missingLockfiles,
        has_missing_lockfiles: missingLockfiles.length > 0,
        dependencies: dependenciesList,
        dependency_graph: {
            nodes: graphNodes,
            edges: graphEdges,
        }
    };
}

