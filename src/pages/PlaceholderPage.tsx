import { Card } from 'antd'
import styles from './Page.module.css'

interface PlaceholderPageProps {
  title: string
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{title}</h1>
      <Card className={styles.placeholder}>Раздел подготовлен для дальнейшей реализации.</Card>
    </div>
  )
}
