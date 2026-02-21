export function normalizeAuthError(rawError?: string) {
  const source = (rawError || '').trim()
  const lower = source.toLowerCase()

  if (!source) {
    return {
      message: 'Something went wrong. Please try again.',
      code: 'unknown',
    }
  }

  if (lower.includes('email rate limit exceeded') || lower.includes('rate limit')) {
    return {
      message: 'Too many requests right now. Please try again shortly.',
      code: 'rate_limit',
    }
  }

  if (lower.includes('already registered') || lower.includes('already exists')) {
    return {
      message: 'This email is already registered. Please sign in.',
      code: 'already_registered',
    }
  }

  if (lower.includes('invalid login credentials')) {
    return {
      message: 'Invalid email or password.',
      code: 'invalid_credentials',
    }
  }

  if (lower.includes('email not confirmed') || lower.includes('email not verified')) {
    return {
      message: 'Login blocked by email confirmation setting.',
      code: 'email_not_verified',
    }
  }

  return {
    message: source,
    code: 'generic',
  }
}
