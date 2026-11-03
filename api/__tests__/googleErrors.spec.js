// Owner: Eashvar (testing). Unit tests for googleErrorMessage in api/_google.js (Week 10a): what
// people see when Google turns a request down, instead of Google's raw reply (e.g. on 09 "Could
// not load nearby spots: …").
import { describe, it, expect } from 'vitest'
import { googleErrorMessage } from '../_google.js'

describe('TestSuite: googleErrorMessage', () => {
  it('Test1: the daily limit (429) says to try again tomorrow', () => {
    expect(googleErrorMessage(429, '{"error":{"status":"RESOURCE_EXHAUSTED"}}')).toBe(
      "Google's daily limit for spot searches has been reached. Try again tomorrow.",
    )
  })

  it('Test2: billing switched off (403) says spots are unavailable for now', () => {
    const body = '{"error":{"message":"This API method requires billing to be enabled."}}'
    expect(googleErrorMessage(403, body)).toBe(
      "Spots from Google aren't available right now. Try again later.",
    )
  })

  it('Test3: any other 403 says Google did not allow it', () => {
    expect(googleErrorMessage(403, 'The caller does not have permission')).toBe(
      "Google didn't allow this request. Try again later.",
    )
  })

  it("Test4: a 404 says Google couldn't find the place", () => {
    expect(googleErrorMessage(404)).toBe("Google couldn't find this place.")
  })

  it("Test5: anything else says Google isn't responding", () => {
    expect(googleErrorMessage(500, 'Internal error')).toBe(
      "Google Places isn't responding right now. Try again in a minute.",
    )
  })

  it("Test6: the message never includes Google's raw reply", () => {
    const body = '{"error":{"code":429,"message":"Quota exceeded for quota metric"}}'
    expect(googleErrorMessage(429, body)).not.toContain('Quota exceeded')
  })
})
