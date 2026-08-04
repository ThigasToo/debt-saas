import { 
  pgTable, 
  pgEnum, 
  text, 
  timestamp, 
  integer, 
  real, 
  uuid,
  uniqueIndex,
  jsonb
} from 'drizzle-orm/pg-core'

// Enums
export const membershipRoleEnum = pgEnum('membership_role', ['OWNER', 'ADMIN', 'MEMBER'])
export const contractStatusEnum = pgEnum('contract_status', ['PROCESSING', 'PENDING_REVIEW', 'ACTIVE', 'ARCHIVED', 'FAILED'])
export const extractionStatusEnum = pgEnum('extraction_status', ['PENDING_REVIEW', 'CONFIRMED', 'CORRECTED'])

// Tabelas
export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const memberships = pgTable('memberships', {
  id: uuid('id').defaultRandom().primaryKey(),
  role: membershipRoleEnum('role').default('MEMBER').notNull(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  accountUserIdx: uniqueIndex('idx_account_user').on(table.accountId, table.userId),
}))

export const companies = pgTable('companies', {
  id: uuid('id').defaultRandom().primaryKey(),
  accountId: uuid('account_id').notNull().references(() => accounts.id),
  name: text('name').notNull(),
  cnpj: text('cnpj'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  documentType: text('document_type').notNull().default('CNPJ'), // 'CNPJ' | 'CPF'
}, (table) => ({
  accountCnpjIdx: uniqueIndex('idx_account_cnpj').on(table.accountId, table.cnpj),
}))

export const contracts = pgTable('contracts', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  status: contractStatusEnum('status').default('PROCESSING').notNull(),
  contractType: text('contract_type'),
  // Perfil detectado pela IA: modalidade, banco, garantias, grupos de campos relevantes
  profile: jsonb('profile'),
  // Especificação de cálculo da dívida (interpretada pela IA, executada pelo motor)
  scheduleSpec: jsonb('schedule_spec'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const contractDocuments = pgTable('contract_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  fileName: text('file_name').notNull(),
  storagePath: text('storage_path').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
})

export const extractedFields = pgTable('extracted_fields', {
  id: uuid('id').defaultRandom().primaryKey(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  fieldName: text('field_name').notNull(),
  fieldLabel: text('field_label'),
  fieldGroup: text('field_group'),
  dataType: text('data_type'),
  displayOrder: integer('display_order').default(0),
  fieldValue: text('field_value').notNull(),
  sourcePage: integer('source_page'),
  sourceClause: text('source_clause'),
  sourceExcerpt: text('source_excerpt'),
  confidence: real('confidence'),
  // 'AI' = extraído pelo modelo | 'MANUAL' = adicionado pelo revisor
  origin: text('origin').default('AI'),
  status: extractionStatusEnum('status').default('PENDING_REVIEW').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const installmentStatusEnum = pgEnum('installment_status', ['PENDING', 'PAID', 'OVERDUE'])

export const installments = pgTable('installments', {
  id: uuid('id').defaultRandom().primaryKey(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  trancheId: uuid('tranche_id').references(() => debtTranches.id),
  installmentNumber: integer('installment_number').notNull(),
  dueDate: timestamp('due_date').notNull(),
  principalAmount: real('principal_amount').notNull(),
  interestAmount: real('interest_amount').notNull(),
  totalAmount: real('total_amount').notNull(),
  remainingBalance: real('remaining_balance').notNull(),
  source: text('source').default('CALCULATED'),
  components: jsonb('components'),
  notes: text('notes'),
  status: installmentStatusEnum('status').default('PENDING').notNull(),
  paidAmount: real('paid_amount'),
  paidDate: timestamp('paid_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const debtTranches = pgTable('debt_tranches', {
  id: uuid('id').defaultRandom().primaryKey(),
  contractId: uuid('contract_id').notNull().references(() => contracts.id),
  label: text('label').notNull(),           // ex: "Recursos Equalizáveis", "Recursos Livres", "Principal"
  scheduleSpec: jsonb('schedule_spec').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})