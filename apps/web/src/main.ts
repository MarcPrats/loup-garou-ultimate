import { createPinia } from 'pinia'
import { createApp } from 'vue'

import App from './App.vue'
import { createAppRouter } from './router'
import './styles.css'

const pinia = createPinia()
const router = createAppRouter(pinia)
const app = createApp(App)

app.use(pinia).use(router)
await router.isReady()
app.mount('#app')
