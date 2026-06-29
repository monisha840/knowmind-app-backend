import express from 'express'
import { generateAllReports, getReport } from '../lib/reportGenerator'
import path from 'path'

const router = express.Router()

// POST /api/reports/generate - Generate all reports
router.post('/generate', async (req, res) => {
  try {
    const { docxDir = '' } = req.body

    console.log(`Starting report generation${docxDir ? ` from: ${docxDir}` : ' (using template narratives)'}`)
    const results = await generateAllReports(docxDir)

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.length - successCount

    console.log(`Report generation complete: ${successCount} succeeded, ${failureCount} failed`)

    res.json({
      success: true,
      message: `Generated ${successCount}/${results.length} reports`,
      successCount,
      failureCount,
      results,
    })
  } catch (error: any) {
    console.error('Report generation error:', error)
    res.status(500).json({
      success: false,
      error: 'Report generation failed',
      message: error.message,
    })
  }
})

// GET /api/reports/:memberId - Get report for a member
router.get('/:memberId', async (req, res) => {
  try {
    const { memberId } = req.params
    const report = await getReport(memberId)

    res.json({
      success: true,
      report,
    })
  } catch (error: any) {
    console.error('Get report error:', error)
    res.status(404).json({
      error: 'Report not found',
      message: error.message,
    })
  }
})

export default router
