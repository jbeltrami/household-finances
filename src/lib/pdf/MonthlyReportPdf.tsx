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
import type { MonthlyReportData, ReportIncomeRow } from "@/helpers/reports";
import type { ResolvedEntry } from "@/helpers/types";

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

type Props = { data: MonthlyReportData; generatedAt: Date };

function EntryRows({ entries }: { entries: ResolvedEntry[] }) {
  if (entries.length === 0) {
    return <Text style={styles.empty}>Sem lançamentos.</Text>;
  }
  return (
    <View>
      {entries.map((e, idx) => (
        <View
          key={`${e.id ?? "virtual"}-${e.template_id ?? "oneoff"}-${e.date}-${idx}`}
          style={styles.row}
        >
          <Text style={styles.colDate}>{formatYmdShort(e.date)}</Text>
          <Text style={styles.colName}>{e.name}</Text>
          <Text style={styles.colAmount}>{brlFormatter.format(e.amount)}</Text>
          <Text
            style={[
              styles.colStatus,
              e.paid ? styles.statusPaid : styles.statusPending,
            ]}
          >
            {e.paid ? "Pago" : "Pendente"}
          </Text>
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
  const { spaceName, year, month, bills, expenses, income, totals } = data;
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
          <Text style={styles.sectionTitle}>Despesas avulsas</Text>
          <EntryRows entries={expenses} />
          {expenses.length > 0 ? (
            <View style={styles.summary}>
              <Text style={styles.summaryItem}>
                Total: {brlFormatter.format(totals.totalExpenses)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumo</Text>
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
