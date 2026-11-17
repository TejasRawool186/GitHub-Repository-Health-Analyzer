/**
 * License Compatibility & Compliance Matrix Analyzer
 * Evaluates repository and dependency licenses, families, and policy conflicts.
 */

// Classification of common software licenses into families
const LICENSE_FAMILIES = {
    // Permissive
    'mit': { family: 'Permissive', risk: 'Low', commercial: true, patentGrant: false },
    'apache-2.0': { family: 'Permissive', risk: 'Low', commercial: true, patentGrant: true },
    'bsd-2-clause': { family: 'Permissive', risk: 'Low', commercial: true, patentGrant: false },
    'bsd-3-clause': { family: 'Permissive', risk: 'Low', commercial: true, patentGrant: false },
    'isc': { family: 'Permissive', risk: 'Low', commercial: true, patentGrant: false },
    'unlicense': { family: 'Permissive', risk: 'Low', commercial: true, patentGrant: false },
    'cc0-1.0': { family: 'Permissive', risk: 'Low', commercial: true, patentGrant: false },

    // Weak Copyleft
    'lgpl-2.1': { family: 'Weak Copyleft', risk: 'Medium', commercial: true, patentGrant: false },
    'lgpl-3.0': { family: 'Weak Copyleft', risk: 'Medium', commercial: true, patentGrant: true },
    'mpl-2.0': { family: 'Weak Copyleft', risk: 'Medium', commercial: true, patentGrant: true },
    'epl-2.0': { family: 'Weak Copyleft', risk: 'Medium', commercial: true, patentGrant: true },

    // Strong Copyleft
    'gpl-2.0': { family: 'Strong Copyleft', risk: 'High', commercial: false, patentGrant: false },
    'gpl-3.0': { family: 'Strong Copyleft', risk: 'High', commercial: false, patentGrant: true },
    'agpl-3.0': { family: 'Network Copyleft', risk: 'High', commercial: false, patentGrant: true },
    'sspl': { family: 'Source Available', risk: 'High', commercial: false, patentGrant: false },
};

/**
 * Classify a license string into family and risk
 */
export function classifyLicense(spdxOrName) {
    if (!spdxOrName || spdxOrName === 'Unspecified' || spdxOrName === 'none' || spdxOrName === 'NOASSERTION') {
        return { family: 'Unknown / Unlicensed', risk: 'High', commercial: false, name: 'Unspecified' };
    }

    const key = spdxOrName.toLowerCase().trim();
    if (LICENSE_FAMILIES[key]) {
        return { ...LICENSE_FAMILIES[key], name: spdxOrName };
    }

    // Heuristics
    if (key.includes('mit')) return { family: 'Permissive', risk: 'Low', commercial: true, name: spdxOrName };
    if (key.includes('apache')) return { family: 'Permissive', risk: 'Low', commercial: true, name: spdxOrName };
    if (key.includes('bsd')) return { family: 'Permissive', risk: 'Low', commercial: true, name: spdxOrName };
    if (key.includes('agpl')) return { family: 'Network Copyleft', risk: 'High', commercial: false, name: spdxOrName };
    if (key.includes('gpl')) return { family: 'Strong Copyleft', risk: 'High', commercial: false, name: spdxOrName };

    return { family: 'Custom / Other', risk: 'Medium', commercial: false, name: spdxOrName };
}

/**
 * Analyze repository licenses and dependency compliance matrix
 * @param {Object} options - Inputs: repoData, treePaths, dependencies
 * @returns {Object} License matrix intelligence
 */
export function analyzeLicenseCompliance({
    repoData = {},
    treePaths = [],
    dependencies = [],
}) {
    const pathsSet = new Set(treePaths);
    const repoSpdx = repoData.license?.spdx_id || (repoData.license?.name ? 'Custom' : null);
    const repoLicenseClass = classifyLicense(repoSpdx);

    // Check for attribution files (NOTICE, AUTHORS, CREDITS)
    const hasNotice = pathsSet.has('NOTICE') || pathsSet.has('NOTICE.md') || pathsSet.has('NOTICE.txt');
    const hasAuthors = pathsSet.has('AUTHORS') || pathsSet.has('AUTHORS.md');
    const hasCredits = pathsSet.has('CREDITS') || pathsSet.has('CREDITS.md');

    // Aggregate dependency licenses
    const licenseCounts = {};
    const familyCounts = {
        'Permissive': 0,
        'Weak Copyleft': 0,
        'Strong Copyleft': 0,
        'Network Copyleft': 0,
        'Custom / Other': 0,
        'Unknown / Unlicensed': 0,
    };

    const conflictWarnings = [];
    const dependencyLicenseRows = [];

    for (const dep of dependencies) {
        const depLicense = dep.license || 'Unspecified';
        const classification = classifyLicense(depLicense);

        licenseCounts[depLicense] = (licenseCounts[depLicense] || 0) + 1;
        familyCounts[classification.family] = (familyCounts[classification.family] || 0) + 1;

        // Check compatibility conflicts:
        // If repo is Permissive (MIT/Apache), but has Strong Copyleft GPL production dependency,
        // derivative works may be legally infected by GPL requirements.
        if (
            repoLicenseClass.family === 'Permissive' &&
            dep.scope === 'production' &&
            (classification.family === 'Strong Copyleft' || classification.family === 'Network Copyleft')
        ) {
            conflictWarnings.push({
                package: dep.name,
                packageLicense: depLicense,
                repoLicense: repoSpdx,
                conflictType: 'Copyleft Viral Inheritance',
                severity: 'High',
                description: `Production dependency ${dep.name} uses ${depLicense} which may impose copyleft disclosure requirements on the ${repoSpdx} repository if distributed.`,
            });
        }

        dependencyLicenseRows.push({
            name: dep.name,
            version: dep.resolvedVersion || dep.declaredVersion,
            ecosystem: dep.ecosystem,
            scope: dep.scope,
            license: depLicense,
            family: classification.family,
            risk: classification.risk,
        });
    }

    // License distribution for charts
    const distribution = Object.entries(licenseCounts).map(([name, count]) => ({
        license: name,
        count,
        percentage: dependencies.length > 0 ? Math.round((count / dependencies.length) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    return {
        status: 'completed',
        repository_license: {
            spdx_id: repoSpdx || 'NOASSERTION',
            name: repoData.license?.name || 'No License Declared',
            url: repoData.license?.url || null,
            family: repoLicenseClass.family,
            risk_level: repoLicenseClass.risk,
            has_license_file: pathsSet.has('LICENSE') || pathsSet.has('LICENSE.md') || pathsSet.has('LICENSE.txt') || pathsSet.has('COPYING'),
            has_notice_file: hasNotice,
            has_authors_file: hasAuthors,
            has_credits_file: hasCredits,
        },
        family_breakdown: familyCounts,
        license_distribution: distribution,
        dependency_licenses: dependencyLicenseRows.slice(0, 50),
        potential_policy_conflicts: conflictWarnings,
        has_conflicts: conflictWarnings.length > 0,
        disclaimer: 'This automated compliance analysis identifies declared license identifiers using heuristic parsing. It does not constitute legal counsel, formal intellectual property advice, or a binding copyright certification.',
    };
}

