import express from 'express'
import { createClient } from '@supabase/supabase-js'

const router = express.Router()

// POST /api/reports/:id/save - Save narrative edits
router.post('/:id/save', async (req, res) => {
  try {
    const { id } = req.params
    const { personalNote, whatYouShared, actionPlan, changedFields } = req.body

    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Fetch current report
    const { data: currentReport, error: fetchError } = await supabase
      .from('report')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentReport) {
      return res.status(404).json({ error: 'Report not found' })
    }

    // Prepare update
    const updateData: any = { state: 'Edited' }
    if (changedFields?.personalNote) updateData.personal_note = personalNote
    if (changedFields?.whatYouShared) updateData.what_you_shared = whatYouShared
    if (changedFields?.actionPlan) updateData.action_plan = actionPlan

    // Update report
    const { error: updateError } = await supabase
      .from('report')
      .update(updateData)
      .eq('id', id)

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    // Record audit entry
    const oldValues: any = {}
    const newValues: any = {}

    if (changedFields?.personalNote) {
      oldValues.personal_note = currentReport.personal_note
      newValues.personal_note = personalNote
    }
    if (changedFields?.whatYouShared) {
      oldValues.what_you_shared = currentReport.what_you_shared
      newValues.what_you_shared = whatYouShared
    }
    if (changedFields?.actionPlan) {
      oldValues.action_plan = currentReport.action_plan
      newValues.action_plan = actionPlan
    }

    const { error: auditError } = await supabase.from('audit').insert({
      report_id: id,
      member_id: currentReport.member_id,
      action: 'save',
      changed_fields: changedFields,
      old_values: oldValues,
      new_values: newValues,
      created_by: 'Kaleeswaran', // In production, get from auth session
    })

    if (auditError) {
      console.warn('Audit logging failed:', auditError)
      // Don't fail the request if audit fails
    }

    res.json({
      success: true,
      report: updateData,
      message: 'Report saved',
    })
  } catch (error: any) {
    console.error('Save error:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/reports/:id/approve - Approve and lock report
router.post('/:id/approve', async (req, res) => {
  try {
    const { id } = req.params

    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    // Fetch current report
    const { data: currentReport, error: fetchError } = await supabase
      .from('report')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentReport) {
      return res.status(404).json({ error: 'Report not found' })
    }

    // Check if already sent
    if (currentReport.state === 'Sent' || currentReport.state === 'Failed') {
      return res
        .status(400)
        .json({ error: `Cannot approve report in ${currentReport.state} state` })
    }

    // Update to Approved state
    const { error: updateError } = await supabase
      .from('report')
      .update({ state: 'Approved' })
      .eq('id', id)

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    // Record audit entry
    const { error: auditError } = await supabase.from('audit').insert({
      report_id: id,
      member_id: currentReport.member_id,
      action: 'approve',
      changed_fields: { state: true },
      old_values: { state: currentReport.state },
      new_values: { state: 'Approved' },
      created_by: 'Kaleeswaran',
    })

    if (auditError) {
      console.warn('Audit logging failed:', auditError)
    }

    res.json({
      success: true,
      state: 'Approved',
      message: 'Report approved. Narrative is now locked.',
    })
  } catch (error: any) {
    console.error('Approve error:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /api/reports/:id/hold - Place report on hold
router.post('/:id/hold', async (req, res) => {
  try {
    const { id } = req.params
    const { reason } = req.body

    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { data: currentReport, error: fetchError } = await supabase
      .from('report')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !currentReport) {
      return res.status(404).json({ error: 'Report not found' })
    }

    const { error: updateError } = await supabase
      .from('report')
      .update({ state: 'Hold' })
      .eq('id', id)

    if (updateError) {
      return res.status(500).json({ error: updateError.message })
    }

    const { error: auditError } = await supabase.from('audit').insert({
      report_id: id,
      member_id: currentReport.member_id,
      action: 'hold',
      notes: reason || null,
      created_by: 'Kaleeswaran',
    })

    if (auditError) {
      console.warn('Audit logging failed:', auditError)
    }

    res.json({
      success: true,
      state: 'Hold',
      message: 'Report placed on hold',
    })
  } catch (error: any) {
    console.error('Hold error:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /api/reports/:id/audit - Get audit trail
router.get('/:id/audit', async (req, res) => {
  try {
    const { id } = req.params

    const supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    )

    const { data: auditEntries, error } = await supabase
      .from('audit')
      .select('*')
      .eq('report_id', id)
      .order('created_at', { ascending: false })

    if (error) {
      return res.status(500).json({ error: error.message })
    }

    res.json({
      success: true,
      audit: auditEntries || [],
    })
  } catch (error: any) {
    console.error('Audit fetch error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
