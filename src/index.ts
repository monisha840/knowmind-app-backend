import dotenv from 'dotenv'
dotenv.config()

import express, { Request, Response } from 'express'
import cors from 'cors'
import multer from 'multer'
import { parseExcelFile, computeImportDiff, executeImport } from './lib/importMembers'
import reportsRouter from './routes/reports'
import reportsEditRouter from './routes/reportsEdit'

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())

const upload = multer({ storage: multer.memoryStorage() })

app.get('/api/health', (req, res) => {
  res.json({ ok: true })
})

// Parse and preview import
app.post('/api/import/preview', upload.single('file'), async (req: Request, res: Response) => {
  try {
    console.log('=== /api/import/preview ===')
    console.log('Request received:', {
      hasFile: !!req.file,
      fileName: req.file?.originalname,
      fileSize: req.file?.size,
      contentType: req.get('content-type')
    })

    if (!req.file) {
      console.error('ERROR: No file in request')
      return res.status(400).json({ error: 'No file uploaded' })
    }

    console.log('Parsing file...')
    const { headers, rows, errors } = await parseExcelFile(req.file.buffer)

    console.log('=== Parse Results ===')
    console.log('Headers from Excel:', headers)
    console.log('Successfully parsed rows:', rows.length)
    console.log('Parse errors:', errors.length)

    if (errors.length > 0 && rows.length === 0) {
      return res.status(400).json({ error: 'No valid rows could be parsed', errors })
    }

    const diff = await computeImportDiff(rows)

    res.json({
      success: true,
      headers,
      preview: {
        total: rows.length,
        new: diff.new.length,
        update: diff.update.length,
        duplicate: diff.duplicate.length,
        existing: diff.existingCount,
      },
      samples: {
        new: diff.new.slice(0, 3),
        update: diff.update.slice(0, 3),
        duplicate: diff.duplicate.slice(0, 3),
      },
      errors: errors.slice(0, 10), // First 10 errors
      rowsToImport: rows, // Full data for confirmation
    })
  } catch (err: any) {
    console.error('Import preview error:', err)
    res.status(500).json({ error: err.message })
  }
})

// Execute import (needs JSON parsing)
app.post(
  '/api/import/execute',
  express.json({ limit: '50mb' }),
  async (req: Request, res: Response) => {
    try {
      const { rows } = req.body

      if (!rows || !Array.isArray(rows)) {
        return res.status(400).json({ error: 'Invalid request: rows array required' })
      }

      const result = await executeImport(rows)

      res.json({
        success: true,
        created: result.created,
        updated: result.updated,
        cohortStats: result.cohortStats,
        message: `Imported ${result.created} new members. Cohort average: ${result.cohortStats.average}. Weakest domain: ${result.cohortStats.weakestDomain}`,
      })
    } catch (err: any) {
      console.error('Import execution error:', err)
      res.status(500).json({ error: err.message })
    }
  }
)

// Reports routes
app.use('/api/reports', reportsRouter)
app.use('/api/reports', reportsEditRouter)

app.listen(PORT, () => {
  console.log(`KnowMind backend running on http://localhost:${PORT}`)
})
