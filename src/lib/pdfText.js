import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// Junta os pedaços de texto de uma linha, decidindo se cada par vizinho
// precisa de um espaço entre eles com base no espaço horizontal real entre
// eles (alguns PDFs quebram uma palavra em vários pedaços por causa de
// kerning — juntar tudo com espaço faz "PARCELADO" virar "P ARCELADO").
function joinLineItems(items) {
  let line = ''
  let prevEnd = null

  for (const item of items) {
    const fontSize = Math.hypot(item.transform[0], item.transform[1]) || 10
    const start = item.transform[4]
    const gap = prevEnd === null ? 0 : start - prevEnd

    if (prevEnd !== null && gap > fontSize * 0.2 && !line.endsWith(' ') && !item.str.startsWith(' ')) {
      line += ' '
    }
    line += item.str
    prevEnd = start + (item.width ?? 0)
  }

  return line.replace(/\s+/g, ' ').trim()
}

// Junta os itens de texto de uma página em linhas, agrupando pela posição Y
// (o PDF não guarda "linhas", só posições soltas de cada pedaço de texto).
function groupItemsIntoLines(items) {
  const sorted = [...items].sort((a, b) => {
    const yDiff = b.transform[5] - a.transform[5]
    if (Math.abs(yDiff) > 2) return yDiff
    return a.transform[4] - b.transform[4]
  })

  const lines = []
  let current = null
  let currentY = null

  for (const item of sorted) {
    const y = item.transform[5]
    if (current === null || currentY === null || Math.abs(y - currentY) > 2) {
      current = []
      currentY = y
      lines.push(current)
    }
    current.push(item)
  }

  return lines.map(joinLineItems).filter(Boolean)
}

// Extrai todo o texto de um PDF de fatura, como uma lista de linhas (na
// ordem em que aparecem, página após página).
export async function extractPdfLines(file) {
  const buffer = await file.arrayBuffer()
  const doc = await pdfjsLib.getDocument({ data: buffer }).promise

  const allLines = []
  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const page = await doc.getPage(pageNumber)
    const content = await page.getTextContent()
    allLines.push(...groupItemsIntoLines(content.items))
  }

  return allLines
}
