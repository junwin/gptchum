import { defineStore } from 'pinia';
import DataService from "../DataService.js";

const isProd = process.env.NODE_ENV === 'production';

//const baseUrl = isProd ? 'https://localhost:5000' : 'http://localhost:5000';
//const baseUrl = isProd ? 'https://localhost:5000' : 'http://localhost:5000';
//const baseUrl = isProd ? 'https://ba40-162-204-226-110.ngrok-free.app'  : 'http://localhost:5000';
//const baseUrl = 'https://localhost:5000';
const baseUrl = 'http://localhost:5000';
const ds = new DataService(baseUrl);

const THEME_KEY = 'gptchum_theme';
const CONTEXT_KEY = 'gptchum_context';

function applyThemeToDocument(theme) {
    if (typeof document === 'undefined') return;
    // Simple approach: add/remove a `dark` class on documentElement. The app's CSS/PrimeVue theme
    // can use this class to switch variables. We keep this minimal and non-opinionated.
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
    }
}

export const useSettingStore = defineStore('settings', {
    state: () => {
        // read persisted values (if present)
        let persistedTheme = 'light';
        let persistedContext = '';
        try {
            const t = localStorage.getItem(THEME_KEY);
            if (t === 'dark' || t === 'light') persistedTheme = t;
            const c = localStorage.getItem(CONTEXT_KEY);
            if (c) persistedContext = c;
        } catch (e) {
            // ignore (e.g., SSR or private mode)
        }

        // apply immediately so theme is reflected on load
        applyThemeToDocument(persistedTheme);

        return {
            version: '1.0.0',
            environment: process.env.NODE_ENV,
            serviceBaseUrl: baseUrl,
            dataService: ds,
            agentName: 'lucy',
            accountName: 'test',
            // Selected or typed context name used for Lucy requests.
            contextName: persistedContext,
            // theme: 'light' | 'dark'
            theme: persistedTheme,
        };
    },
    getters: {
        GetInvLocUrl(state) {
            return state.invLocUrl;
        },
        GetVersion(state) {
            return state.version;
        },
        getAgentName(state) {
            return state.agentName;
        },
        getAccountName(state) {
            return state.accountName;
        },
        getContextName(state) {
            return state.contextName;
        },
        getTheme(state) {
            return state.theme;
        },
    },
    actions: {
        setData(newDataService) {
            this.dataService = newDataService;
        },
        setAgentName(newAgentName) {
            this.agentName = newAgentName;
        },
        setAccountName(newAccountName) {
            this.accountName = newAccountName;
        },
        setContextName(newContextName) {
            this.contextName = newContextName || '';
            try {
                localStorage.setItem(CONTEXT_KEY, this.contextName);
            } catch (e) {
                // ignore storage errors
            }
        },
        setTheme(newTheme) {
            if (newTheme !== 'light' && newTheme !== 'dark') return;
            this.theme = newTheme;
            try {
                localStorage.setItem(THEME_KEY, newTheme);
            } catch (e) {
                // ignore
            }
            applyThemeToDocument(newTheme);
        },
        toggleTheme() {
            const next = this.theme === 'dark' ? 'light' : 'dark';
            this.setTheme(next);
        },
    },
});
