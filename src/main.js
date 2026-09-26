import { createApp } from 'vue'
import App from './App.vue'
import './assets/main.css'
import PrimeVue from 'primevue/config'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import Textarea from 'primevue/textarea'
import { createPinia } from 'pinia'

// PrimeVue theme will be loaded dynamically so the app can toggle light/dark themes at runtime.
// We still load core PrimeVue styles and icons.
import 'primevue/resources/primevue.min.css' // core css
import 'primeicons/primeicons.css' // icons
import 'primeflex/primeflex.css'

// Import theme CSS files as URLs (Vite bundles them as hashed assets for production)
import darkThemeUrl from 'primevue/resources/themes/lara-dark-blue/theme.css?url'
import lightThemeUrl from 'primevue/resources/themes/lara-light-blue/theme.css?url'

// Markdown rendering (safe: no raw HTML) and code highlighting
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'

// Setting store to read persisted theme/context
import { useSettingStore } from './stores/SettingStore.js'

const app = createApp(App)
app.use(PrimeVue)
app.component('InputText', InputText)
app.component('Textarea', Textarea)
app.component('Button', Button)
app.component('Dropdown', Dropdown)
app.component('Dialog', Dialog)

const pinia = createPinia()
app.use(pinia)

// Create settings store instance (reads persisted theme/context on init)
const settings = useSettingStore()

// Provide store globally and on the app config for convenience
app.provide('settings', settings)
app.config.globalProperties.$settings = settings

// Markdown-it configured to disallow raw HTML (html: false) and support code highlighting
const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight: function (str, lang) {
    try {
      if (lang && hljs.getLanguage(lang)) {
        const highlighted = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        return (
          `<pre class="hljs"><code class="language-${md.utils.escapeHtml(lang)}">${highlighted}</code></pre>`
        )
      }
      const auto = hljs.highlightAuto(str)
      const langClass = auto.language ? `language-${md.utils.escapeHtml(auto.language)}` : ''
      return `<pre class="hljs"><code class="${langClass}">${auto.value}</code></pre>`
    } catch (e) {
      return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
    }
  }
})

// expose markdown renderer to components via global property
app.config.globalProperties.$md = md

// --- PrimeVue theme switching ---
// Uses Vite's ?url imports so theme CSS files are bundled as hashed assets
// that resolve correctly in both dev and production (no /node_modules/ dependency).

const THEME_LINK_ID = 'primevue-theme-link'
const themeUrls = {
  dark: darkThemeUrl,
  light: lightThemeUrl
}

function ensureThemeLink() {
  let link = document.getElementById(THEME_LINK_ID)
  if (!link) {
    link = document.createElement('link')
    link.id = THEME_LINK_ID
    link.rel = 'stylesheet'
    document.head.appendChild(link)
  }
  return link
}

function setPrimeVueTheme(theme) {
  const href = themeUrls[theme] || themeUrls.dark
  const link = ensureThemeLink()
  link.href = href
}

// Apply initially
setPrimeVueTheme(settings.theme)

// Watch for theme changes on the settings store and re-apply theme.
let lastTheme = settings.theme
settings.$subscribe((mutation, state) => {
  if (state.theme && state.theme !== lastTheme) {
    lastTheme = state.theme
    setPrimeVueTheme(state.theme)
  }
})

app.mount('#app')
