import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { accounts } from '@/lib/db/schema'

export async function GET(req: NextRequest) {
  try {
    // Testa conexão simples
    const result = await db.select().from(accounts).limit(1)
    
    return NextResponse.json({
      success: true,
      message: 'Conexão com Supabase funcionando!',
      dbTest: result,
    })
  } catch (err) {
    console.error('Erro na conexão:', err)
    return NextResponse.json(
      {
        error: 'Erro ao conectar no banco',
        details: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    )
  }
}