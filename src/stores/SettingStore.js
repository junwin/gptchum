import { defineStore } from 'pinia';
import DataService from "../DataService.js";

const isProd = process.env.NODE_ENV === 'production';

const DEFAULT_BASE_URL = 'http://localhost:5000';

const THEME_KEY = 'gptchum_theme';
const AGENT_KEY = 'gptchum_agent';
const CONTEXT_KEY = 'gptchum_context';
const API_KEY_KEY = 'gptchum_api_key';
const BASE_URL_KEY = 'gptchum_base_url';
const ACCOUNT_KEY = 'gptchum_account';

function applyThemeToDocument(theme) {
    if (typeof document === 'undefined') return;
    if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
    } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
    }
}

function loadString(key, fallback = '') {
    try {
        return localStorage.getItem(key) || fallback;
    } catch (e) {
        return fallback;
    }
}

function saveString(key, value) {
    try {
        if (value) {
            localStorage.setItem(key, value);
        } else {
            localStorage.removeItem(key);
        }
    } catch (e) {
        // ignore storage errors
    }
}

export const useSettingStore = defineStore('settings', {
    state: () => {
        let persistedTheme = 'light';
        try {
            const t = localStorage.getItem(THEME_KEY);
            if (t === 'dark' || t === 'light') persistedTheme = t;
        } catch (e) { /* ignore */ }

        applyThemeToDocument(persistedTheme);

        const savedBaseUrl = loadString(BASE_URL_KEY, DEFAULT_BASE_URL);
        const ds = new DataService(savedBaseUrl);

        return {
            version: '1.0.0',
            environment: process.env.NODE_ENV,
            serviceBaseUrl: savedBaseUrl,
            dataService: ds,
            agentName: loadString(AGENT_KEY, 'lucy'),
            accountName: loadString(ACCOUNT_KEY),
            contextName: loadString(CONTEXT_KEY),
            apiKey: loadString(API_KEY_KEY),
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
        getApiKey(state) {
            return state.apiKey;
        },
        getTheme(state) {
            return state.theme;
        },
        getServiceBaseUrl(state) {
            return state.serviceBaseUrl;
        },
    },
    actions: {
        setData(newDataService) {
            this.dataService = newDataService;
        },
        setAgentName(newAgentName) {
            this.agentName = newAgentName || 'lucy';
            saveString(AGENT_KEY, this.agentName);
        },
        setAccountName(newAccountName) {
            this.accountName = newAccountName || '';
            saveString(ACCOUNT_KEY, this.accountName);
        },
        setContextName(newContextName) {
            this.contextName = newContextName || '';
            saveString(CONTEXT_KEY, this.contextName);
        },
        setApiKey(newApiKey) {
            this.apiKey = newApiKey || '';
            saveString(API_KEY_KEY, this.apiKey);
        },
        setServiceBaseUrl(newUrl) {
            const url = (newUrl || '').trim() || DEFAULT_BASE_URL;
            this.serviceBaseUrl = url;
            saveString(BASE_URL_KEY, url);
            // Recreate the data service with the new URL
            this.dataService = new DataService(url);
        },
        setTheme(newTheme) {
            if (newTheme !== 'light' && newTheme !== 'dark') return;
            this.theme = newTheme;
            try {
                localStorage.setItem(THEME_KEY, newTheme);
            } catch (e) { /* ignore */ }
            applyThemeToDocument(newTheme);
        },
        toggleTheme() {
            const next = this.theme === 'dark' ? 'light' : 'dark';
            this.setTheme(next);
        },
    },
});
