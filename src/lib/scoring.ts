// Domain structure: 6 domains across 27 items
// Self-Awareness: 1-5
// Self-Regulation: 6-10
// Motivation: 11-15
// Empathy: 16-20
// Social & Leadership: 21-25
// Relationship Intelligence: 26-27

interface DomainScores {
  self_awareness: number
  self_regulation: number
  motivation: number
  empathy: number
  social_leadership: number
  relationship_intelligence: number
}

interface ScoredSubmission {
  domain_scores: DomainScores
  overall: number
  personal_competence: number
  social_competence: number
  bands: {
    self_awareness: string
    self_regulation: string
    motivation: string
    empathy: string
    social_leadership: string
    relationship_intelligence: string
    overall: string
    personal: string
    social: string
  }
}

const DOMAIN_ITEM_RANGES = {
  self_awareness: [1, 2, 3, 4, 5],
  self_regulation: [6, 7, 8, 9, 10],
  motivation: [11, 12, 13, 14, 15],
  empathy: [16, 17, 18, 19, 20],
  social_leadership: [21, 22, 23, 24, 25],
  relationship_intelligence: [26, 27],
}

const REVERSE_ITEMS = [4, 8, 16]

function getBand(score: number): string {
  if (score >= 4.0) return 'High'
  if (score >= 3.0) return 'Moderate'
  return 'Needs Support'
}

function reverseScore(score: number): number {
  return 6 - score
}

function calculateDomainMean(items: number[], itemNumbers: number[]): number {
  const domainItems = itemNumbers.map(itemNum => items[itemNum - 1])
  const sum = domainItems.reduce((acc, val) => acc + val, 0)
  return sum / domainItems.length
}

export function scoreSubmission(rawAnswers: number[]): ScoredSubmission {
  if (rawAnswers.length !== 27) {
    throw new Error('Expected 27 item answers')
  }

  // Validate all answers are 1-5
  for (let i = 0; i < rawAnswers.length; i++) {
    const answer = rawAnswers[i]
    if (answer < 1 || answer > 5 || !Number.isInteger(answer)) {
      throw new Error(
        `Invalid answer at index ${i}: ${answer} (must be integer 1-5)`
      )
    }
  }

  // Create a copy for reverse scoring
  const processedAnswers = [...rawAnswers]

  // Reverse items 4, 8, 16 (1-indexed, so subtract 1 for 0-indexed array)
  REVERSE_ITEMS.forEach(itemNum => {
    processedAnswers[itemNum - 1] = reverseScore(processedAnswers[itemNum - 1])
  })

  // Calculate domain means
  const domainScores: DomainScores = {
    self_awareness: calculateDomainMean(
      processedAnswers,
      DOMAIN_ITEM_RANGES.self_awareness
    ),
    self_regulation: calculateDomainMean(
      processedAnswers,
      DOMAIN_ITEM_RANGES.self_regulation
    ),
    motivation: calculateDomainMean(
      processedAnswers,
      DOMAIN_ITEM_RANGES.motivation
    ),
    empathy: calculateDomainMean(processedAnswers, DOMAIN_ITEM_RANGES.empathy),
    social_leadership: calculateDomainMean(
      processedAnswers,
      DOMAIN_ITEM_RANGES.social_leadership
    ),
    relationship_intelligence: calculateDomainMean(
      processedAnswers,
      DOMAIN_ITEM_RANGES.relationship_intelligence
    ),
  }

  // Calculate overall mean
  const overall = Object.values(domainScores).reduce((a, b) => a + b, 0) / 6

  // Calculate personal and social competence
  const personal_competence =
    (domainScores.self_awareness +
      domainScores.self_regulation +
      domainScores.motivation) /
    3
  const social_competence =
    (domainScores.empathy +
      domainScores.social_leadership +
      domainScores.relationship_intelligence) /
    3

  return {
    domain_scores: domainScores,
    overall: parseFloat(overall.toFixed(2)),
    personal_competence: parseFloat(personal_competence.toFixed(2)),
    social_competence: parseFloat(social_competence.toFixed(2)),
    bands: {
      self_awareness: getBand(domainScores.self_awareness),
      self_regulation: getBand(domainScores.self_regulation),
      motivation: getBand(domainScores.motivation),
      empathy: getBand(domainScores.empathy),
      social_leadership: getBand(domainScores.social_leadership),
      relationship_intelligence: getBand(domainScores.relationship_intelligence),
      overall: getBand(overall),
      personal: getBand(personal_competence),
      social: getBand(social_competence),
    },
  }
}

export function validateDomainScores(
  domainScores: Partial<DomainScores>
): DomainScores {
  const required: (keyof DomainScores)[] = [
    'self_awareness',
    'self_regulation',
    'motivation',
    'empathy',
    'social_leadership',
    'relationship_intelligence',
  ]

  for (const domain of required) {
    if (domainScores[domain] === undefined) {
      throw new Error(`Missing domain score: ${domain}`)
    }
  }

  return domainScores as DomainScores
}
