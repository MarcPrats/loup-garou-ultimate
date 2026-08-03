import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { createAppRouter } from './router'
import './styles.css'

const pinia = createPinia()
const router = createAppRouter(pinia)

createApp(App).use(pinia).use(router).mount('#app')
