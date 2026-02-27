/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_VERSION?: string;
    readonly VITE_GIT_BRANCH?: string;
    readonly VITE_GIT_COMMIT?: string;
    readonly VITE_LOG_LEVEL?: string;
    readonly DEV?: boolean;
    readonly PROD?: boolean;
    readonly SSR?: boolean;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
    readonly hot?: {
        data: Record<string, any>;
    };
}

declare module '*.module.scss' {
    const classes: { readonly [key: string]: string };
    export default classes;
}
