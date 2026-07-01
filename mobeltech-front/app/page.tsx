'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getDefaultRouteForRole } from '@/lib/route-access'
import type { User } from '@/lib/types'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    try {
      const stored = localStorage.getItem('mobeltech_user')
      if (!stored) return
      const user = JSON.parse(stored) as Pick<User, 'role'>
      router.replace(getDefaultRouteForRole(user.role))
    } catch {
      router.replace('/dashboard')
    }
  }, [router])

  return null
}
