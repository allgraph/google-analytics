import { Button, Card, Table } from 'antd'
import type { TableColumnsType } from 'antd'
import { ArrowDownRight, ArrowUpRight, CalendarDays } from 'lucide-react'
import pageStyles from './Page.module.css'
import styles from './DashboardPage.module.css'

const metrics = [
  { label: 'Расход', value: '€12 480', delta: '+8,2%', positive: false },
  { label: 'Звонки', value: '1 284', delta: '+12,4%', positive: true },
  { label: 'Заявки', value: '486', delta: '+6,8%', positive: true },
  { label: 'Чистая прибыль', value: '€18 940', delta: '+14,1%', positive: true },
]

interface SiteMetric {
  site: string
  spend: string
  calls: string
  profit: string
  roi: string
}

const sites: SiteMetric[] = [
  {
    site: 'sanitaer-notdienst-berlin.de',
    spend: '€4 820',
    calls: '412',
    profit: '€8 460',
    roi: '175,5%',
  },
  {
    site: 'rohrreinigung-berlin-sofort.de',
    spend: '€3 160',
    calls: '328',
    profit: '€5 120',
    roi: '162,0%',
  },
  {
    site: 'schluesseldienst-berlin-24.de',
    spend: '€2 840',
    calls: '241',
    profit: '−€212',
    roi: '−7,5%',
  },
]

const columns: TableColumnsType<SiteMetric> = [
  { title: 'Сайт', dataIndex: 'site', className: styles.site },
  { title: 'Расход', dataIndex: 'spend' },
  { title: 'Звонки', dataIndex: 'calls' },
  { title: 'Прибыль', dataIndex: 'profit' },
  { title: 'ROI', dataIndex: 'roi' },
]

export function DashboardPage() {
  return (
    <div className={`${pageStyles.page} ${styles.dashboard}`}>
      <div className={styles.heading}>
        <div>
          <h1 className={pageStyles.title}>Дашборд</h1>
          <p className={styles.subtitle}>Реклама, звонки, заявки и прибыль</p>
        </div>
        <Button className={styles.period} icon={<CalendarDays size={15} />}>
          Последние 30 дней
        </Button>
      </div>

      <div className={styles.metrics}>
        {metrics.map((metric) => (
          <article key={metric.label}>
            <Card className={styles.metric}>
              <div className={styles.metricLabel}>{metric.label}</div>
              <div className={styles.metricValue}>
                <strong>{metric.value}</strong>
                <span
                  className={`${styles.delta} ${metric.positive ? styles.positive : styles.negative}`}
                >
                  {metric.positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  {metric.delta}
                </span>
              </div>
            </Card>
          </article>
        ))}
      </div>

      <section className={styles.sites} aria-labelledby="sites-heading">
        <div className={styles.tableHeading}>
          <h2 id="sites-heading">Сайты и прибыль</h2>
          <p>3 сайта · данные демонстрационные</p>
        </div>
        <Table<SiteMetric>
          className={styles.table}
          columns={columns}
          dataSource={sites}
          rowKey="site"
          pagination={false}
        />
      </section>
    </div>
  )
}
