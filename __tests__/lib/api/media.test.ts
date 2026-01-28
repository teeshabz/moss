import { validateMediaData } from '@/lib/api/media'
import type { MediaType } from '@/lib/types'

describe('validateMediaData', () => {
  describe('Title validation', () => {
    it('should throw error if title is missing', () => {
      expect(() => {
        validateMediaData('BOOK', { creator: 'Author' })
      }).toThrow('Title is required')
    })

    it('should throw error if title is empty string', () => {
      expect(() => {
        validateMediaData('BOOK', { title: '', creator: 'Author' })
      }).toThrow('Title is required')
    })

    it('should throw error if title is only whitespace', () => {
      expect(() => {
        validateMediaData('BOOK', { title: '   ', creator: 'Author' })
      }).toThrow('Title is required')
    })

    it('should accept valid title', () => {
      expect(() => {
        validateMediaData('BOOK', { title: 'Test Book', creator: 'Author' })
      }).not.toThrow()
    })
  })

  describe('BOOK validation', () => {
    it('should require creator', () => {
      expect(() => {
        validateMediaData('BOOK', { title: 'Test Book' })
      }).toThrow('Creator is required')
    })

    it('should accept valid book data', () => {
      expect(() => {
        validateMediaData('BOOK', { title: 'Test Book', creator: 'Test Author' })
      }).not.toThrow()
    })
  })

  describe('MOVIE validation', () => {
    it('should require creator', () => {
      expect(() => {
        validateMediaData('MOVIE', { title: 'Test Movie' })
      }).toThrow('Creator is required')
    })

    it('should accept valid movie data', () => {
      expect(() => {
        validateMediaData('MOVIE', { title: 'Test Movie', creator: 'Test Director' })
      }).not.toThrow()
    })
  })

  describe('SONG validation', () => {
    it('should require creator', () => {
      expect(() => {
        validateMediaData('SONG', { title: 'Test Song' })
      }).toThrow('Creator is required')
    })

    it('should accept valid song data', () => {
      expect(() => {
        validateMediaData('SONG', { title: 'Test Song', creator: 'Test Artist' })
      }).not.toThrow()
    })
  })

  describe('ALBUM validation', () => {
    it('should require creator', () => {
      expect(() => {
        validateMediaData('ALBUM', { title: 'Test Album' })
      }).toThrow('Creator is required')
    })

    it('should accept valid album data', () => {
      expect(() => {
        validateMediaData('ALBUM', { title: 'Test Album', creator: 'Test Artist' })
      }).not.toThrow()
    })
  })

  describe('PODCAST validation', () => {
    it('should require creator', () => {
      expect(() => {
        validateMediaData('PODCAST', { title: 'Test Podcast' })
      }).toThrow('Creator is required')
    })

    it('should accept valid podcast data', () => {
      expect(() => {
        validateMediaData('PODCAST', { title: 'Test Podcast', creator: 'Test Host' })
      }).not.toThrow()
    })
  })

  describe('ARTICLE validation', () => {
    it('should require externalUrl', () => {
      expect(() => {
        validateMediaData('ARTICLE', { title: 'Test Article' })
      }).toThrow('External URL is required for articles')
    })

    it('should require HTTPS for externalUrl', () => {
      expect(() => {
        validateMediaData('ARTICLE', {
          title: 'Test Article',
          externalUrl: 'http://example.com',
        })
      }).toThrow('External URL must use HTTPS')
    })

    it('should require valid URL for externalUrl', () => {
      expect(() => {
        validateMediaData('ARTICLE', {
          title: 'Test Article',
          externalUrl: 'not-a-url',
        })
      }).toThrow('External URL must be a valid URL')
    })

    it('should accept valid article data with HTTPS URL', () => {
      expect(() => {
        validateMediaData('ARTICLE', {
          title: 'Test Article',
          externalUrl: 'https://example.com/article',
        })
      }).not.toThrow()
    })

    it('should accept article without creator (optional)', () => {
      expect(() => {
        validateMediaData('ARTICLE', {
          title: 'Test Article',
          externalUrl: 'https://example.com/article',
        })
      }).not.toThrow()
    })
  })

  describe('Unknown media type', () => {
    it('should throw error for unknown media type', () => {
      expect(() => {
        validateMediaData('UNKNOWN' as MediaType, { title: 'Test' })
      }).toThrow('Unknown media type: UNKNOWN')
    })
  })
})
