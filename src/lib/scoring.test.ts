import { scoreSubmission, validateDomainScores } from './scoring'

describe('Scoring Engine', () => {
  // Test 1: Band determination
  describe('Band determination', () => {
    it('should return High band for scores >= 4.0', () => {
      // Set all to 5, then 4,8,16 reverse to 1, average is ~4.1
      const answers = Array(27).fill(5)
      answers[3] = 5 // Item 4 reverses to 1
      answers[7] = 5 // Item 8 reverses to 1
      answers[15] = 5 // Item 16 reverses to 1
      const result = scoreSubmission(answers)
      expect(result.bands.overall).toBe('High')
      expect(result.overall).toBeGreaterThanOrEqual(4.0)
    })

    it('should return Moderate band for scores 3.0-3.9', () => {
      const answers = Array(27).fill(3)
      const result = scoreSubmission(answers)
      expect(result.bands.overall).toBe('Moderate')
      expect(result.overall).toBeGreaterThanOrEqual(3.0)
      expect(result.overall).toBeLessThan(4.0)
    })

    it('should return Needs Support band for scores < 3.0', () => {
      const answers = Array(27).fill(2)
      const result = scoreSubmission(answers)
      expect(result.bands.overall).toBe('Needs Support')
      expect(result.overall).toBeLessThan(3.0)
    })

    it('should determine bands for all domains', () => {
      const answers = Array(27).fill(3)
      const result = scoreSubmission(answers)
      expect(result.bands.self_awareness).toBe('Moderate')
      expect(result.bands.self_regulation).toBe('Moderate')
      expect(result.bands.motivation).toBe('Moderate')
      expect(result.bands.empathy).toBe('Moderate')
      expect(result.bands.social_leadership).toBe('Moderate')
      expect(result.bands.relationship_intelligence).toBe('Moderate')
    })
  })

  // Test 2: Reverse scoring
  describe('Reverse scoring', () => {
    it('should reverse items 4, 8, 16', () => {
      // Items 4, 8, 16 set to 1, others set to 5
      const answers = Array(27).fill(5)
      answers[3] = 1 // Item 4
      answers[7] = 1 // Item 8
      answers[15] = 1 // Item 16

      // After reversal: 1 becomes 5, so all should be 5
      const result = scoreSubmission(answers)

      // All items should calculate as 5 after reversal
      // Self-Awareness (1-5): 5,5,5,5(reversed from 1),5 = 5.0
      // Self-Regulation (6-10): 5,5,5,5(reversed from 1),5 = 5.0
      // etc.
      expect(result.domain_scores.self_awareness).toBe(5.0)
      expect(result.overall).toBe(5.0)
    })

    it('should not reverse other items', () => {
      const answers = Array(27).fill(1)
      answers[3] = 5 // Item 4 will be reversed to 1
      answers[7] = 5 // Item 8 will be reversed to 1
      answers[15] = 5 // Item 16 will be reversed to 1

      const result = scoreSubmission(answers)

      // After reversal, all should be 1
      expect(result.overall).toBe(1.0)
    })
  })

  // Test 3: Domain means calculation
  describe('Domain means calculation', () => {
    it('should calculate correct domain means', () => {
      // Without reversed items involved: use values that won't be reversed
      // Item 4 (reversed), 8 (reversed), 16 (reversed) need special handling
      // Self-Awareness (1-5): 3,3,3,2,3 -> after reverse at 4: 3,3,3,4,3 = 3.4
      // Self-Regulation (6-10): 4,4,4,3,4 -> after reverse at 8: 4,4,4,3,4 = 3.8
      // Motivation (11-15): 5,5,5,5,5 = 5.0
      // Empathy (16-20): 2,2,2,2,2 -> after reverse at 16: 2,2,2,4,2 = 2.4
      // Social & Leadership (21-25): 1,1,1,1,1 = 1.0
      // RI (26-27): 2,2 = 2.0

      const answers = [
        3, 3, 3, 2, 3, // SA: 1-5 (item 4 will be reversed from 2 to 4)
        4, 4, 3, 4, 4, // SR: 6-10 (item 8 will be reversed from 3 to 3)
        5, 5, 5, 5, 5, // Mot: 11-15
        2, 2, 2, 2, 2, // Emp: 16-20 (item 16 will be reversed from 2 to 4)
        1, 1, 1, 1, 1, // SL: 21-25
        2, 2, // RI: 26-27
      ]

      const result = scoreSubmission(answers)
      // After reverse scoring:
      // SA: [3,3,3,4,3] = 16/5 = 3.2
      // SR: [4,4,3,4,4] = 19/5 = 3.8
      // Mot: [5,5,5,5,5] = 25/5 = 5.0
      // Emp: [2,2,2,4,2] = 12/5 = 2.4
      // SL: [1,1,1,1,1] = 5/5 = 1.0
      // RI: [2,2] = 4/2 = 2.0
      expect(result.domain_scores.self_awareness).toBe(3.2)
      expect(result.domain_scores.self_regulation).toBe(3.8)
      expect(result.domain_scores.motivation).toBe(5.0)
      expect(result.domain_scores.empathy).toBe(2.4)
      expect(result.domain_scores.social_leadership).toBe(1.0)
      expect(result.domain_scores.relationship_intelligence).toBe(2.0)
      const expected = (3.2 + 3.8 + 5.0 + 2.4 + 1.0 + 2.0) / 6
      expect(result.overall).toBe(parseFloat(expected.toFixed(2)))
    })
  })

  // Test 4: Personal and social competence split
  describe('Personal and social competence', () => {
    it('should calculate personal competence correctly', () => {
      // Personal = mean(SA, SR, Motivation)
      // Items 4, 8 are in SA and SR, so they'll be reversed
      const answers = [
        3, 3, 3, 1, 3, // SA: 1-5 (item 4 reverses to 5) = [3,3,3,5,3] = 3.4
        4, 4, 1, 4, 4, // SR: 6-10 (item 8 reverses to 5) = [4,4,5,4,4] = 4.2
        5, 5, 5, 5, 5, // Mot: 11-15 = 5.0
        2, 2, 2, 2, 2, // Emp: 2.0 (ignored for personal)
        1, 1, 1, 1, 1, // SL: 1.0 (ignored for personal)
        2, 2, // RI: 2.0 (ignored for personal)
      ]

      const result = scoreSubmission(answers)
      const expectedPersonal = (3.4 + 4.2 + 5.0) / 3
      expect(result.personal_competence).toBe(
        parseFloat(expectedPersonal.toFixed(2))
      )
    })

    it('should calculate social competence correctly', () => {
      // Social = mean(Empathy, Social-Leadership, RI)
      // Item 16 is in Empathy and will be reversed (2 -> 4)
      const answers = [
        3, 3, 3, 3, 3, // SA: items 1-5 (ignored for social)
        4, 4, 4, 4, 4, // SR: items 6-10 (ignored for social)
        5, 5, 5, 5, 5, // Mot: items 11-15 (ignored for social)
        2, 2, 2, 1, 2, // Emp: items 16-20 (item 16 reverses 2->4) = [4,2,2,1,2] = 2.2
        1, 1, 1, 1, 1, // SL: items 21-25 = 1.0
        2, 2, // RI: items 26-27 = 2.0
      ]

      const result = scoreSubmission(answers)
      const expectedSocial = (2.2 + 1.0 + 2.0) / 3 // = 1.73
      expect(result.social_competence).toBe(
        parseFloat(expectedSocial.toFixed(2))
      )
    })

    it('should have correct bands for personal and social', () => {
      // Items 4, 8, 16 are reversed
      // SA: [5,5,5,1,5] after reverse = [5,5,5,5,5] = 5.0
      // SR: [5,5,5,1,5] after reverse = [5,5,5,5,5] = 5.0
      // Mot: [5,5,5,5,5] = 5.0
      // Emp: [1,1,1,5,1] after reverse at 16 = 1.8
      // SL: [1,1,1,1,1] = 1.0
      // RI: [1,1] = 1.0
      const answers = [
        5, 5, 5, 1, 5, // SA: 1-5 (item 4 reverses)
        5, 5, 1, 5, 5, // SR: 6-10 (item 8 reverses)
        5, 5, 5, 5, 5, // Mot: 11-15
        1, 1, 1, 1, 1, // Emp: 16-20 (item 16 reverses to 5)
        1, 1, 1, 1, 1, // SL: 21-25
        1, 1, // RI: 26-27
      ]

      const result = scoreSubmission(answers)
      expect(result.bands.personal).toBe('High') // (5+5+5)/3 = 5.0
      expect(result.bands.social).toBe('Needs Support') // (1.8+1+1)/3 = 1.27
    })
  })

  // Test 5: Validation and edge cases
  describe('Validation and edge cases', () => {
    it('should throw on invalid submission length', () => {
      const answers = Array(26).fill(3) // Too short
      expect(() => scoreSubmission(answers)).toThrow(
        'Expected 27 item answers'
      )
    })

    it('should throw on non-integer answers', () => {
      const answers = Array(27).fill(3)
      answers[0] = 3.5
      expect(() => scoreSubmission(answers)).toThrow(/Invalid answer/)
    })

    it('should throw on scores outside 1-5 range', () => {
      const answers = Array(27).fill(3)
      answers[0] = 0
      expect(() => scoreSubmission(answers)).toThrow(/Invalid answer/)

      answers[0] = 6
      expect(() => scoreSubmission(answers)).toThrow(/Invalid answer/)
    })

    it('should return consistent decimal precision', () => {
      const answers = [
        1, 2, 3, 4, 5,
        1, 2, 3, 4, 5,
        1, 2, 3, 4, 5,
        1, 2, 3, 4, 5,
        1, 2, 3, 4, 5,
        1, 2,
      ]
      const result = scoreSubmission(answers)

      // Check that all scores are rounded to 2 decimal places
      expect(result.overall.toString().split('.')[1]?.length).toBeLessThanOrEqual(
        2
      )
      expect(
        result.personal_competence.toString().split('.')[1]?.length
      ).toBeLessThanOrEqual(2)
      expect(
        result.social_competence.toString().split('.')[1]?.length
      ).toBeLessThanOrEqual(2)
    })
  })

  // Test 6: validateDomainScores helper
  describe('validateDomainScores', () => {
    it('should validate complete domain scores', () => {
      const scores = {
        self_awareness: 3.5,
        self_regulation: 3.5,
        motivation: 3.5,
        empathy: 3.5,
        social_leadership: 3.5,
        relationship_intelligence: 3.5,
      }
      const validated = validateDomainScores(scores)
      expect(validated).toEqual(scores)
    })

    it('should throw on missing domain', () => {
      const scores = {
        self_awareness: 3.5,
        self_regulation: 3.5,
        motivation: 3.5,
        empathy: 3.5,
        social_leadership: 3.5,
        // missing relationship_intelligence
      }
      expect(() =>
        validateDomainScores(scores as any)
      ).toThrow('Missing domain score')
    })
  })

  // Test 7: Realistic scenario from assessment
  describe('Realistic assessment scenario', () => {
    it('should handle a typical assessment response', () => {
      // Simulating a realistic response where most answers are 3-4
      const answers = [
        3, 4, 3, 2, 4, // SA: (3+4+3+5+4)/5 = 3.8 (2 reversed to 5)
        3, 3, 2, 4, 3, // SR: (3+3+5+4+3)/5 = 3.6 (2 reversed to 5)
        4, 3, 3, 4, 3, // Mot: 3.4
        4, 3, 2, 3, 4, // Emp: (4+3+5+3+4)/5 = 3.8 (2 reversed to 5)
        3, 3, 3, 3, 3, // SL: 3.0
        3, 4, // RI: 3.5
      ]

      const result = scoreSubmission(answers)

      // Verify domain scores are in valid range
      Object.values(result.domain_scores).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(1)
        expect(score).toBeLessThanOrEqual(5)
      })

      // Verify overall is in valid range
      expect(result.overall).toBeGreaterThanOrEqual(1)
      expect(result.overall).toBeLessThanOrEqual(5)

      // Verify personal/social are in valid range
      expect(result.personal_competence).toBeGreaterThanOrEqual(1)
      expect(result.personal_competence).toBeLessThanOrEqual(5)
      expect(result.social_competence).toBeGreaterThanOrEqual(1)
      expect(result.social_competence).toBeLessThanOrEqual(5)

      // Verify all bands are valid
      const validBands = ['High', 'Moderate', 'Needs Support']
      Object.values(result.bands).forEach(band => {
        expect(validBands).toContain(band)
      })
    })
  })
})
