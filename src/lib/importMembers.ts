import XLSX from 'xlsx'
import { supabase } from './supabase'

interface ParsedRow {
  name: string
  gender?: string
  maritalStatus?: string
  business?: string
  freeText: Record<string, string>
  domainScores: Record<string, number>
  overall: number
  [key: string]: any
}

interface ImportDiff {
  new: ParsedRow[]
  update: ParsedRow[]
  duplicate: ParsedRow[]
  errors: { row: number; error: string }[]
  existingCount: number
}

export async function parseExcelFile(fileBuffer: Buffer): Promise<{
  headers: string[]
  rows: ParsedRow[]
  errors: { row: number; error: string }[]
}> {
  console.log('parseExcelFile: Starting to parse Excel file')

  const workbook = XLSX.read(fileBuffer, { type: 'buffer' })
  console.log('parseExcelFile: Workbook sheets:', workbook.SheetNames)

  const sheet = workbook.Sheets[workbook.SheetNames[0]]

  if (!sheet) {
    throw new Error('No worksheet found in Excel file')
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, any>[]

  if (rows.length === 0) {
    throw new Error('No data rows found in Excel file')
  }

  // Get headers from first row
  const headers = Object.keys(rows[0])
  console.log('parseExcelFile: Headers found:', headers)
  console.log('parseExcelFile: Total data rows:', rows.length)

  const errors: { row: number; error: string }[] = []
  const parsedRows: ParsedRow[] = []

  // Define the 6 domains in order
  const domainNames = [
    'Self-Awareness',
    'Self-Regulation',
    'Motivation',
    'Empathy',
    'Social & Leadership',
    'Relationship Intelligence',
  ]

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]

    try {
      // Column 0: Name (1st column)
      const nameValue = String(row[headers[0]] || '').trim()
      if (!nameValue) {
        errors.push({ row: i + 2, error: `Name is empty (column: "${headers[0]}")` })
        continue
      }

      // Column 1: Gender (2nd column)
      const genderValue = String(row[headers[1]] || '').trim() || undefined

      // Column 2: Marital status (3rd column)
      const maritalStatusValue = String(row[headers[2]] || '').trim() || undefined

      // Column 3: Business / Occupation (4th column)
      const businessValue = String(row[headers[3]] || '').trim() || undefined

      // Columns 4-6: Free-text answers (Q28, Q29, Q30)
      const freeTextObj: Record<string, string> = {}
      if (headers.length > 4) {
        freeTextObj['Q28'] = String(row[headers[4]] || '').trim()
      }
      if (headers.length > 5) {
        freeTextObj['Q29'] = String(row[headers[5]] || '').trim()
      }
      if (headers.length > 6) {
        freeTextObj['Q30'] = String(row[headers[6]] || '').trim()
      }

      // Columns 7-12: 6 domain means
      const domainScoresObj: Record<string, number> = {}
      for (let d = 0; d < 6; d++) {
        const headerIdx = 7 + d
        if (headerIdx >= headers.length) {
          errors.push({
            row: i + 2,
            error: `Missing domain column at index ${headerIdx} (expected: ${domainNames[d]})`,
          })
          throw new Error(`Missing domain column: ${domainNames[d]}`)
        }

        const domainValue = String(row[headers[headerIdx]] || '0').trim()
        const parsedValue = parseFloat(domainValue)

        if (isNaN(parsedValue)) {
          errors.push({
            row: i + 2,
            error: `Invalid domain score at column ${headerIdx + 1} "${headers[headerIdx]}": "${domainValue}"`,
          })
          throw new Error(`Invalid domain score: ${domainValue}`)
        }

        domainScoresObj[domainNames[d]] = parsedValue
      }

      // Column 13: Overall mean
      if (headers.length <= 13) {
        errors.push({
          row: i + 2,
          error: `Missing overall score column at index 13`,
        })
        throw new Error('Missing overall score column')
      }

      const overallStr = String(row[headers[13]] || '0').trim()
      const overallValue = parseFloat(overallStr)

      if (isNaN(overallValue)) {
        errors.push({ row: i + 2, error: `Invalid overall score: "${overallStr}"` })
        throw new Error(`Invalid overall score: ${overallStr}`)
      }

      parsedRows.push({
        name: nameValue,
        gender: genderValue,
        maritalStatus: maritalStatusValue,
        business: businessValue,
        freeText: freeTextObj,
        domainScores: domainScoresObj,
        overall: overallValue,
      })
    } catch (err: any) {
      if (!errors.some((e) => e.row === i + 2)) {
        errors.push({
          row: i + 2,
          error: err.message || 'Unknown error parsing row',
        })
      }
    }
  }

  console.log('parseExcelFile: Parsed rows:', parsedRows.length, 'Errors:', errors.length)
  if (errors.length > 0) {
    console.log('parseExcelFile: First 3 errors:', errors.slice(0, 3))
  }

  return { headers, rows: parsedRows, errors }
}

