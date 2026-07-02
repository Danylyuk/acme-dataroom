import { ShieldCheck, Lock, FolderLock, FileCheck2 } from 'lucide-react'
import { LanguageSwitch } from '@/components/LanguageSwitch'
import { useI18n } from '@/i18n/LanguageContext'
import { AuthPanel } from './AuthPanel'

export function LoginPage() {
  const { t } = useI18n()

  const brand = (
    <div className="flex items-center gap-2.5">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <FolderLock className="size-5" />
      </div>
      <span className="text-lg font-semibold tracking-tight">{t('brand')}</span>
    </div>
  )

  const features = (
    <ul className="space-y-3 text-sm text-sidebar-foreground/80">
      <li className="flex items-center gap-3">
        <ShieldCheck className="size-4 shrink-0 text-primary" /> {t('login.feature1')}
      </li>
      <li className="flex items-center gap-3">
        <FileCheck2 className="size-4 shrink-0 text-primary" /> {t('login.feature2')}
      </li>
      <li className="flex items-center gap-3">
        <Lock className="size-4 shrink-0 text-primary" /> {t('login.feature3')}
      </li>
    </ul>
  )

  const copyright = (
    <p className="text-xs leading-relaxed">
      {t('login.confidential', { year: new Date().getFullYear() })}
      <br />
      {t('login.developedBy')}
    </p>
  )

  return (
    <div className="flex min-h-svh flex-col lg:grid lg:grid-cols-2">
      {/* ── Графітовий блок: верх на мобілці, ліва колонка на десктопі ── */}
      <div className="relative flex flex-col gap-8 overflow-hidden bg-sidebar p-8 text-sidebar-foreground lg:justify-center lg:p-10">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'var(--primary)' }}
        />

        <div className="relative flex items-center justify-between lg:absolute lg:inset-x-10 lg:top-10">
          {brand}
          <LanguageSwitch variant="dark" className="lg:hidden" />
        </div>

        <div className="relative space-y-6 lg:max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {t('login.heroTitle')}
          </h1>
          <p className="hidden text-sidebar-foreground/70 sm:block">{t('login.heroSubtitle')}</p>
          {features}
        </div>

        <div className="relative hidden text-sidebar-foreground/50 lg:absolute lg:bottom-10 lg:left-10 lg:block">
          {copyright}
        </div>
      </div>

      {/* ── Білий блок: низ на мобілці, права колонка на десктопі ── */}
      <div className="relative flex flex-1 flex-col p-8 lg:p-10">
        <div className="hidden justify-end lg:absolute lg:right-10 lg:top-10 lg:flex">
          <LanguageSwitch />
        </div>

        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <AuthPanel />
        </div>

        <div className="mt-8 text-center text-muted-foreground/70 lg:hidden">{copyright}</div>
      </div>
    </div>
  )
}
