/**
 * Repository Relationship & Technology Ecosystem Map Aggregator
 * Builds cross-repository network graphs mapping shared dependencies, languages, frameworks, and forks.
 */

/**
 * Aggregate cross-repository ecosystem graph
 * @param {Array<Object>} repoAnalyses - Array of normalized repository analysis records
 * @returns {Object} Graph dataset with nodes, edges, clusters, and shared dependencies
 */
export function aggregateEcosystemMap(repoAnalyses = []) {
    if (!repoAnalyses || repoAnalyses.length === 0) {
        return {
            status: 'unavailable',
            message: 'No repositories provided for ecosystem mapping',
            nodes: [],
            edges: [],
            clusters: [],
        };
    }

    const nodes = [];
    const edges = [];
    const clusters = {};

    // 1. Repository nodes
    for (const r of repoAnalyses) {
        const repoName = r.repository_metadata?.name || r.repo_name;
        const fullName = r.repository_metadata?.full_name || r.repo_name;
        const primaryLang = r.repository_metadata?.language || 'Other';

        nodes.push({
            id: `repo_${fullName}`,
            label: repoName,
            fullName,
            type: 'repository',
            health_score: r.health_score || r.health_analysis?.total_score || 0,
            language: primaryLang,
            stars: r.stars || r.repository_metadata?.stargazers_count || 0,
            isFork: Boolean(r.repository_metadata?.fork),
        });

        if (!clusters[primaryLang]) {
            clusters[primaryLang] = [];
        }
        clusters[primaryLang].push(fullName);
    }

    // 2. Discover shared languages and dependencies between pairs
    for (let i = 0; i < repoAnalyses.length; i++) {
        for (let j = i + 1; j < repoAnalyses.length; j++) {
            const r1 = repoAnalyses[i];
            const r2 = repoAnalyses[j];

            const name1 = r1.repository_metadata?.full_name || r1.repo_name;
            const name2 = r2.repository_metadata?.full_name || r2.repo_name;

            const tech1 = new Set(r1.technology_stack?.technologies?.map(t => t.name) || []);
            const tech2 = new Set(r2.technology_stack?.technologies?.map(t => t.name) || []);

            const sharedTech = [];
            for (const t of tech1) {
                if (tech2.has(t)) {
                    sharedTech.push(t);
                }
            }

            // Shared dependencies
            const deps1 = new Set(r1.dependencies?.dependencies?.map(d => d.name) || []);
            const deps2 = new Set(r2.dependencies?.dependencies?.map(d => d.name) || []);
            const sharedDeps = [];
            for (const d of deps1) {
                if (deps2.has(d)) {
                    sharedDeps.push(d);
                }
            }

            // If shared tech or shared dependencies, create an edge
            if (sharedTech.length > 0 || sharedDeps.length > 0) {
                edges.push({
                    id: `edge_${name1}_${name2}`,
                    source: `repo_${name1}`,
                    target: `repo_${name2}`,
                    weight: sharedTech.length + sharedDeps.length,
                    sharedTechnologies: sharedTech,
                    sharedDependencies: sharedDeps.slice(0, 10),
                    label: sharedTech.slice(0, 3).join(', ') || `${sharedDeps.length} shared packages`,
                });
            }
        }
    }

    return {
        status: 'completed',
        total_repositories: repoAnalyses.length,
        total_relationships: edges.length,
        nodes,
        edges,
        clusters: Object.entries(clusters).map(([lang, repos]) => ({
            clusterName: lang,
            repositoryCount: repos.length,
            repositories: repos,
        })),
        disclaimer: 'Relationships represent deterministic overlap in programming languages, shared package manifests, and common framework dependencies.',
    };
}

