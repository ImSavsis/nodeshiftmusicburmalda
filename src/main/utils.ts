import { randomBytes } from 'crypto'

export function nanoid(): string {
  return randomBytes(8).toString('hex')
}
