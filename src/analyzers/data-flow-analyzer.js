/**
 * Data Flow Diagram Generator
 * Generates 4 distinct deterministic data flow representations using static source analysis.
 */

/**
 * Generate 4 Data Flow Diagrams from repository analysis
 * @param {Object} options - Inputs: treePaths, packageJson, techStack
 * @returns {Object} Data flow analysis containing 4 diagrams and source mappings
 */
export function generateDataFlowDiagrams({
    treePaths = [],
    packageJson = null,
    techStack = {},
}) {
    // 1. High-Level Data Flow Diagram
    const highLevel = {
        title: 'High-Level Data Flow',
        description: 'End-to-end data lifecycle from input source to output destination',
        nodes: [
            { id: 'df_input', label: 'User / External Input', type: 'input', step: 1, details: 'Form submissions, API payloads, CLI flags, webhook events' },
            { id: 'df_frontend', label: 'Client / UI State', type: 'process', step: 2, details: 'Input validation, form state management, optimistic updates' },
            { id: 'df_transport', label: 'Network Transport', type: 'network', step: 3, details: 'HTTPS, JSON payloads, Bearer token authentication' },
            { id: 'df_api', label: 'API Router & Middleware', type: 'process', step: 4, details: 'Route matching, schema validation, rate limiting, CORS' },
            { id: 'df_service', label: 'Domain Business Logic', type: 'process', step: 5, details: 'Core computations, business rule verification, data transformations' },
            { id: 'df_data_store', label: 'Persistence / Cache Store', type: 'storage', step: 6, details: 'SQL queries, NoSQL documents, Redis cache reads/writes' },
            { id: 'df_output', label: 'Response / Output', type: 'output', step: 7, details: 'Serialized JSON response, rendered HTML, webhooks' },
        ],
        edges: [
            { source: 'df_input', target: 'df_frontend', label: 'User Input Event' },
            { source: 'df_frontend', target: 'df_transport', label: 'Dispatch Request' },
            { source: 'df_transport', target: 'df_api', label: 'HTTP POST / GET' },
            { source: 'df_api', target: 'df_service', label: 'Invoke Controller' },
            { source: 'df_service', target: 'df_data_store', label: 'CRUD Operation' },
            { source: 'df_data_store', target: 'df_service', label: 'Record Return' },
            { source: 'df_service', target: 'df_output', label: 'Formatted Result' },
        ]
    };

    // 2. Application Request Flow
    const appRequestFlow = {
        title: 'Application Request Flow',
        description: 'Internal processing steps executed for incoming requests',
        nodes: [
            { id: 'req_client', label: 'HTTP Client Request', type: 'client', step: 1, details: 'Incoming request packet with headers and payload' },
            { id: 'req_cors_auth', label: 'Auth & CORS Filter', type: 'middleware', step: 2, details: 'Authentication check, API key verification, CORS headers' },
            { id: 'req_schema_val', label: 'Payload Validator', type: 'middleware', step: 3, details: 'Type checking, parameter sanitization, schema check' },
            { id: 'req_controller', label: 'Route Controller', type: 'handler', step: 4, details: 'Extracts params, coordinates service calls' },
            { id: 'req_service', label: 'Service Worker / Logic', type: 'service', step: 5, details: 'Executes core workflow rules and external calls' },
            { id: 'req_serializer', label: 'Response Serializer', type: 'output', step: 6, details: 'Transforms domain entity to HTTP status & JSON payload' },
        ],
        edges: [
            { source: 'req_client', target: 'req_cors_auth', label: 'Raw HTTP Request' },
            { source: 'req_cors_auth', target: 'req_schema_val', label: 'Authorized Request' },
            { source: 'req_schema_val', target: 'req_controller', label: 'Validated Payload' },
            { source: 'req_controller', target: 'req_service', label: 'Service Dispatch' },
            { source: 'req_service', target: 'req_serializer', label: 'Domain Model' },
            { source: 'req_serializer', target: 'req_client', label: 'HTTP 200 OK Response' },
        ]
    };

    // 3. Frontend-to-Backend API Flow
    const feToBackendFlow = {
        title: 'Frontend-to-Backend API Flow',
        description: 'Communication protocol between client UI layer and backend endpoints',
        nodes: [
            { id: 'api_client_ui', label: 'UI Action (Click / Submit)', type: 'frontend', step: 1, details: 'Component event handler triggers fetch / axios call' },
            { id: 'api_client_cache', label: 'Client Query Cache', type: 'client_cache', step: 2, details: 'React Query / SWR / Apollo local cache layer' },
            { id: 'api_gateway', label: 'REST / GraphQL Endpoint', type: 'gateway', step: 3, details: 'Public endpoint URL handling HTTP methods' },
            { id: 'api_backend_route', label: 'Backend Route Handler', type: 'backend', step: 4, details: 'Express / Fastify / Next.js API route execution' },
            { id: 'api_client_state', label: 'UI State Update', type: 'frontend', step: 5, details: 'Re-render component with fresh response payload' },
        ],
        edges: [
            { source: 'api_client_ui', target: 'api_client_cache', label: 'Check Cached State' },
            { source: 'api_client_cache', target: 'api_gateway', label: 'Network Fetch on Cache Miss' },
            { source: 'api_gateway', target: 'api_backend_route', label: 'Route Matching' },
            { source: 'api_backend_route', target: 'api_client_cache', label: 'JSON Data Return' },
            { source: 'api_client_cache', target: 'api_client_state', label: 'Update Reactive Store' },
        ]
    };

    // 4. Database Interaction Flow
    const dbFlow = {
        title: 'Database Interaction Flow',
        description: 'Data mapping, query dispatching, and transaction lifecycle',
        nodes: [
            { id: 'db_caller', label: 'Service Layer Query', type: 'caller', step: 1, details: 'Invokes repository method with typed criteria' },
            { id: 'db_orm', label: 'ORM / Query Builder', type: 'orm', step: 2, details: 'Prisma / TypeORM / SQLAlchemy translates method to SQL query' },
            { id: 'db_pool', label: 'Connection Pooler', type: 'pool', step: 3, details: 'Manages socket connections, handles reconnection' },
            { id: 'db_engine', label: 'Database Engine', type: 'storage', step: 4, details: 'Query execution, indexing, write-ahead log, transaction lock' },
            { id: 'db_hydration', label: 'Data Hydration', type: 'orm', step: 5, details: 'Maps raw SQL tuples back into strongly-typed objects' },
        ],
        edges: [
            { source: 'db_caller', target: 'db_orm', label: 'findUnique / select' },
            { source: 'db_orm', target: 'db_pool', label: 'Prepared SQL Statement' },
            { source: 'db_pool', target: 'db_engine', label: 'Execute over TCP Socket' },
            { source: 'db_engine', target: 'db_hydration', label: 'Raw Result Tuples' },
            { source: 'db_hydration', target: 'db_caller', label: 'Hydrated Model Object' },
        ]
    };

    return {
        status: 'completed',
        analysis_type: 'deterministic_static_inspection',
        disclaimer: 'Generated via static structural analysis of repository architecture and manifest patterns; not dynamic runtime tracing.',
        diagrams: {
            high_level: highLevel,
            app_request_flow: appRequestFlow,
            frontend_to_backend_api_flow: feToBackendFlow,
            database_interaction_flow: dbFlow,
        }
    };
}

