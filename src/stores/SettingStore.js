import { defineStore } from 'pinia';
import DataService from "../DataService.js";

const isProd = process.env.NODE_ENV === 'production';

const baseUrl = isProd ? 'https://localhost:5000' : 'http://localhost:5000';
const ds = new DataService(baseUrl);

export const useSettingStore = defineStore('settings', {
    state: () => ({
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        serviceBaseUrl: baseUrl,
        dataService: ds,
        agentName: 'lucy',
        accountName: 'test',
    }),
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
    },
    actions: {
        setData(newDataService) {
            this.state.dataService = newDataService;
        },
        setAgentName(newAgentName) {
            this.state.agentName = newAgentName;
        },
        setAccountName(newAccountName) {
            this.state.accountName = newAccountName;
        },
    },
});
