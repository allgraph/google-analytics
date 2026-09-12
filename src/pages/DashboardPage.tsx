import { Button, Card, Table } from 'antd'
import type { TableColumnsType } from 'antd'
import { ArrowDownRight, ArrowUpRight, CalendarDays } from 'lucide-react'
import type { Money, NullableMetric } from '../api/types'
import { formatMoneyCompact, formatNumber, formatPercent } from '../lib/format'
import pageStyles from './Page.module.css'
import styles from './DashboardPage.module.css'

const EUR = (amount: string): Money => ({ amount, currency: 'EUR' })

const metrics = [
  { label: 'Расход', value: formatMoneyCompact(EUR('12480.00')), delta: 8.2, positive: false },
  { label: 'Звонки', value: formatNumber(1284), delta: 12.4, positive: true },
  { label: 'Заявки', value: formatNumber(486), delta: 6.8, positive: true },
  {
    label: 'Чистая прибыль',
    value: formatMoneyCompact(EUR('18940.00')),
    delta: 14.1,
    positive: true,
  },
]

interface SiteMetric {
  site: string
  spend: Money
  calls: number
  profit: Money
  roi: NullableMetric
}

const sites: SiteMetric[] = [
  {
    site: 'sanitaer-notdienst-berlin.de',
    spend: EUR('4820.00'),
    calls: 412,
    profit: EUR('8460.00'),
    roi: 175.5,
  },
  {
    site: 'rohrreinigung-berlin-sofort.de',
    spend: EUR('3160.00'),
    calls: 328,
    profit: EUR('5120.00'),
    roi: 162,
  },
  {
    site: 'schluesseldienst-berlin-24.de',
    spend: EUR('2840.00'),
    calls: 241,
    profit: EUR('-212.00'),
    roi: -7.5,
  },
]

const columns: TableColumnsType<SiteMetric> = [
  { title: 'Сайт', dataIndex: 'site', className: styles.site },
  { title: 'Расход', dataIndex: 'spend', render: (spend: Money) => formatMoneyCompact(spend) },
  { title: 'Звонки', dataIndex: 'calls', render: (calls: number) => formatNumber(calls) },
  { title: 'Прибыль', dataIndex: 'profit', render: (profit: Money) => formatMoneyCompact(profit) },
  { title: 'ROI', dataIndex: 'roi', render: (roi: NullableMetric) => formatPercent(roi) },
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
                  {`+${formatPercent(metric.delta)}`}
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
