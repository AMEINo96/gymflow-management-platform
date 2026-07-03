import { NextResponse } from 'next/server'

/**
 * Validates that an incoming request to a /api/hardware/* endpoint
 * is from an authorized ESP32 device by checking the X-Hardware-Key header
 * against the HARDWARE_API_KEY environment variable.
 *
 * Usage in any hardware route:
 *   const authError = validateHardwareRequest(request)
 *   if (authError) return authError
 *
 * Returns null if valid, or a NextResponse 401 error if invalid.
 */
export function validateHardwareRequest(request) {
  const expectedKey = process.env.HARDWARE_API_KEY

  // If no key is configured in env, log a warning but allow (dev mode)
  if (!expectedKey) {
    console.warn('[SECURITY] HARDWARE_API_KEY is not set! Hardware endpoints are unprotected.')
    return null
  }

  const providedKey = request.headers.get('X-Hardware-Key')

  if (!providedKey || providedKey !== expectedKey) {
    return NextResponse.json(
      { error: 'Unauthorized — invalid or missing hardware API key' },
      { status: 401 }
    )
  }

  return null // Valid
}
