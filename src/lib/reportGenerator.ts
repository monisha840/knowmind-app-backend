import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import DocxParser from 'docx-parser'

interface ExtractedNarrative {
  personalNote: string
  whatYouShared: string
  actionPlan: string
  docxMemberName: string
}

interface ParseError {
  member: string
  file: string
  sections: string[]
}

interface ReportGenerationResult {
  memberId: string
  memberName: string
  success: boolean
  message: string
  error?: string
}

// Parse docx file and extract narratives by section headings
async function extractNarrativesFromDocx(filePath: string): Promise<ExtractedNarrative> {
  try {
    const data = fs.readFileSync(filePath)
    const parser = new DocxParser()
    const document = await parser.parse(data)
    const fullText = document.toString()

    // Extract member name from "Dear <name>," pattern
    const nameMatch = fullText.match(/Dear\s+([A-Za-z\s]+),/)
    if (!nameMatch) {
      throw new Error('Could not extract member name from "Dear <name>," pattern')
    }
    const docxMemberName = nameMatch[1].trim()

    // Extract personal note (from "Dear..." through signature, before next major section)
    const personalNoteMatch = fullText.match(
      /Dear\s+[A-Za-z\s]+,[\s\S]*?(?=WHAT YOU SHARED|YOUR EI|EMOTIONAL INTELLIGENCE|$)/i
    )
    if (!personalNoteMatch) {
      throw new Error('Missing section: Personal note')
    }
    const personalNote = personalNoteMatch[0].trim()

    // Extract "What You Shared" section
    const whatYouSharedMatch = fullText.match(
      /WHAT YOU SHARED[\s\S]*?(?=YOUR PERSONALISED ACTION PLAN|YOUR EI DIMENSION|$)/i
    )
    if (!whatYouSharedMatch) {
      throw new Error('Missing section: What You Shared')
    }
    const whatYouShared = whatYouSharedMatch[0].trim()

    // Extract action plan
    const actionPlanMatch = fullText.match(
      /YOUR PERSONALISED ACTION PLAN[\s\S]*?(?=YOUR NEXT STEP|CONTACT|CONFIDENTIAL|$)/i
    )
    if (!actionPlanMatch) {
      throw new Error('Missing section: Your Personalised Action Plan')
    }
    const actionPlan = actionPlanMatch[0].trim()

    return {
      personalNote,
      whatYouShared,
      actionPlan,
      docxMemberName,
    }
  } catch (error: any) {
    throw new Error(`Parse error: ${error.message}`)
  }
}

// Find docx file for a member by name (last name match)
function findReportDocx(memberName: string, docxDir: string): string | null {
  try {
    if (!fs.existsSync(docxDir)) {
      return null
    }

    const files = fs.readdirSync(docxDir)
    // Match by last name (case-insensitive)
    const lastName = memberName.toLowerCase().split(' ').pop() || ''

    const matchedFile = files.find((file) => {
      const fileName = file.toLowerCase()
      // Pattern: "42_Prabhu_EI_Report.docx"
      return fileName.includes(lastName) && fileName.endsWith('.docx')
    })

    return matchedFile ? path.join(docxDir, matchedFile) : null
  } catch (error: any) {
    return null
  }
}

// Generate reports for all 42 members by parsing docx files
export async function generateAllReports(docxDir: string): Promise<ReportGenerationResult[]> {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const results: ReportGenerationResult[] = []
  const parseErrors: ParseError[] = []

  if (!docxDir || !fs.existsSync(docxDir)) {
    throw new Error(
      `Docx directory not found: ${docxDir || '(empty path)'}. Required for Phase 8 verbatim import.`
    )
  }

  try {
    // Get all members
    const { data: members, error: membersError } = await supabase
      .from('member')
      .select('id, name')

    if (membersError) {
      throw new Error(`Failed to fetch members: ${membersError.message}`)
    }

    console.log(`[Phase 8] Starting report generation for ${members?.length || 0} members`)
    console.log(`[Phase 8] Reading docx narratives from: ${docxDir}`)

    for (const member of members || []) {
      try {
        // Get member's pre submission
        const { data: submission, error: subError } = await supabase
          .from('submission')
          .select('*')
          .eq('member_id', member.id)
          .eq('round', 'pre')
          .single()

        if (subError || !submission) {
          results.push({
            memberId: member.id,
            memberName: member.name,
            success: false,
            message: 'No pre-submission found',
          })
          continue
        }

        // Find docx file for this member
        const docxPath = findReportDocx(member.name, docxDir)

        if (!docxPath) {
          parseErrors.push({
            member: member.name,
            file: `*_${member.name.split(' ').pop()}_EI_Report.docx`,
            sections: ['FILE_NOT_FOUND'],
          })
          results.push({
            memberId: member.id,
            memberName: member.name,
            success: false,
            message: `Docx file not found: No file matching name "${member.name}"`,
          })
          continue
        }

        // Parse docx file to extract narratives verbatim
        let narrative: ExtractedNarrative
        try {
          narrative = await extractNarrativesFromDocx(docxPath)
        } catch (parseError: any) {
          parseErrors.push({
            member: member.name,
            file: path.basename(docxPath),
            sections: parseError.message.split(', '),
          })
          results.push({
            memberId: member.id,
            memberName: member.name,
            success: false,
            message: `Failed to parse docx: ${parseError.message}`,
          })
          continue
        }

        // Validate member name matches
        if (
          narrative.docxMemberName.toLowerCase() !==
          member.name.toLowerCase().split(' ')[0]
        ) {
          console.warn(
            `[Phase 8] Name mismatch: DB="${member.name}", Docx="Dear ${narrative.docxMemberName},"`
          )
        }

        // Create report row with imported narratives
        const { error: createError } = await supabase
          .from('report')
          .insert({
            member_id: member.id,
            submission_id: submission.id,
            state: 'Draft',
            personal_note: narrative.personalNote,
            what_you_shared: narrative.whatYouShared,
            action_plan: narrative.actionPlan,
          })

        if (createError) {
          results.push({
            memberId: member.id,
            memberName: member.name,
            success: false,
            message: `Failed to create report: ${createError.message}`,
            error: createError.message,
          })
        } else {
          results.push({
            memberId: member.id,
            memberName: member.name,
            success: true,
            message: `Report generated with narratives imported from ${path.basename(docxPath)}`,
          })
        }
      } catch (error: any) {
        results.push({
          memberId: member.id,
          memberName: member.name,
          success: false,
          message: `Error: ${error.message}`,
          error: error.message,
        })
      }
    }

    // Report parse errors if any
    if (parseErrors.length > 0) {
      console.error('[Phase 8] Parse errors found:')
      parseErrors.forEach((pe) => {
        console.error(`  ${pe.member}: ${pe.file} - Missing: ${pe.sections.join(', ')}`)
      })
    }

    return results
  } catch (error: any) {
    throw new Error(`Report generation failed: ${error.message}`)
  }
}

// Get report for a member
export async function getReport(memberId: string) {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const { data: report, error } = await supabase
    .from('report')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    throw new Error(`Failed to fetch report: ${error.message}`)
  }

  return report
}
