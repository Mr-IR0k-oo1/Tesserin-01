/**
 * Tesserin Preload Script
 *
 * Exposes a safe `window.tesserin` API to the renderer process.
 * All communication with the main process goes through IPC channels.
 */
declare const tesserinAPI: {
    db: {
        notes: {
            list: () => any;
            get: (id: string) => any;
            create: (data: {
                title?: string;
                content?: string;
                folderId?: string;
            }) => any;
            update: (id: string, data: {
                title?: string;
                content?: string;
                folderId?: string;
                isPinned?: boolean;
            }) => any;
            delete: (id: string) => any;
            search: (query: string) => any;
            getByTitle: (title: string) => any;
        };
        tags: {
            list: () => any;
            create: (name: string, color?: string) => any;
            delete: (id: string) => any;
            addToNote: (noteId: string, tagId: string) => any;
            removeFromNote: (noteId: string, tagId: string) => any;
            getForNote: (noteId: string) => any;
        };
        folders: {
            list: () => any;
            create: (name: string, parentId?: string) => any;
            rename: (id: string, name: string) => any;
            delete: (id: string) => any;
        };
        tasks: {
            list: () => any;
            create: (data: {
                title: string;
                noteId?: string;
                columnId?: string;
                priority?: number;
                dueDate?: string;
            }) => any;
            update: (id: string, data: Record<string, unknown>) => any;
            delete: (id: string) => any;
        };
        templates: {
            list: () => any;
            get: (id: string) => any;
            create: (data: {
                name: string;
                content: string;
                category?: string;
            }) => any;
            delete: (id: string) => any;
        };
        settings: {
            get: (key: string) => any;
            set: (key: string, value: string) => any;
            getAll: () => any;
        };
        canvases: {
            list: () => any;
            get: (id: string) => any;
            create: (data: {
                id?: string;
                name?: string;
                elements?: string;
                appState?: string;
                files?: string;
            }) => any;
            update: (id: string, data: {
                name?: string;
                elements?: string;
                appState?: string;
                files?: string;
            }) => any;
            delete: (id: string) => any;
        };
        clear: () => any;
    };
    ai: {
        chat: (messages: Array<{
            role: string;
            content: string;
        }>, model?: string) => any;
        chatStream: (messages: Array<{
            role: string;
            content: string;
        }>, model?: string) => {
            onChunk: (callback: (chunk: string) => void) => void;
            onDone: (callback: () => void) => void;
            onError: (callback: (error: string) => void) => void;
            cancel: () => void;
        };
        summarize: (text: string, model?: string) => any;
        generateTags: (text: string, model?: string) => any;
        suggestLinks: (content: string, existingTitles: string[], model?: string) => any;
        checkConnection: () => any;
        listModels: () => any;
        openRouterStream: (messages: Array<{
            role: string;
            content: string;
        }>) => {
            onChunk: (callback: (chunk: string) => void) => void;
            onDone: (callback: () => void) => void;
            onError: (callback: (error: string) => void) => void;
            cancel: () => void;
        };
        listOpenRouterModels: (apiKey?: string) => any;
    };
    window: {
        minimize: () => any;
        maximize: () => any;
        close: () => any;
        isMaximized: () => any;
    };
    mcp: {
        connect: (config: {
            id: string;
            name: string;
            transport: "stdio" | "sse";
            command?: string;
            args?: string[];
            env?: Record<string, string>;
            url?: string;
            enabled: boolean;
        }) => any;
        disconnect: (serverId: string) => any;
        callTool: (serverId: string, toolName: string, args: Record<string, unknown>) => any;
        getStatuses: () => any;
        getTools: () => any;
        getServerTools: (serverId: string) => any;
    };
    fs: {
        readDir: (dirPath: string) => Promise<Array<{
            name: string;
            path: string;
            isDirectory: boolean;
        }>>;
        readFile: (filePath: string) => Promise<string>;
        writeFile: (filePath: string, content: string) => any;
        writeBuffer: (filePath: string, base64Data: string) => Promise<void>;
        stat: (filePath: string) => Promise<{
            size: number;
            isDirectory: boolean;
            isFile: boolean;
            modified: string;
        }>;
        mkdir: (dirPath: string) => Promise<void>;
        delete: (filePath: string) => Promise<void>;
    };
    shell: {
        exec: (command: string, cwd?: string) => Promise<{
            stdout: string;
            stderr: string;
            exitCode: number;
        }>;
    };
    dialog: {
        openFolder: () => Promise<string | null>;
        saveFile: (options: {
            title?: string;
            defaultPath?: string;
            filters?: Array<{
                name: string;
                extensions: string[];
            }>;
        }) => Promise<string | null>;
    };
    ppt: {
        generate: (specOrMarkdown: Record<string, unknown> | string, outputPath: string) => Promise<string>;
    };
    api: {
        keys: {
            list: () => any;
            create: (data: {
                name: string;
                permissions?: string[];
                expiresAt?: string;
            }) => any;
            revoke: (id: string) => any;
            delete: (id: string) => any;
        };
        server: {
            start: (port?: number) => any;
            stop: () => any;
            status: () => Promise<{
                running: boolean;
                port: number;
            }>;
        };
    };
    agents: {
        list: () => any;
        statuses: () => any;
        register: (type: string, config?: Record<string, unknown>) => any;
        update: (id: string, updates: Record<string, unknown>) => any;
        remove: (id: string) => any;
        connect: (id: string) => any;
        disconnect: (id: string) => any;
        callTool: (agentId: string, toolName: string, args: Record<string, unknown>) => any;
        getTools: (agentId: string) => any;
        createToken: (agentId: string, name: string, permissions?: string[], expiresAt?: string) => any;
        getTokens: (agentId: string) => any;
        revokeToken: (agentId: string, tokenId: string) => any;
    };
    kb: {
        graph: () => any;
        export: () => any;
        search: (query: string, maxChunks?: number) => any;
        context: (maxNotes?: number) => any;
        noteConnections: (noteId: string) => any;
    };
    onCanvasUpdated: (callback: (canvasId: string) => void) => (_e: Electron.IpcRendererEvent, canvasId: string) => void;
    offCanvasUpdated: (handler: (...args: any[]) => void) => void;
    updater: {
        check: () => any;
        download: () => any;
        install: () => any;
        onStatus: (callback: (status: unknown) => void) => (_e: Electron.IpcRendererEvent, status: unknown) => void;
        offStatus: (handler: (...args: any[]) => void) => void;
    };
    terminal: {
        spawn: (id: string, cwd?: string) => Promise<{
            success: boolean;
            pid?: number;
            error?: string;
        }>;
        write: (id: string, data: string) => Promise<boolean>;
        resize: (id: string, cols: number, rows: number) => Promise<boolean>;
        kill: (id: string) => Promise<boolean>;
        onData: (id: string, callback: (data: string) => void) => (_e: Electron.IpcRendererEvent, termId: string, data: string) => void;
        offData: (handler: (...args: any[]) => void) => void;
    };
};
export type TesserinAPI = typeof tesserinAPI;
export {};
//# sourceMappingURL=preload.d.ts.map