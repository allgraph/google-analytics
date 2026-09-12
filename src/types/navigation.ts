import type { LucideIcon } from 'lucide-react'
import type { Section } from '../auth/accessPolicy'

export interface NavigationItem {
  label: string
  path: string
  section: Section
  icon: LucideIcon
  badge?: number
}
