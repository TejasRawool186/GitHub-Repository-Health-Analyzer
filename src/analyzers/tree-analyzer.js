/**
 * Repository File Structure & Code Complexity Analyzer
 * Analyzes repository hierarchy, sizes, extensions, nesting, and complexity markers
 */

/**
 * Format bytes to readable size string
 */
export function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

/**
 * Known file classification rules
 */
const VENDOR_PATTERNS = [
    'node_modules/', 'vendor/', 'dist/', 'build/', '.next/', '.nuxt/',
    'target/', 'out/', '.cache/', 'bundle/', 'coverage/'
];

const CONFIG_FILENAMES = new Set([
    'package.json', 'tsconfig.json', 'jsconfig.json', 'vite.config.js', 'vite.config.ts',
    'webpack.config.js', 'rollup.config.js', 'babel.config.js', '.eslintrc', '.eslintrc.json',
    '.eslintrc.js', 'eslint.config.js', '.prettierrc', 'biome.json', 'Dockerfile',
    'docker-compose.yml', 'compose.yaml', 'Makefile', 'Cargo.toml', 'pyproject.toml',
    'requirements.txt', 'go.mod', 'pom.xml', 'build.gradle', '.gitignore', '.env.example'
]);

const TEST_DIR_PATTERNS = ['test', 'tests', '__tests__', 'spec', 'specs', 'e2e', 'cypress'];
const DOC_DIR_PATTERNS = ['doc', 'docs', 'documentation', 'wiki', 'examples', 'example'];

/**
 * Analyze repository Git tree items
 * @param {Array<Object>} treeItems - Tree array from GitHub Git Trees API
 * @param {Array<Object>} sampleFiles - Any fetched sample file contents for complexity inspection
 * @returns {Object} Structured analysis of tree and complexity
 */
