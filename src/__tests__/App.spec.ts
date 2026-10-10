import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'

import { mount } from '@vue/test-utils'
import App from '../App.vue'
import router from '../router'

vi.mock('virtual:pwa-register/vue', () => ({
  useRegisterSW: () => ({
    offlineReady: ref(false),
    needRefresh: ref(false),
    updateServiceWorker: vi.fn<() => Promise<void>>(),
  }),
}))

describe('App', () => {
  it('renders the shell', async () => {
    router.push('/')
    await router.isReady()
    const wrapper = mount(App, { global: { plugins: [router] } })
    expect(wrapper.text()).toContain('Logbook')
    expect(wrapper.text()).toContain('stored on this device')
    expect(wrapper.find('a[href="#/settings"]').exists()).toBe(true)
  })
})
