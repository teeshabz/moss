import { getCurrentWeekBounds, canCreatePost } from '@/lib/api/weekly-limit'
import { toZonedTime } from 'date-fns-tz'

describe('getCurrentWeekBounds', () => {
  it('should return start and end dates', () => {
    const bounds = getCurrentWeekBounds()
    expect(bounds).toHaveProperty('start')
    expect(bounds).toHaveProperty('end')
    expect(bounds.start).toBeInstanceOf(Date)
    expect(bounds.end).toBeInstanceOf(Date)
  })

  it('should return start before end', () => {
    const bounds = getCurrentWeekBounds()
    expect(bounds.start.getTime()).toBeLessThan(bounds.end.getTime())
  })

  it('should return Monday as start of week', () => {
    const bounds = getCurrentWeekBounds()
    const nyTime = toZonedTime(bounds.start, 'America/New_York')
    const dayOfWeek = nyTime.getDay() // 0 = Sunday, 1 = Monday, etc.
    expect(dayOfWeek).toBe(1) // Monday
  })

  it('should return Sunday as end of week', () => {
    const bounds = getCurrentWeekBounds()
    const nyTime = toZonedTime(bounds.end, 'America/New_York')
    const dayOfWeek = nyTime.getDay() // 0 = Sunday, 1 = Monday, etc.
    expect(dayOfWeek).toBe(0) // Sunday
  })

  it('should return dates in UTC', () => {
    const bounds = getCurrentWeekBounds()
    // UTC dates should have timezone offset of 0 (or be in UTC)
    expect(bounds.start.toISOString()).toContain('Z')
    expect(bounds.end.toISOString()).toContain('Z')
  })
})

describe('canCreatePost', () => {
  it('should return true when count is less than 3', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
    } as any

    mockSupabase.lte.mockResolvedValue({
      count: 2,
      error: null,
    })

    const result = await canCreatePost('user-id', mockSupabase)
    expect(result).toBe(true)
  })

  it('should return false when count is 3 or more', async () => {
    const mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
    } as any

    mockSupabase.lte.mockResolvedValue({
      count: 3,
      error: null,
    })

    const result = await canCreatePost('user-id', mockSupabase)
    expect(result).toBe(false)
  })
})
