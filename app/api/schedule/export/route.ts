import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { installments, contracts, companies, debtTranches } from '@/lib/db/schema'
import { eq, asc } from 'drizzle-orm'
import { getSessionContext } from '@/lib/auth/session'
import ExcelJS from 'exceljs'

const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const STATUS_LABEL: Record<string, string> = { PENDING: 'Pendente', PAID: 'Pago', OVERDUE: 'Atrasado' }

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionContext()
    if (!session) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const rows = await db
      .select({
        dueDate: installments.dueDate,
        principalAmount: installments.principalAmount,
        interestAmount: installments.interestAmount,
        totalAmount: installments.totalAmount,
        status: installments.status,
        companyName: companies.name,
        contractType: contracts.contractType,
        trancheLabel: debtTranches.label,
      })
      .from(installments)
      .innerJoin(contracts, eq(installments.contractId, contracts.id))
      .innerJoin(companies, eq(contracts.companyId, companies.id))
      .leftJoin(debtTranches, eq(installments.trancheId, debtTranches.id))
      .where(eq(companies.accountId, session.accountId))
      .orderBy(asc(installments.dueDate))

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Nenhuma parcela para exportar ainda' }, { status: 400 })
    }

    // Matriz ano -> [total por mês 0..11]
    const matrix: Record<number, number[]> = {}
    const years = new Set<number>()
    for (const r of rows) {
      const due = new Date(r.dueDate)
      const year = due.getFullYear()
      const month = due.getMonth()
      years.add(year)
      if (!matrix[year]) matrix[year] = new Array(12).fill(0)
      matrix[year][month] += r.totalAmount
    }
    const sortedYears = Array.from(years).sort((a, b) => a - b)

    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'Raiz'
    workbook.created = new Date()

    // --- Aba 1: Resumo Mês x Ano ---
    const summarySheet = workbook.addWorksheet('Resumo Mês x Ano')
    summarySheet.columns = [
      { header: 'Mês', key: 'month', width: 14 },
      ...sortedYears.map((y) => ({ header: String(y), key: `y${y}`, width: 16 })),
      { header: 'Total', key: 'total', width: 16 },
    ]
    summarySheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22B14C' } }
    })

    const yearTotals: Record<number, number> = {}
    sortedYears.forEach((y) => (yearTotals[y] = 0))

    for (let m = 0; m < 12; m++) {
      const rowData: Record<string, number | string> = { month: MONTH_NAMES[m] }
      let rowTotal = 0
      for (const y of sortedYears) {
        const value = matrix[y]?.[m] ?? 0
        rowData[`y${y}`] = value
        rowTotal += value
        yearTotals[y] += value
      }
      rowData.total = rowTotal
      const row = summarySheet.addRow(rowData)
      sortedYears.forEach((y) => (row.getCell(`y${y}`).numFmt = '#,##0.00'))
      row.getCell('total').numFmt = '#,##0.00'
      row.getCell('total').font = { bold: true }
    }

    const totalRowData: Record<string, number | string> = { month: 'Total' }
    let grandTotal = 0
    sortedYears.forEach((y) => {
      totalRowData[`y${y}`] = yearTotals[y]
      grandTotal += yearTotals[y]
    })
    totalRowData.total = grandTotal
    const totalRow = summarySheet.addRow(totalRowData)
    totalRow.font = { bold: true }
    sortedYears.forEach((y) => (totalRow.getCell(`y${y}`).numFmt = '#,##0.00'))
    totalRow.getCell('total').numFmt = '#,##0.00'
    totalRow.eachCell((cell) => (cell.border = { top: { style: 'thin' } }))
    summarySheet.getColumn('month').font = { bold: true }

    // --- Aba 2: Parcelas Detalhado ---
    const detailSheet = workbook.addWorksheet('Parcelas Detalhado')
    detailSheet.columns = [
      { header: 'Vencimento', key: 'dueDate', width: 14 },
      { header: 'Ano', key: 'year', width: 8 },
      { header: 'Mês', key: 'month', width: 10 },
      { header: 'Empresa', key: 'company', width: 28 },
      { header: 'Contrato', key: 'contractType', width: 18 },
      { header: 'Tranche', key: 'tranche', width: 20 },
      { header: 'Amortização', key: 'principal', width: 16 },
      { header: 'Juros', key: 'interest', width: 16 },
      { header: 'Total (PMT)', key: 'total', width: 16 },
      { header: 'Status', key: 'status', width: 12 },
    ]
    detailSheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF22B14C' } }
    })

    for (const r of rows) {
      const due = new Date(r.dueDate)
      const row = detailSheet.addRow({
        dueDate: due,
        year: due.getFullYear(),
        month: MONTH_NAMES[due.getMonth()],
        company: r.companyName,
        contractType: r.contractType || '—',
        tranche: r.trancheLabel || '—',
        principal: r.principalAmount,
        interest: r.interestAmount,
        total: r.totalAmount,
        status: STATUS_LABEL[r.status] || r.status,
      })
      row.getCell('dueDate').numFmt = 'dd/mm/yyyy'
      row.getCell('principal').numFmt = '#,##0.00'
      row.getCell('interest').numFmt = '#,##0.00'
      row.getCell('total').numFmt = '#,##0.00'
    }
    detailSheet.autoFilter = { from: 'A1', to: 'J1' }
    detailSheet.views = [{ state: 'frozen', ySplit: 1 }]

    const buffer = await workbook.xlsx.writeBuffer()
    const fileName = `raiz-cronograma-pmt-${new Date().toISOString().slice(0, 10)}.xlsx`

    return new NextResponse(buffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    })
  } catch (err) {
    console.error('Erro ao exportar Excel:', err)
    return NextResponse.json(
      { error: 'Erro ao exportar', details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    )
  }
}