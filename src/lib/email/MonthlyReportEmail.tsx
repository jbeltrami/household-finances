import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Text,
} from "@react-email/components";
import { render } from "@react-email/render";

type Props = {
  userName: string;
  monthLabel: string;
  dashboardUrl: string;
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

const hrStyle = {
  borderColor: "#e2e8f0",
  margin: "24px 0",
};

const footerStyle = {
  fontSize: "12px",
  color: "#64748b",
  margin: 0,
};

const linkStyle = {
  color: "#2563eb",
};

export default function MonthlyReportEmail({
  userName,
  monthLabel,
  dashboardUrl,
  settingsUrl,
}: Props) {
  return (
    <Html lang="pt-BR">
      <Head />
      <Preview>Seu relatório de {monthLabel} está pronto</Preview>
      <Body style={bodyStyle}>
        <Container style={containerStyle}>
          <Heading style={headingStyle}>Relatório Mensal</Heading>
          <Text style={textStyle}>Olá {userName},</Text>
          <Text style={textStyle}>
            Seu relatório financeiro de <strong>{monthLabel}</strong> está
            pronto.
          </Text>
          <Button href={dashboardUrl} style={buttonStyle}>
            Ver relatório
          </Button>
          <Text style={textStyle}>
            Você pode baixar o PDF a qualquer momento na página de relatórios.
          </Text>
          <Hr style={hrStyle} />
          <Text style={footerStyle}>
            Para deixar de receber esses emails,{" "}
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

// Render the email to both HTML and plain-text bodies. nodemailer
// sends both; clients that block HTML fall back to text, and so do
// most spam-filter heuristics.
export async function renderMonthlyReportEmail(
  props: Props
): Promise<{ html: string; text: string }> {
  const element = <MonthlyReportEmail {...props} />;
  const html = await render(element);
  const text = await render(element, { plainText: true });
  return { html, text };
}