export function analyzeRepoTree(treeItems = [], sampleFiles = []) {
    if (!treeItems || treeItems.length === 0) {
        return {
            status: 'unavailable',
            error: 'No tree items available',
            total_files: 0,
            total_directories: 0,
            total_size_bytes: 0,
            largest_files: [],
            extension_distribution: {},
            directory_hierarchy: {},
            code_complexity: {
                status: 'unavailable',
                nesting_depth_max: 0,
                lines_of_code_estimated: 0,
                todo_fixme_count: 0
            }
        };
    }

    let totalFiles = 0;
    let totalDirectories = 0;
    let totalSizeBytes = 0;
    let maxNestingDepth = 0;

    const extensionStats = {};
    const largestFilesList = [];
    const directorySizes = {};
    const detectedTestDirs = new Set();
    const detectedDocDirs = new Set();
    const detectedConfigFiles = [];
    const detectedVendorFiles = [];

    // Root node for hierarchical visual tree and treemap
    const hierarchyRoot = {
        name: 'root',
        type: 'tree',
        path: '',
        children: {},
        size: 0,
    };

    for (const item of treeItems) {
        const pathParts = item.path.split('/');
        const depth = pathParts.length;
        if (depth > maxNestingDepth) maxNestingDepth = depth;

        const isDir = item.type === 'tree';
        const isFile = item.type === 'blob';
        const size = item.size || 0;

        // Check if under vendor or generated directory
        const isVendor = VENDOR_PATTERNS.some(v => item.path.includes(v));
        if (isVendor) {
            detectedVendorFiles.push(item.path);
        }

        // Build hierarchy tree
        let currentLevel = hierarchyRoot;
        for (let i = 0; i < pathParts.length; i++) {
            const part = pathParts[i];
            const isLast = (i === pathParts.length - 1);

            if (!currentLevel.children[part]) {
                currentLevel.children[part] = {
                    name: part,
                    path: pathParts.slice(0, i + 1).join('/'),
                    type: isLast ? item.type : 'tree',
                    size: 0,
                    children: isLast && isFile ? null : {},
                };
            }
            currentLevel.size += size;
            if (!isLast || !isFile) {
                currentLevel = currentLevel.children[part];
            }
        }

        if (isDir) {
            totalDirectories++;
            const dirLower = item.path.toLowerCase();
            if (TEST_DIR_PATTERNS.some(t => dirLower === t || dirLower.startsWith(`${t}/`))) {
                detectedTestDirs.add(item.path);
            }
            if (DOC_DIR_PATTERNS.some(d => dirLower === d || dirLower.startsWith(`${d}/`))) {
                detectedDocDirs.add(item.path);
            }
        } else if (isFile) {
            totalFiles++;
            totalSizeBytes += size;

            // Track directory sizes
            const parentDir = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'root';
            directorySizes[parentDir] = (directorySizes[parentDir] || 0) + size;

            // Extract extension
            const filename = pathParts[pathParts.length - 1];
            const dotIndex = filename.lastIndexOf('.');
            const ext = dotIndex > 0 ? filename.slice(dotIndex).toLowerCase() : 'no-extension';

            if (!extensionStats[ext]) {
                extensionStats[ext] = { count: 0, bytes: 0 };
            }
            extensionStats[ext].count++;
            extensionStats[ext].bytes += size;

            // Check config files
            if (CONFIG_FILENAMES.has(filename)) {
                detectedConfigFiles.push(item.path);
            }

            // Track largest files
            largestFilesList.push({
                path: item.path,
                filename,
                sizeBytes: size,
                sizeFormatted: formatBytes(size),
                extension: ext,
            });
        }
    }

    // Sort largest files descending
    largestFilesList.sort((a, b) => b.sizeBytes - a.sizeBytes);
    const top20LargestFiles = largestFilesList.slice(0, 20);

    // Format top directories by size
    const topDirectories = Object.entries(directorySizes)
        .map(([dir, bytes]) => ({ directory: dir, sizeBytes: bytes, sizeFormatted: formatBytes(bytes) }))
        .sort((a, b) => b.sizeBytes - a.sizeBytes)
        .slice(0, 15);

    // Complexity and code heuristics
    let estimatedLoc = 0;
    // Common line length heuristic: ~35-45 bytes per LOC across code files
    const codeExtensions = new Set(['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.rb', '.php', '.cs']);
    let totalCodeBytes = 0;

    for (const [ext, stat] of Object.entries(extensionStats)) {
        if (codeExtensions.has(ext)) {
            totalCodeBytes += stat.bytes;
        }
    }
    estimatedLoc = Math.round(totalCodeBytes / 40);

    // Count TODO, FIXME, HACK, BUG from any sample files provided
    let todoCount = 0;
    let fixmeCount = 0;
    let hackCount = 0;
    let noteCount = 0;

    for (const file of sampleFiles) {
        if (file.content) {
            const lines = file.content.split('\n');
            for (const line of lines) {
                const upper = line.toUpperCase();
                if (upper.includes('TODO:')) todoCount++;
                if (upper.includes('FIXME:')) fixmeCount++;
                if (upper.includes('HACK:')) hackCount++;
                if (upper.includes('NOTE:')) noteCount++;
            }
        }
    }

    // Convert hierarchy tree to array format for easy frontend treemap/tree consumption
    function flattenHierarchy(node, maxDepth = 3, currentDepth = 0) {
        if (!node || currentDepth > maxDepth) return null;
        const res = {
            name: node.name,
            path: node.path,
            size: node.size,
            type: node.type,
        };
        if (node.children && Object.keys(node.children).length > 0) {
            res.children = Object.values(node.children)
                .slice(0, 50)
                .map(c => flattenHierarchy(c, maxDepth, currentDepth + 1))
                .filter(Boolean);
        }
        return res;
    }

    const simplifiedTree = flattenHierarchy(hierarchyRoot, 4);

    return {
        status: 'completed',
        total_files: totalFiles,
        total_directories: totalDirectories,
        total_size_bytes: totalSizeBytes,
        total_size_formatted: formatBytes(totalSizeBytes),
        max_nesting_depth: maxNestingDepth,
        test_directories: Array.from(detectedTestDirs),
        documentation_directories: Array.from(detectedDocDirs),
        config_files_count: detectedConfigFiles.length,
        config_files: detectedConfigFiles.slice(0, 30),
        vendor_files_count: detectedVendorFiles.length,
        extension_distribution: extensionStats,
        largest_files: top20LargestFiles,
        largest_directories: topDirectories,
        hierarchy_tree: simplifiedTree,
        code_complexity: {
            status: 'completed',
            estimated_lines_of_code: estimatedLoc,
            code_bytes: totalCodeBytes,
            nesting_depth_max: maxNestingDepth,
            todo_count: todoCount,
            fixme_count: fixmeCount,
            hack_count: hackCount,
            note_count: noteCount,
            total_debt_markers: todoCount + fixmeCount + hackCount,
            analyzed_source_files: sampleFiles.length,
            complexity_rating: maxNestingDepth > 8 ? 'High' : maxNestingDepth > 5 ? 'Moderate' : 'Low',
        }
    };
}

