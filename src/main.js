import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import './assets/main.css'
import PrimeVue from 'primevue/config'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Dialog from 'primevue/dialog'
import Toolbar from 'primevue/toolbar';
import Card from 'primevue/card';
import ProgressSpinner from 'primevue/progressspinner';
import Slider from 'primevue/slider';
import Textarea from 'primevue/textarea';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import Chip from 'primevue/chip'
import { createPinia } from 'pinia'



import TabMenu from 'primevue/tabmenu';
import "primevue/resources/themes/lara-light-blue/theme.css";

//import 'primevue/resources/themes/bootstrap4-dark-blue/theme.css'
import 'primevue/resources/primevue.min.css' // core css
import 'primeicons/primeicons.css' // icons
import 'primeflex/primeflex.css'
const app = createApp(App)
app.use(PrimeVue)
app.component('InputText', InputText)
app.component('Textarea', Textarea)
app.component('Button', Button)
app.component('Dropdown', Dropdown)
app.component('Dialog', Dialog)
app.component('TabMenu', TabMenu);
app.component('Toolbar', Toolbar);
app.component('Card', Card);
app.component('Slider', Slider);
app.component('ProgressSpinner', ProgressSpinner);
app.component('DataTable', DataTable);
app.component('Column', Column);
app.component('Chip', Chip);
const pinia = createPinia()
app.use(pinia)
app.use(router)

app.mount('#app')
