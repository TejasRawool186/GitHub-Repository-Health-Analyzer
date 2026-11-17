/**
 * Interactive System Architecture Diagram Generator
 * Deterministically constructs architectural nodes, layers, and edges from repository files.
 */

/**
 * Build repository architecture model
 * @param {Object} options - Inputs: treePaths, packageJson, techStack, dockerfileContent, workflows
 * @returns {Object} Architecture graph specification with nodes, edges, legend, and evidence
 */
export function generateArchitectureGraph({
    treePaths = [],
    packageJson = null,
    techStack = {},
    dockerfileContent = '',
    workflows = [],
}) {
    const nodes = [];
    const edges = [];
    const detectedLayers = new Set();
    const pathsSet = new Set(treePaths);

    // Track component buckets
    const frontendFiles = [];
    const backendFiles = [];
    const apiFiles = [];
    const databaseFiles = [];
    const infraFiles = [];
    const testFiles = [];

    // Scan paths for architectural evidence
    for (const p of treePaths) {
        const lower = p.toLowerCase();

        // Frontend components & pages
        if (
            lower.includes('components/') ||
            lower.includes('pages/') ||
            lower.includes('app/') ||
            lower.includes('views/') ||
            lower.includes('src/ui/') ||
            lower.endsWith('.jsx') ||
            lower.endsWith('.tsx') ||
            lower.endsWith('.vue') ||
            lower.endsWith('.svelte')
        ) {
            frontendFiles.push(p);
        }

        // Backend services & business logic
        if (
            lower.includes('controllers/') ||
            lower.includes('services/') ||
            lower.includes('handlers/') ||
            lower.includes('routes/') ||
            lower.includes('server/') ||
            lower.includes('backend/') ||
            lower.includes('src/api/') ||
            lower.includes('middleware/')
        ) {
            backendFiles.push(p);
        }

        // API routes and endpoints
        if (
            lower.includes('api/') ||
            lower.includes('routes/') ||
            lower.includes('endpoints/') ||
            lower.includes('trpc') ||
            lower.includes('graphql') ||
            lower.endsWith('router.js') ||
            lower.endsWith('router.ts')
        ) {
            apiFiles.push(p);
        }

        // Database & persistence
        if (
            lower.includes('models/') ||
            lower.includes('schemas/') ||
            lower.includes('migrations/') ||
            lower.includes('prisma/') ||
            lower.includes('database/') ||
            lower.includes('entities/') ||
            lower.endsWith('.sql')
        ) {
            databaseFiles.push(p);
        }

        // Infrastructure
        if (
            lower.includes('docker') ||
            lower.includes('k8s') ||
            lower.includes('kubernetes') ||
            lower.includes('terraform') ||
            lower.includes('.github/workflows') ||
            lower.endsWith('makefile')
        ) {
            infraFiles.push(p);
        }

        // Tests
        if (
            lower.includes('test/') ||
            lower.includes('tests/') ||
            lower.includes('__tests__/') ||
            lower.includes('.spec.') ||
            lower.includes('.test.')
        ) {
            testFiles.push(p);
        }
    }

    // Technology helpers from techStack
    const techMap = new Map();
    if (techStack.technologies && Array.isArray(techStack.technologies)) {
        for (const t of techStack.technologies) {
            techMap.set(t.name.toLowerCase(), t);
        }
    }

    // Node 1: Client / User Entry
    nodes.push({
        id: 'client_entry',
        label: 'Client / User Browser',
        category: 'Client Layer',
        type: 'client',
        iconSlug: 'googlechrome',
        description: 'End-user client interaction layer',
        files: frontendFiles.slice(0, 5),
        fileCount: frontendFiles.length,
        inferred: false,
    });
    detectedLayers.add('Client Layer');

    // Node 2: Frontend Layer (if detected)
    if (frontendFiles.length > 0 || techMap.has('react') || techMap.has('next.js') || techMap.has('vue.js') || techMap.has('svelte') || techMap.has('angular')) {
        const feTech = techMap.get('next.js') || techMap.get('react') || techMap.get('vue.js') || techMap.get('svelte') || techMap.get('angular') || { name: 'Frontend UI', iconSlug: 'html5' };
        nodes.push({
            id: 'frontend_layer',
            label: `Frontend (${feTech.name})`,
            category: 'Frontend',
            type: 'frontend',
            iconSlug: feTech.iconSlug || 'react',
            description: 'UI rendering, views, and client components',
            files: frontendFiles.slice(0, 10),
            fileCount: frontendFiles.length,
            inferred: false,
        });
        detectedLayers.add('Frontend');

        edges.push({
            id: 'e_client_fe',
            source: 'client_entry',
            target: 'frontend_layer',
            label: 'Renders UI',
            relationshipType: 'HTTPS / DOM',
            inferred: false,
            evidence: 'Client entry to Frontend components',
        });
    }

    // Node 3: API Gateway / Router Layer
    if (apiFiles.length > 0 || frontendFiles.length > 0 || backendFiles.length > 0) {
        nodes.push({
            id: 'api_layer',
            label: 'API Gateway & Routing',
            category: 'API Layer',
            type: 'api',
            iconSlug: 'fastapi',
            description: 'HTTP request dispatching, middleware, validation',
            files: apiFiles.slice(0, 10),
            fileCount: apiFiles.length,
            inferred: apiFiles.length === 0,
        });
        detectedLayers.add('API Layer');

        const sourceId = nodes.find(n => n.id === 'frontend_layer') ? 'frontend_layer' : 'client_entry';
        edges.push({
            id: 'e_fe_api',
            source: sourceId,
            target: 'api_layer',
            label: 'API Requests / REST / RPC',
            relationshipType: 'HTTP / JSON',
            inferred: false,
            evidence: 'Client/Frontend to API endpoints',
        });
    }

    // Node 4: Backend Services / Business Logic
    const beTech = techMap.get('node.js') || techMap.get('fastapi') || techMap.get('django') || techMap.get('express') || techMap.get('spring boot') || techMap.get('gin') || { name: 'Core Application Services', iconSlug: 'nodedotjs' };
    nodes.push({
        id: 'backend_layer',
        label: `Backend Service (${beTech.name})`,
        category: 'Backend',
        type: 'backend',
        iconSlug: beTech.iconSlug || 'nodedotjs',
        description: 'Business logic execution, processors, and controllers',
        files: backendFiles.slice(0, 10),
        fileCount: backendFiles.length,
        inferred: backendFiles.length === 0,
    });
    detectedLayers.add('Backend');

    edges.push({
        id: 'e_api_be',
        source: 'api_layer',
        target: 'backend_layer',
        label: 'Dispatches Handlers',
        relationshipType: 'Internal Controller Call',
        inferred: false,
        evidence: 'API router invoking business logic',
    });

    // Node 5: Database / Persistence Layer (if detected)
    const dbTech = techMap.get('postgresql') || techMap.get('mongodb') || techMap.get('mysql') || techMap.get('redis') || techMap.get('sqlite') || techMap.get('prisma orm');
    if (dbTech || databaseFiles.length > 0) {
        const dbName = dbTech ? dbTech.name : 'Data Persistence';
        const dbIcon = dbTech ? dbTech.iconSlug : 'database';
        nodes.push({
            id: 'database_layer',
            label: `Database (${dbName})`,
            category: 'Database',
            type: 'database',
            iconSlug: dbIcon,
            description: 'State persistence, queries, ORM models and transactions',
            files: databaseFiles.slice(0, 10),
            fileCount: databaseFiles.length,
            inferred: !dbTech,
        });
        detectedLayers.add('Database');

        edges.push({
            id: 'e_be_db',
            source: 'backend_layer',
            target: 'database_layer',
            label: 'Queries & Mutations',
            relationshipType: 'TCP / Connection Pool',
            inferred: !dbTech,
            evidence: 'Backend service accessing database models',
        });
    }

    // Node 6: External Integrations (Cloud, AI/ML, External APIs)
    const extTech = techMap.get('aws') || techMap.get('openai api') || techMap.get('google cloud') || techMap.get('sentry') || techMap.get('hugging face');
    if (extTech) {
        nodes.push({
            id: 'external_layer',
            label: `External Service (${extTech.name})`,
            category: 'External Services',
            type: 'external',
            iconSlug: extTech.iconSlug || 'cloud',
            description: 'Third-party cloud APIs and SDK integrations',
            files: [extTech.detectionSource || 'manifests'],
            fileCount: 1,
            inferred: false,
        });
        detectedLayers.add('External Services');

        edges.push({
            id: 'e_be_ext',
            source: 'backend_layer',
            target: 'external_layer',
            label: 'External SDK Call',
            relationshipType: 'HTTPS API',
            inferred: false,
            evidence: `Declared dependency ${extTech.name}`,
        });
    }

    // Node 7: DevOps & CI/CD Infrastructure
    if (infraFiles.length > 0 || techMap.has('docker') || techMap.has('github actions') || techMap.has('kubernetes')) {
        nodes.push({
            id: 'infra_layer',
            label: 'DevOps & CI/CD Pipelines',
            category: 'Infrastructure',
            type: 'infra',
            iconSlug: 'githubactions',
            description: 'Build automation, containers, testing, and deployment',
            files: infraFiles.slice(0, 10),
            fileCount: infraFiles.length,
            inferred: false,
        });
        detectedLayers.add('Infrastructure');

        edges.push({
            id: 'e_infra_be',
            source: 'infra_layer',
            target: 'backend_layer',
            label: 'Builds & Tests',
            relationshipType: 'CI Automation',
            inferred: false,
            evidence: 'GitHub Actions / Dockerfiles in repository',
        });
    }

    return {
        status: 'completed',
        total_components: nodes.length,
        total_connections: edges.length,
        layers: Array.from(detectedLayers),
        nodes,
        edges,
        legend: [
            { category: 'Client Layer', color: '#B8FF63', description: 'User interfaces and entry points' },
            { category: 'Frontend', color: '#61DAFB', description: 'UI framework components' },
            { category: 'API Layer', color: '#F59E0B', description: 'Routing, middleware, gateways' },
            { category: 'Backend', color: '#10B981', description: 'Business logic & services' },
            { category: 'Database', color: '#3B82F6', description: 'Persistence, models & schemas' },
            { category: 'External Services', color: '#EC4899', description: 'External cloud APIs' },
            { category: 'Infrastructure', color: '#8B5CF6', description: 'Containers, CI/CD, orchestration' },
        ],
        evidence_summary: {
            frontend_files_count: frontendFiles.length,
            backend_files_count: backendFiles.length,
            api_files_count: apiFiles.length,
            database_files_count: databaseFiles.length,
            infra_files_count: infraFiles.length,
            test_files_count: testFiles.length,
        }
    };
}

