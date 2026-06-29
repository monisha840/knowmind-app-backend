import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

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

// Extract text from docx files using python-docx via Node
async function extractDocxText(filePath: string): Promise<string> {
  try {
    // Use pandoc or python-docx via command line to extract text
    // For now, we'll use a simple approach: extract via unzip + XML parsing
    const { stdout } = await execAsync(`python3 -c "
import zipfile
import xml.etree.ElementTree as ET
import sys

try:
    with zipfile.ZipFile('${filePath}', 'r') as zip:
        xml_content = zip.read('word/document.xml')
        root = ET.fromstring(xml_content)
        ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        text_elements = root.findall('.//w:t', ns)
        text = ''.join([t.text or '' for t in text_elements])
        print(text)
except Exception as e:
    print(f'Error: {str(e)}', file=sys.stderr)
    sys.exit(1)
"`)
    return stdout.trim()
  } catch (error: any) {
    console.error(`Error extracting docx text from ${filePath}:`, error)
    throw new Error(`Failed to extract docx: ${error.message}`)
  }
}

// Parse extracted narrative text into sections
function parseNarrative(text: string): ExtractedNarrative {
  // This will parse the docx content to extract the three main sections
  // For now, we'll look for section markers or just split intelligently

  // Try to find section markers in the text
  const personalNoteMatch = text.match(/PERSONAL NOTE|Dear\s+\w+.*?(?=WHAT YOU SHARED|$)/is)
  const whatYouSharedMatch = text.match(/WHAT YOU SHARED.*?(?=ACTION PLAN|$)/is)
  const actionPlanMatch = text.match(/ACTION PLAN.*?(?=NEXT STEP|$)/is)

  return {
    personalNote: personalNoteMatch ? personalNoteMatch[0].trim() : '',
    whatYouShared: whatYouSharedMatch ? whatYouSharedMatch[0].trim() : '',
    actionPlan: actionPlanMatch ? actionPlanMatch[0].trim() : '',
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
    const namePattern = memberName.toLowerCase().replace(/\s+/g, '_')

    const matchedFile = files.find((file) => {
      const fileName = file.toLowerCase()
      // Match patterns like: "42_Prabhu_EI_Report.docx" or "Prabhu_EI_Report.docx"
      return (
        fileName.includes(namePattern) ||
        file.toLowerCase().includes(memberName.toLowerCase().split(' ')[0])
      ) && fileName.endsWith('.docx')
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

        // Find and parse docx file
        const docxPath = await findReportDocx(member.name, docxDir)

        let narrative: ExtractedNarrative = {
          personalNote: '',
          whatYouShared: submission.free_text?.Q28 || '',
          actionPlan: '',
        }

        if (docxPath) {
          try {
            const docxText = await extractDocxText(docxPath)
            narrative = parseNarrative(docxText)

            // Fall back to submission free-text if extraction didn't work
            if (!narrative.whatYouShared && submission.free_text?.Q28) {
              narrative.whatYouShared = submission.free_text.Q28
            }
          } catch (docxError: any) {
            console.warn(`Could not parse docx for ${member.name}: ${docxError.message}`)
            narrative.whatYouShared = submission.free_text?.Q28 || ''
          }
        } else {
          console.warn(`No docx file found for ${member.name}`)
          narrative.whatYouShared = submission.free_text?.Q28 || ''
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
            message: `Report generated successfully${docxPath ? ' (docx imported)' : ' (using submission data)'}`,
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
