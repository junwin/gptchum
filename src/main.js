import { createApp, h, ref, onMounted, watch, nextTick } from 'vue'
import App from './App.vue'
import { router } from './router'
import './assets/main.css'
import PrimeVue from 'primevue/config'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import Toolbar from 'primevue/toolbar'
import Card from 'primevue/card'
import ProgressSpinner from 'primevue/progressspinner'
import Slider from 'primevue/slider'
import Textarea from 'primevue/textarea'
import DataTable from 'primevue/datatable'
import VirtualScroller from 'primevue/virtualscroller'
import Column from 'primevue/column'
import Chip from 'primevue/chip'
import ScrollPanel from 'primevue/scrollpanel'
import { createPinia } from 'pinia'

import TabMenu from 'primevue/tabmenu'

// PrimeVue theme will be loaded dynamically so the app can toggle light/dark themes at runtime.
// We still load core PrimeVue styles and icons.
import 'primevue/resources/primevue.min.css' // core css
import 'primeicons/primeicons.css' // icons
import 'primeflex/primeflex.css'

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
app.component('TabMenu', TabMenu)
app.component('Toolbar', Toolbar)
app.component('Card', Card)
app.component('Slider', Slider)
app.component('ProgressSpinner', ProgressSpinner)
app.component('DataTable', DataTable)
app.component('Column', Column)
app.component('Chip', Chip)
app.component('ScrollPanel', ScrollPanel)
app.component('VirtualScroller', VirtualScroller)

const pinia = createPinia()
app.use(pinia)
app.use(router)

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

// --- SafeMarkdown component ---
// Renders markdown (md.render) with html disabled for safety, applies syntax highlighting
// (via highlight.js) and adds a copy button overlay to each code block.
app.component('SafeMarkdown', {
  props: ['source'],
  setup(props) {
    const root = ref(null)

    // Inject minimal CSS for code blocks and copy button once
    function injectStyles() {
      if (document.getElementById('safe-markdown-styles')) return
      const style = document.createElement('style')
      style.id = 'safe-markdown-styles'
      style.textContent = `
.safe-markdown .code-block-wrapper{ position: relative; margin: 0 0 1rem 0; }
.safe-markdown pre.hljs{ padding: 1rem; overflow: auto; border-radius: 6px; }
.safe-markdown pre.hljs code{ display: block; }
.safe-markdown .copy-btn{ position: absolute; top: 6px; right: 6px; background: rgba(0,0,0,0.6); color: #fff; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 12px; z-index: 10; }
.safe-markdown .copy-btn:active{ transform: translateY(1px); }
.safe-markdown .copy-btn.copied{ background: rgba(40,167,69,0.9); }
      `
      document.head.appendChild(style)
    }

    // Copy text to clipboard with fallback
    async function copyToClipboard(text) {
      if (!text) return false
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(text)
        } else {
          const ta = document.createElement('textarea')
          ta.value = text
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        }
        return true
      } catch (e) {
        console.error('copy failed', e)
        return false
      }
    }

    // Add copy buttons to code blocks inside root element
    async function enhanceCodeBlocks() {
      await nextTick()
      const el = root.value
      if (!el) return
      const pres = el.querySelectorAll('pre.hljs')
      pres.forEach((pre) => {
        if (pre.dataset.copyEnhanced === '1') return
        // Mark as processed
        pre.dataset.copyEnhanced = '1'

        // Wrap pre in a div to position the button
        const wrapper = document.createElement('div')
        wrapper.className = 'code-block-wrapper'
        pre.parentNode.insertBefore(wrapper, pre)
        wrapper.appendChild(pre)

        // Create button
        const btn = document.createElement('button')
        btn.type = 'button'
        btn.className = 'copy-btn'
        btn.innerText = 'Copy'
        btn.setAttribute('aria-label', 'Copy code')

        let timeout = null
        btn.addEventListener('click', async () => {
          const codeEl = pre.querySelector('code')
          const text = codeEl ? codeEl.innerText : pre.innerText
          const ok = await copyToClipboard(text)
          if (ok) {
            btn.classList.add('copied')
            btn.innerText = 'Copied!'
            clearTimeout(timeout)
            timeout = setTimeout(() => {
              btn.classList.remove('copied')
              btn.innerText = 'Copy'
            }, 2000)
          } else {
            btn.innerText = 'Failed'
            clearTimeout(timeout)
            timeout = setTimeout(() => (btn.innerText = 'Copy'), 2000)
          }
        })

        // Insert button into wrapper
        wrapper.appendChild(btn)
      })
    }

    onMounted(() => {
      injectStyles()
      enhanceCodeBlocks()
    })

    watch(
      () => props.source,
      () => {
        // Update innerHTML and re-run enhancement on source change
        if (root.value) {
          root.value.innerHTML = md.render(props.source || '')
          enhanceCodeBlocks()
        }
      }
    )

    return () => h('div', { ref: root, class: 'safe-markdown', innerHTML: md.render(props.source || '') })
  }
})

// --- PrimeVue theme switching ---
// The previous implementation used dynamic import(), but that *adds* CSS and does not remove
// the old theme, so toggling often appears to do nothing.
//
// Instead, we manage a single <link> tag in <head> and swap its href.
const THEME_LINK_ID = 'primevue-theme-link'
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
  const themeName = theme === 'dark' ? 'lara-dark-blue' : 'lara-light-blue'
  // Vite will serve this from node_modules in dev.
  // In build, it will be copied/rewritten appropriately.
  const href = `/node_modules/primevue/resources/themes/${themeName}/theme.css`
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
