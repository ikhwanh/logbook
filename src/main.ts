import { createApp, watchEffect } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { requestPersistentStorage } from './db/persist'
import { applyTheme, settings, startSettings } from './settings'

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Loaded before mounting so the first render already uses the chosen theme and views.
await startSettings()
watchEffect(() => applyTheme(settings.value.theme))

app.mount('#app')

requestPersistentStorage()
