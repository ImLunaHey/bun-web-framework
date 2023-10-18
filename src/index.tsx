import '@total-typescript/ts-reset';
import { readdirSync, statSync } from 'fs';
import { join as joinPath } from 'path';
import { renderToString } from 'react-dom/server';

export const getAllFiles = (directoryPath: string, arrayOfFiles: string[] = []) => {
    for (const filePath of readdirSync(directoryPath)) {
        // Directory
        if (statSync(joinPath(directoryPath, filePath)).isDirectory()) arrayOfFiles = getAllFiles(joinPath(directoryPath, filePath), arrayOfFiles);
        // File
        else arrayOfFiles.push(joinPath(directoryPath, filePath));
    }

    return arrayOfFiles;
};

const path = joinPath(import.meta.dir, 'pages');
const pages = await Promise.allSettled(
    getAllFiles(path).map(filePath => import(filePath))
).then(results => {
    const _results = results.map(result => result.status === 'fulfilled' ? [result.value.path, result.value.default] as const : null).filter(Boolean);
    return Object.fromEntries(_results) as Record<string, React.FC>;
});

const server = Bun.serve({
    port: process.env.PORT ?? 3000,
    fetch(request, server) {
        const Page = pages[new URL(request.url).pathname];
        if (!Page) return new Response('404');
        return new Response(renderToString(<Page />), {
            headers: {
                'content-type': 'text/html',
            }
        });
    }
});

console.info(`Server listening at http://localhost:${server.port}`);
