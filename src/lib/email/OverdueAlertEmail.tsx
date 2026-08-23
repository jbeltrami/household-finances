import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";
import { brlFormatter, dateFormatter } from "@/helpers/format";
import type { AlertRow } from "@/helpers/alerts";

type Props = {
  userName: string;
  rows: AlertRow[];
  total: number;
  monthUrl: string;
  settingsUrl: string;
};

const bodyStyle = {
  backgroundColor: "#f8fafc",
  fontFamily: "Helvetica, Arial, sans-serif",
  margin: 0,
  padding: 0,
};

const containerStyle = {
  maxWidth: "480px",
  margin: "32px auto",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  padding: "32px",
};

const headingStyle = {
  fontSize: "20px",
  fontWeight: "bold",
  color: "#0f172a",
  margin: "0 0 16px",
};

const textStyle = {
  fontSize: "14px",
  lineHeight: "20px",
  color: "#1f2937",
  margin: "0 0 12px",
};

const listStyle = {
  margin: "16px 0",
};

const rowStyle = {
  borderBottom: "1px solid #e2e8f0",
};

const nameCellStyle = {
  fontSize: "14px",
  color: "#1f2937",
  padding: "8px 0",
};

// Red is this app's one urgency signal, and it means Vencida. The amount
// carries it here for the same reason the calendar dot does.
const amountCellStyle = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#dc2626",
  padding: "8px 0",
  textAlign: "right" as const,
  whiteSpace: "nowrap" as const,
};

const dateStyle = {
  fontSize: "12px",
  color: "#64748b",
  margin: "2px 0 0",
};

const totalRowStyle = {
  paddingTop: "12px",
};

const totalLabelStyle = {
  fontSize: "14px",
  fontWeight: 600,
  color: "#0f172a",
  padding: "8px 0",
};

const totalAmountStyle = {
  ...amountCellStyle,
  fontSize: "16px",
};

const buttonStyle = {
  backgroundColor: "#2563eb",
  color: "#ffffff",
  padding: "10px 20px",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: 500,
  display: "inline-block",
  marginTop: "8px",
  marginBottom: "8px",
};

const hrStyle = { borderColor: "#e2e8f0", margin: "24px 0" };
const footerStyle = { fontSize: "12px", color: "#64748b", margin: 0 };
const linkStyle = { color: "#2563eb" };

// Postgres `date` values arrive as "YYYY-MM-DD". Parsed as a Date they are
// UTC midnight, which in São Paulo formats as the day before — so the
// formatter is pinned to UTC, as everywhere else that prints a calendar date.
function formatDue(ymd: string): string {
  return dateFormatter.format(new Date(`${ymd}T00:00:00Z`));
}

function plural(count: number): string {
  return count === 1 ? "pagamento vencido" : "pagamentos vencidos";
}

export function alertSubject(count: number): string {
  return `Você tem ${count} ${plural(count)}`;
}

export default function OverdueAlertEmail({
  userName,
  rows,
  total,
  monthUrl,
  settingsUrl,
}: Props) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>{`${rows.length} ${plural(rows.length)} somando ${brlFormatter.format(total)}`}</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Pagamentos vencidos</Heading>
          <Text style={textStyle}>Olá {userName},</Text>
          <Text style={textStyle}>
            {/* Not "contas": the list mixes Contas and parcelas de
                Financiamento, and a parcela is not a Conta. */}
            {rows.length === 1
              ? "Você tem um pagamento vencido ainda em aberto:"
              : `Você tem ${rows.length} pagamentos vencidos ainda em aberto:`}
          </Text>

          <Section style={listStyle}>
            {rows.map((row) => (
              <Row key={`${row.name}-${row.date}`} style={rowStyle}>
                <Column style={nameCellStyle}>
                  {row.name}
                  <Text style={dateStyle}>Venceu em {formatDue(row.date)}</Text>
                </Column>
                <Column style={amountCellStyle}>
                  {brlFormatter.format(row.amount)}
                </Column>
              </Row>
            ))}
            <Row style={totalRowStyle}>
              <Column style={totalLabelStyle}>Total</Column>
              <Column style={totalAmountStyle}>
                {brlFormatter.format(total)}
              </Column>
            </Row>
          </Section>

          <Button href={monthUrl} style={buttonStyle}>
            Ver o mês
          </Button>

          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            Este aviso se repete a cada dia enquanto houver algo em aberto. Para
            deixar de recebê-lo,{" "}
            <Link href={settingsUrl} style={linkStyle}>
              ajuste suas configurações
            </Link>
            .
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

// Both bodies: nodemailer sends each, clients that block HTML fall back to
// the text one, and so do most spam-filter heuristics.
export async function renderOverdueAlertEmail(
  props: Props
): Promise<{ html: string; text: string }> {
  const element = <OverdueAlertEmail {...props} />;
  const html = await render(element);
  const text = await render(element, { plainText: true });
  return { html, text };
}
