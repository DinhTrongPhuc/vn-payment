import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "vn-payment",
  description: "Unified payment gateway adapters for Node.js",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' }
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
        ]
      },
      {
        text: 'Providers',
        items: [
          { text: 'MoMo', link: '/guide/momo' },
          { text: 'VNPay', link: '/guide/vnpay' },
          { text: 'ZaloPay', link: '/guide/zalopay' },
          { text: 'Mock Adapter', link: '/guide/mock' },
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/DinhTrongPhuc/vn-payment' }
    ]
  }
})
