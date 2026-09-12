import { App as AntdApp, ConfigProvider } from 'antd'
import { QueryClientProvider } from '@tanstack/react-query'
import ruRU from 'antd/locale/ru_RU'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { queryClient } from './api/queryClient'
import { ApiFeedbackBridge } from './components/ApiFeedbackBridge'
import { appTheme, cardShadow, fontFamily, fontFamilyCode, palette } from './theme'
import './index.css'

for (const [name, value] of Object.entries(palette)) {
  document.documentElement.style.setProperty(`--color-${name}`, value)
}
document.documentElement.style.setProperty('--font-sans', fontFamily)
document.documentElement.style.setProperty('--font-mono', fontFamilyCode)
document.documentElement.style.setProperty('--shadow-card', cardShadow)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider locale={ruRU} theme={appTheme}>
      <AntdApp>
        <QueryClientProvider client={queryClient}>
          <ApiFeedbackBridge />
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </QueryClientProvider>
      </AntdApp>
    </ConfigProvider>
  </StrictMode>,
)
