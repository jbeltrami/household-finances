import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import { brlFormatter, dateFormatter } from "@/helpers/format";
import { formatMonthLabel } from "@/helpers/date";
import type {
  MonthlyReportData,
  ReportEntryRow,
  ReportIncomeRow,
} from "@/helpers/reports";
import type { FinancingReportRow } from "@/helpers/financing";

const colors = {
  text: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  positive: "#16a34a",
  negative: "#dc2626",
};

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    fontSize: 11,
    color: colors.text,
    fontFamily: "Helvetica",
  },
  header: {
    marginBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 12,
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: colors.muted,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 4,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  colDate: { width: "12%", color: colors.muted },
  colName: { width: "48%" },
  colAmount: { width: "22%", textAlign: "right" },
  colStatus: { width: "18%", textAlign: "right" },
  // Wider variants for rows without a status column (realized spending —
  // despesas are money already spent, so "pago/pendente" doesn't apply).
  colNameNoStatus: { width: "58%" },
  colAmountNoStatus: { width: "30%", textAlign: "right" },
  statusPaid: { color: colors.positive },
  statusPending: { color: colors.muted },
  summary: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    fontFamily: "Helvetica-Bold",
  },
  summaryItem: {
    fontSize: 10,
  },
  balanceCard: {
    marginTop: 8,
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 4,
  },
  balanceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 3,
  },
  balanceLabel: {
    color: colors.muted,
  },
  balanceValue: {
    fontFamily: "Helvetica-Bold",
  },
  empty: {
    fontSize: 10,
    color: colors.muted,
    fontStyle: "italic",
  },
  finBlock: {
    marginBottom: 10,
    padding: 10,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 4,
  },
  finHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  finName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
  },
  finMeta: {
    fontSize: 9,
    color: colors.muted,
  },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 48,
    right: 48,
    fontSize: 9,
    color: colors.muted,
    textAlign: "center",
  },
});

const formatYmdShort = (ymd: string) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  return dateFormatter.format(d);
};

const capitalize = (s: string) =>
  s.length === 0 ? s : s[0].toUpperCase() + s.slice(1);

const systemShort = (s: FinancingReportRow["system"]) =>
  s === "sac" ? "SAC" : "Price";
const periodShort = (p: FinancingReportRow["ratePeriod"]) =>
  p === "monthly" ? "a.m." : "a.a.";
// "YYYY-MM-DD" -> "MM/YYYY"
const payoffLabel = (ymd: string) => {
  const [y, m] = ymd.split("-");
  return `${m}/${y}`;
};

