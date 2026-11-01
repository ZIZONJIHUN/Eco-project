'use client'

import { useCallback, useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

declare global {
  interface Window {
    /** layout 의 인라인 스크립트가 React 보다 먼저 받아 둔 설치 요청 */
    __bip?: BeforeInstallPromptEvent | null
  }
  interface Navigator {
    standalone?: boolean
  }
}

export type Platform = 'ios' | 'android' | 'desktop'
export type InApp = 'kakao' | 'naver' | 'instagram' | 'facebook' | 'line' | 'other' | null

export interface InstallEnv {
  platform: Platform
  inApp: InApp
  /** iOS 에서 쓰는 브라우저 */
  iosBrowser: 'safari' | 'chrome' | 'other' | null
  standalone: boolean
}

export function detectEnv(): InstallEnv {
  const ua = navigator.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const android = /Android/.test(ua)
  const inApp: InApp = /KAKAOTALK/i.test(ua)
    ? 'kakao'
    : /NAVER\(inapp|NAVER\//i.test(ua)
      ? 'naver'
      : /Instagram/.test(ua)
        ? 'instagram'
        : /FBAN|FBAV/.test(ua)
          ? 'facebook'
          : /\bLine\//.test(ua)
            ? 'line'
            : /; wv\)|DaumApps|everytimeApp|whale\/.*inapp/i.test(ua)
              ? 'other'
              : null
  const iosBrowser = ios ? (/CriOS/.test(ua) ? 'chrome' : /FxiOS|EdgiOS|OPiOS/.test(ua) ? 'other' : 'safari') : null
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true
  return { platform: ios ? 'ios' : android ? 'android' : 'desktop', inApp, iosBrowser, standalone }
}

/** 카카오톡 같은 앱 안 브라우저에서 기본 브라우저로 열기 */
export function openExternalUrl(env: InstallEnv, url: string): string | null {
  if (env.inApp === 'kakao') return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`
  if (env.platform === 'android' && env.inApp) {
    const u = new URL(url)
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=https;package=com.android.chrome;end`
  }
  return null
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable'

export function useInstall() {
  const [env, setEnv] = useState<InstallEnv | null>(null)
  const [canPrompt, setCanPrompt] = useState(false)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const sync = () => {
      setEnv(detectEnv())
      setCanPrompt(Boolean(window.__bip))
    }
    sync()
    const onBip = () => setCanPrompt(Boolean(window.__bip))
    const onInstalled = () => {
      window.__bip = null
      setCanPrompt(false)
      setInstalled(true)
    }
    const mq = window.matchMedia('(display-mode: standalone)')
    window.addEventListener('hm:bip', onBip)
    window.addEventListener('appinstalled', onInstalled)
    mq.addEventListener('change', sync)
    return () => {
      window.removeEventListener('hm:bip', onBip)
      window.removeEventListener('appinstalled', onInstalled)
      mq.removeEventListener('change', sync)
    }
  }, [])

  const prompt = useCallback(async (): Promise<InstallOutcome> => {
    const e = window.__bip
    if (!e) return 'unavailable'
    await e.prompt()
    const { outcome } = await e.userChoice
    // 한 번 쓴 요청은 다시 쓸 수 없다
    window.__bip = null
    setCanPrompt(false)
    if (outcome === 'accepted') setInstalled(true)
    return outcome
  }, [])

  return { env, canPrompt, installed: installed || Boolean(env?.standalone), prompt }
}
