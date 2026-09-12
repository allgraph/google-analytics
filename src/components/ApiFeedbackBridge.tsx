import { App } from 'antd'
import { useEffect } from 'react'
import { setApiErrorNotifier } from '../services/apiFeedback'

export function ApiFeedbackBridge() {
  const { message } = App.useApp()

  useEffect(() => setApiErrorNotifier((text) => void message.error(text)), [message])

  return null
}
