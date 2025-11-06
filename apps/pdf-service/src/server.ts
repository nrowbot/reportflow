import express from 'express'
import puppeteer from 'puppeteer'

const app = express()
app.use(express.json({ limit: '4mb' }))

app.post('/pdf', async (req, res) => {
    const { html } = req.body as { html: string }
    const browser = await puppeteer.launch({ args: ['--no-sandbox'] })
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({ format: 'Letter', printBackground: true, preferCSSPageSize: true })
    await browser.close()
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline; filename="report.pdf"')
    res.send(pdf)
})

app.listen(3001, () => console.log('pdf-service on :3001'))