export async function computeImportDiff(
  parsedRows: ParsedRow[]
): Promise<ImportDiff> {
  const diff: ImportDiff = {
    new: [],
    update: [],
    duplicate: [],
    errors: [],
    existingCount: 0,
  }

  // Get existing members by name
  const { data: existingMembers, error } = await supabase
    .from('member')
    .select('id, name')

  if (error) {
    throw new Error(`Failed to fetch existing members: ${error.message}`)
  }

  const existingByName = new Map(existingMembers?.map((m) => [m.name, m.id]) || [])
  diff.existingCount = existingByName.size

  const seenNames = new Set<string>()

  for (const row of parsedRows) {
    if (seenNames.has(row.name)) {
      diff.duplicate.push(row)
    } else if (existingByName.has(row.name)) {
      diff.update.push(row)
    } else {
      diff.new.push(row)
    }
    seenNames.add(row.name)
  }

  return diff
}

export async function executeImport(
  parsedRows: ParsedRow[]
): Promise<{ created: number; updated: number; cohortStats: any }> {
  let created = 0
  let updated = 0

  // Get existing members for updates
  const { data: existingMembers } = await supabase.from('member').select('id, name')
  const existingByName = new Map(existingMembers?.map((m) => [m.name, m.id]) || [])

  // Separate new and existing
  const newMembers: ParsedRow[] = []
  const existingSubmissions: Array<{ memberId: string; row: ParsedRow }> = []

  for (const row of parsedRows) {
    if (existingByName.has(row.name)) {
      existingSubmissions.push({ memberId: existingByName.get(row.name)!, row })
    } else {
      newMembers.push(row)
    }
  }

  // Insert new members
  if (newMembers.length > 0) {
    const memberInserts = newMembers.map((row) => ({
      name: row.name,
      gender: row.gender,
      marital_status: row.maritalStatus,
      business: row.business,
    }))

    const { data: insertedMembers, error: insertError } = await supabase
      .from('member')
      .insert(memberInserts)
      .select('id, name')

    if (insertError) {
      throw new Error(`Failed to insert members: ${insertError.message}`)
    }

    created = insertedMembers?.length || 0

    // Map inserted members for submission creation
    const insertedMap = new Map(insertedMembers?.map((m) => [m.name, m.id]) || [])
    for (const row of newMembers) {
      const memberId = insertedMap.get(row.name)
      if (memberId) {
        existingSubmissions.push({ memberId, row })
      }
    }
  }

  // Create submissions for all members (new and existing)
  if (existingSubmissions.length > 0) {
    const submissionInserts = existingSubmissions.map(({ memberId, row }) => ({
      member_id: memberId,
      round: 'pre',
      question_version_id: null, // Pre-assessment has no question_version
      raw_answers: null, // No raw item answers
      domain_scores: row.domainScores,
      overall: row.overall,
      personal_competence: (row.domainScores['Self-Awareness'] +
        row.domainScores['Self-Regulation'] +
        row.domainScores['Motivation']) /
        3,
      social_competence: (row.domainScores['Empathy'] +
        row.domainScores['Social & Leadership'] +
        row.domainScores['Relationship Intelligence']) /
        3,
      free_text: row.freeText,
    }))

    const { error: subError } = await supabase.from('submission').insert(submissionInserts)

    if (subError) {
      throw new Error(`Failed to create submissions: ${subError.message}`)
    }
  }

  // Compute cohort stats
  const allScores = parsedRows.map((row) => row.overall)
  const cohortAverage = allScores.reduce((a, b) => a + b, 0) / allScores.length

  // Find weakest domain
  const domainAvgs: Record<string, number> = {}
  const domainNames = [
    'Self-Awareness',
    'Self-Regulation',
    'Motivation',
    'Empathy',
    'Social & Leadership',
    'Relationship Intelligence',
  ]

  for (const domain of domainNames) {
    const scores = parsedRows.map((row) => row.domainScores[domain])
    domainAvgs[domain] = scores.reduce((a, b) => a + b, 0) / scores.length
  }

  const weakestDomain = Object.entries(domainAvgs).reduce((a, b) =>
    a[1] < b[1] ? a : b
  )[0]

  return {
    created,
    updated,
    cohortStats: {
      count: parsedRows.length,
      average: cohortAverage.toFixed(2),
      weakestDomain,
      domainAverages: Object.fromEntries(
        Object.entries(domainAvgs).map(([k, v]) => [k, v.toFixed(2)])
      ),
    },
  }
}
