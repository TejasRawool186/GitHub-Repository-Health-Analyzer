/**
 * Software Bill of Materials (SBOM) Generator
 * Generates CycloneDX 1.5 JSON and SPDX 2.3 JSON compliant specifications.
 */

/**
 * Generate CycloneDX 1.5 and SPDX 2.3 JSON SBOM documents
 * @param {Object} repoData - Repository metadata
 * @param {Array<Object>} dependencies - Parsed dependencies list
 * @returns {Object} SBOM documents and download payloads
 */
export function generateSbomDocuments(repoData, dependencies = []) {
    const timestamp = new Date().toISOString();
    const repoName = repoData.name || 'unnamed-repository';
    const repoOwner = repoData.owner?.login || 'unknown-owner';
    const repoFullName = repoData.full_name || `${repoOwner}/${repoName}`;

    // 1. CycloneDX 1.5 JSON
    const cycloneDx = {
        bomFormat: 'CycloneDX',
        specVersion: '1.5',
        serialNumber: `urn:uuid:${generateSimpleUuid()}`,
        version: 1,
        metadata: {
            timestamp,
            tools: [
                {
                    vendor: 'Apify',
                    name: 'GitHub Repository Intelligence Platform',
                    version: '2.0.0',
                }
            ],
            component: {
                type: 'application',
                name: repoFullName,
                version: '1.0.0',
                description: repoData.description || 'GitHub Repository',
                licenses: repoData.license?.spdx_id ? [
                    { license: { id: repoData.license.spdx_id } }
                ] : [],
            }
        },
        components: dependencies.map(dep => ({
            type: 'library',
            name: dep.name,
            version: dep.resolvedVersion || dep.declaredVersion || 'unknown',
            purl: dep.purl || `pkg:${dep.ecosystem}/${dep.name}`,
            scope: dep.scope === 'development' ? 'optional' : 'required',
            licenses: dep.license && dep.license !== 'Unspecified' ? [
                { license: { name: dep.license } }
            ] : [],
            properties: [
                { name: 'apify:direct', value: String(dep.direct) },
                { name: 'apify:ecosystem', value: dep.ecosystem },
                { name: 'apify:sourceFile', value: dep.sourceFile || 'manifest' }
            ]
        }))
    };

    // 2. SPDX 2.3 JSON
    const spdx = {
        spdxVersion: 'SPDX-2.3',
        dataLicense: 'CC0-1.0',
        SPDXID: 'SPDXRef-DOCUMENT',
        name: `${repoFullName}-SBOM`,
        documentNamespace: `https://apify.com/spdx/${repoOwner}/${repoName}/${Date.now()}`,
        creationInfo: {
            created: timestamp,
            creators: [
                'Tool: Apify-GitHub-Repository-Intelligence-Platform-2.0.0'
            ]
        },
        packages: [
            {
                SPDXID: 'SPDXRef-RootPackage',
                name: repoFullName,
                versionInfo: '1.0.0',
                downloadLocation: repoData.html_url || 'NOASSERTION',
                filesAnalyzed: false,
                licenseConcluded: repoData.license?.spdx_id || 'NOASSERTION',
                description: repoData.description || '',
            },
            ...dependencies.map((dep, idx) => ({
                SPDXID: `SPDXRef-Package-${idx + 1}-${sanitizeSpdxId(dep.name)}`,
                name: dep.name,
                versionInfo: dep.resolvedVersion || dep.declaredVersion || 'NOASSERTION',
                downloadLocation: 'NOASSERTION',
                filesAnalyzed: false,
                licenseConcluded: dep.license && dep.license !== 'Unspecified' ? dep.license : 'NOASSERTION',
                externalRefs: [
                    {
                        referenceCategory: 'PACKAGE-MANAGER',
                        referenceType: 'purl',
                        referenceLocator: dep.purl || `pkg:${dep.ecosystem}/${dep.name}`,
                    }
                ]
            }))
        ],
        relationships: dependencies.map((dep, idx) => ({
            spdxElementId: 'SPDXRef-RootPackage',
            relatedSpdxElement: `SPDXRef-Package-${idx + 1}-${sanitizeSpdxId(dep.name)}`,
            relationshipType: dep.scope === 'development' ? 'DEV_DEPENDENCY_OF' : 'DEPENDS_ON',
        }))
    };

    return {
        status: 'completed',
        total_components: dependencies.length,
        cyclonedx_json: cycloneDx,
        spdx_json: spdx,
        cyclonedx_formatted: JSON.stringify(cycloneDx, null, 2),
        spdx_formatted: JSON.stringify(spdx, null, 2),
    };
}

function generateSimpleUuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

function sanitizeSpdxId(name) {
    return (name || 'pkg').replace(/[^a-zA-Z0-9-.]/g, '-');
}

