/** TEST-allowlist — geen echte geheimen. Later: school Microsoft-login. */

export const ALLOWLIST = ['hgj@isw.info', 'elt@isw.info']
export const ADMIN_EMAIL = 'hgj@isw.info'

/** Simpele test-PIN (zichtbaar als TEST) — geen productie-geheim. */
export const TEST_PIN = '1234'

export function isAllowedEmail(email) {
  return ALLOWLIST.includes(String(email || '').trim().toLowerCase())
}

export function isAdmin(email) {
  return String(email || '').trim().toLowerCase() === ADMIN_EMAIL
}

export const TEST_ACCOUNTS = [
  {
    email: 'hgj@isw.info',
    label: 'Jasper',
    rol: 'Bieden (leerling-site)',
  },
  {
    email: 'elt@isw.info',
    label: 'ELT',
    rol: 'Bieden',
  },
]