function FinancingSection({ financings }: { financings: FinancingReportRow[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Financiamentos</Text>
      {financings.map((f, idx) => (
        <View key={`${f.name}-${idx}`} style={styles.finBlock}>
          <View style={styles.finHeader}>
            <Text style={styles.finName}>{f.name}</Text>
            <Text style={styles.finMeta}>
              {systemShort(f.system)} · {f.ratePercent}%{" "}
              {periodShort(f.ratePeriod)}
            </Text>
          </View>
          {f.installmentNumber !== null ? (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Parcela do mês</Text>
              <Text style={styles.balanceValue}>
                {brlFormatter.format(f.installmentAmount ?? 0)} (
                {f.installmentPaid ? "Pago" : "Pendente"})
              </Text>
            </View>
          ) : null}
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Progresso</Text>
            <Text style={styles.balanceValue}>
              {f.paidCount}/{f.totalInstallments} ({f.percentComplete}%)
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Saldo devedor</Text>
            <Text style={styles.balanceValue}>
              {brlFormatter.format(f.outstandingBalance)}
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Previsão de quitação</Text>
            <Text style={styles.balanceValue}>{payoffLabel(f.payoffDate)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

type Props = { data: MonthlyReportData; generatedAt: Date };

// `showStatus` is false for realized spending (despesas), where a
// pago/pendente label is meaningless — those rows omit the status column.
function EntryRows({
  entries,
  showStatus = true,
}: {
  entries: ReportEntryRow[];
  showStatus?: boolean;
}) {
  if (entries.length === 0) {
    return <Text style={styles.empty}>Sem lançamentos.</Text>;
  }
  return (
    <View>
      {entries.map((e, idx) => (
        <View key={`${e.date}-${e.name}-${idx}`} style={styles.row}>
          <Text style={styles.colDate}>{formatYmdShort(e.date)}</Text>
          <Text style={showStatus ? styles.colName : styles.colNameNoStatus}>
            {e.name}
          </Text>
          <Text
            style={showStatus ? styles.colAmount : styles.colAmountNoStatus}
          >
            {brlFormatter.format(e.amount)}
          </Text>
          {showStatus ? (
            <Text
              style={[
                styles.colStatus,
                e.paid ? styles.statusPaid : styles.statusPending,
              ]}
            >
              {e.paid ? "Pago" : "Pendente"}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

function IncomeRows({ entries }: { entries: ReportIncomeRow[] }) {
  if (entries.length === 0) {
    return <Text style={styles.empty}>Sem receitas.</Text>;
  }
  return (
    <View>
      {entries.map((i) => (
        <View key={i.id} style={styles.row}>
          <Text style={styles.colDate}>{formatYmdShort(i.expected_date)}</Text>
          <Text style={styles.colName}>{i.name}</Text>
          <Text style={styles.colAmount}>{brlFormatter.format(i.amount)}</Text>
          <Text
            style={[
              styles.colStatus,
              i.received ? styles.statusPaid : styles.statusPending,
            ]}
          >
            {i.received ? "Recebido" : "Pendente"}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MonthlyReportPdf({ data, generatedAt }: Props) {
  const { spaceName, year, month, bills, expenses, income, financings, totals } =
    data;
  const monthLabel = capitalize(formatMonthLabel(year, month));
  const generatedLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(generatedAt);

  return (
    <Document title={`Relatório ${year}-${String(month).padStart(2, "0")}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Relatório Mensal</Text>
          <Text style={styles.subtitle}>
            {spaceName} · {monthLabel}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receitas</Text>
          <IncomeRows entries={income} />
          {income.length > 0 ? (
            <View style={styles.summary}>
              <Text style={styles.summaryItem}>
                Esperado: {brlFormatter.format(totals.totalIncome)}
              </Text>
              <Text style={styles.summaryItem}>
                Recebido: {brlFormatter.format(totals.receivedIncome)}
              </Text>
              <Text style={styles.summaryItem}>
                A receber: {brlFormatter.format(totals.stillToReceive)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contas recorrentes</Text>
          <EntryRows entries={bills} />
          {bills.length > 0 ? (
            <View style={styles.summary}>
              <Text style={styles.summaryItem}>
                Total: {brlFormatter.format(totals.totalBills)}
              </Text>
              <Text style={styles.summaryItem}>
                Pago: {brlFormatter.format(totals.paidBills)}
              </Text>
              <Text style={styles.summaryItem}>
                Falta pagar: {brlFormatter.format(totals.remainingBills)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Despesas</Text>
          <EntryRows entries={expenses} showStatus={false} />
          {expenses.length > 0 ? (
            <View style={styles.summary}>
              <Text style={styles.summaryItem}>
                Total: {brlFormatter.format(totals.totalExpenses)}
              </Text>
            </View>
          ) : null}
        </View>

        {financings.length > 0 ? (
          <FinancingSection financings={financings} />
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saldo</Text>
          <View style={styles.balanceCard}>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Saldo esperado</Text>
              <Text style={styles.balanceValue}>
                {brlFormatter.format(totals.netExpected)}
              </Text>
            </View>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Saldo até o momento</Text>
              <Text style={styles.balanceValue}>
                {brlFormatter.format(totals.netSoFar)}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footer} fixed>
          Gerado em {generatedLabel}
        </Text>
      </Page>
    </Document>
  );
}

export async function renderMonthlyReportPdf(
  data: MonthlyReportData
): Promise<Buffer> {
  return renderToBuffer(
    <MonthlyReportPdf data={data} generatedAt={new Date()} />
  );
}
