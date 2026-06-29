import express from 'express'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

// POST /api/reports/bulk/approve - Bulk approve reports
router.post('/bulk/approve', async (req, res) => {
  try {
    const { reportIds } = req.body

    if (!reportIds || !Array.isArray(reportIds) || reportIds.length === 0) {
      return res.status(400).json({ error: 'reportIds array required' })
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Fetch reports to check states
    const { data: reports, error: fetchError } = await supabase
      .from('report')
      .select('*')
      .in('id', reportIds)

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message })
    }

    const results = {
      approved: [] as string[],
      skipped: [] as { reportId: string; reason: string }[],
    }

    // Separate approvable and non-approvable reports
    for (const report of reports || []) {
      // Can only approve Draft or Edited, not if already Sent/Failed/Hold
      if (report.state === 'Sent' || report.state === 'Failed' || report.state === 'Hold') {
        results.skipped.push({
          reportId: report.id,
          reason: `Cannot approve: already in ${report.state} state`,
        })
      } else if (report.state === 'Approved') {
        results.skipped.push({
          reportId: report.id,
          reason: 'Already approved',
        })
      } else {
        // Draft or Edited - can approve
        results.approved.push(report.id)
      }
    }

    // Bulk update approved reports
    if (results.approved.length > 0) {
      const { error: updateError } = await supabase
        .from('report')
        .update({ state: 'Approved' })
        .in('id', results.approved)

      if (updateError) {
        return res.status(500).json({ error: updateError.message })
      }

      // Create audit entries for each approved report
      const auditEntries = results.approved.map((reportId) => {
        const report = reports?.find((r) => r.id === reportId)
        return {
          report_id: reportId,
          member_id: report?.member_id,
          action: 'approve',
          changed_fields: { state: true },
          old_values: { state: report?.state },
          new_values: { state: 'Approved' },
          created_by: 'Kaleeswaran (Bulk)',
        }
      })

      const { error: auditError } = await supabase.from('audit').insert(auditEntries)

      if (auditError) {
        console.warn('Audit logging failed:', auditError)
      }
    }

    res.json({
      success: true,
      approved: results.approved.length,
      skipped: results.skipped.length,
      details: results,
      message: `Approved ${results.approved.length} reports${results.skipped.length > 0 ? `, skipped ${results.skipped.length}` : ''}`,
    })
  } catch (error: any) {
    console.error('Bulk approve error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
