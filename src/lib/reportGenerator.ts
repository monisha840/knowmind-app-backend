import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

interface ExtractedNarrative {
  personalNote: string
  whatYouShared: string
  actionPlan: string
}

interface ReportGenerationResult {
  memberId: string
  memberName: string
  success: boolean
  message: string
  error?: string
}

// For Phase 8, we'll use placeholder narratives
// In production, integrate with a docx parsing library like 'mammoth' or 'docx'
function createPlaceholderNarrative(memberName: string): ExtractedNarrative {
  return {
    personalNote: `Dear ${memberName},\n\nWelcome to your Emotional Intelligence Assessment Report. This report provides you with a comprehensive understanding of your EI strengths and growth opportunities. Our assessment measures your capacity for self-awareness, self-regulation, motivation, empathy, social & leadership skills, and relationship intelligence.\n\nYour scores reflect your current state of emotional intelligence. The insights shared here are meant to guide your development journey and enhance your effectiveness in personal and professional relationships.\n\nWarm regards,\nKaleeswaran\nFounder, KnowMind Universe`,
    whatYouShared: 'Thank you for sharing your reflections during the assessment. Your openness and willingness to explore your EI dimensions is the first step towards meaningful growth.',
    actionPlan: '21-Day Action Plan:\n\nWeek 1: Foundation\n- Day 1-3: Reflect on your top strength. How can you leverage this more?\n- Day 4-7: Identify one growth area. What small habit can you change?\n\nWeek 2: Practice\n- Day 8-10: Practice mindfulness for self-awareness (10 mins daily)\n- Day 11-14: Journaling exercise on your emotions\n\nWeek 3: Integration\n- Day 15-17: Share one vulnerability with someone you trust\n- Day 18-21: Review progress. What shifts have you noticed?',
  }
}

// Find docx file for a member by name
async function findReportDocx(memberName: string, docxDir: string): Promise<string | null> {
  try {
    if (!fs.existsSync(docxDir)) {
      console.warn(`Docx directory not found: ${docxDir}`)
      return null
    }

    const files = fs.readdirSync(docxDir)
    // Look for file that contains the member name (case-insensitive)
    const lastName = memberName.toLowerCase().split(' ').pop() || ''

    const matchedFile = files.find((file) => {
      const fileName = file.toLowerCase()
      return fileName.includes(lastName) && fileName.endsWith('.docx')
    })

    return matchedFile ? path.join(docxDir, matchedFile) : null
  } catch (error: any) {
    console.error(`Error finding docx for ${memberName}:`, error)
    return null
  }
}

// Generate reports for all 42 members
export async function generateAllReports(docxDir: string): Promise<ReportGenerationResult[]> {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  )

  const results: ReportGenerationResult[] = []

  try {
    // Get all members
    const { data: members, error: membersError } = await supabase
      .from('member')
      .select('id, name')

    if (membersError) {
      throw new Error(`Failed to fetch members: ${membersError.message}`)
    }

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

        // Check if docx file exists
        const docxPath = await findReportDocx(member.name, docxDir)

        // Create narrative (using placeholders for Phase 8)
        const narrative = createPlaceholderNarrative(member.name)

        // Override with submission free-text if available
        if (submission.free_text?.Q28) {
          narrative.whatYouShared = submission.free_text.Q28
        }

        // Create report row
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
            message: docxPath
              ? `Report generated (docx file found for import in Phase 9)`
              : `Report generated with template narratives`,
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
