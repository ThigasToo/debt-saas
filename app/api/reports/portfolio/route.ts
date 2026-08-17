import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/auth/session'
import { buildPortfolioReportRows } from '@/lib/reports/portfolioReport'
import ExcelJS from 'exceljs'

const GUARANTEE_HEADERS = ['Alienação Fiduciária', 'Hipoteca', 'Penhor', 'Nota Promissória', 'Fidejussória', 'Devedor Solidário']

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const rows = await buildPortfolioReportRows(session.accountId)
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Nenhum contrato para exportar ainda' }, { status: 400 })
    }

    const maxAvalistas = Math.max(1, ...rows.map((r) => r.avalistas.length))
    const avalistaHeaders = Array.from({ length: maxAvalistas }, (_, i) => (i === 0 ? 'Avalista' : `Avalista.${i}`))

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Raiz'
    workbook.created = new Date()
    const sheet = workbook.addWorksheet('Base de Dados')

    const headers = [
      'Pessoa', 'Contrato', 'Observações', 'Tomador', 'CNPJ', 'Origem', 'Tipo',
      'Data da Operação', 'Data Final', 'Valor de Face', 'Saldo Devedor', 'Parcelas', 'Parcela',
      'Valor da Garantia', 'Garantias Diversas', ...GUARANTEE_HEADERS, ...avalistaHeaders,
    ]
    sheet.addRow(headers)
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22B14C' } }
    })

    for (const r of rows) {
      const rowValues: (string | number | null)[] = [
        r.pessoa, r.contrato, r.observacoes, r.tomador, r.cnpj, r.origem, r.tipo,
        r.dataOperacao, r.dataFinal, r.valorDeFace, r.saldoDevedor, r.parcelas, r.parcela,
        r.valorDaGarantia, r.garantiasDiversas,
        ...GUARANTEE_HEADERS.map((h) => r.guaranteeCells[h] || ''),
        ...avalistaHeaders.map((_, i) => r.avalistas[i] || ''),
      ]
      const row = sheet.addRow(rowValues)
      row.getCell(10).numFmt = '#,##0.00'
      row.getCell(11).numFmt = '#,##0.00'
    }

    sheet.columns.forEach((col) => (col.width = 20))
    sheet.getColumn(3).width = 50
    sheet.views = [{ state: 'frozen', ySplit: 1 }]

    const buffer = await workbook.xlsx.writeBuffer()
    const fileName = `raiz-base-de-dados-${new Date().toISOString().slice(0, 10)}.xlsx`

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (err) {
    console.error('Erro ao exportar base de dados:', err)
    return NextResponse.json(
      { error: 'Erro ao exportar', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}