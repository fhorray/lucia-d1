import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from "@react-email/components";

interface MagicLinkEmailProps {
  loginCode?: string;
  linkUrl?: string;
}

export const MagicLink = ({ loginCode, linkUrl }: MagicLinkEmailProps) => (
  <Html>
    <Head />
    <Preview>Fazer login</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Fazer login</Heading>
        <Img
          src={`https://media.psycohub.com/psycopoint-logo.png`}
          width="auto"
          height="22"
          alt="Logo"
          style={{ marginBottom: 10 }}
        />
        <Link
          href={linkUrl}
          target="_blank"
          style={{
            ...link,
            display: "block",
            marginBottom: "16px",
          }}
        >
          Clique aqui para fazer o login
        </Link>

        <Text
          style={{
            ...text,
            color: "#ababab",
            marginTop: "14px",
            marginBottom: "16px",
          }}
        >
          Se você não tentou fazer login, você pode desconsiderar esse email.
        </Text>
        {/* <Text
          style={{
            ...text,
            color: "#ababab",
            marginTop: "12px",
            marginBottom: "38px",
          }}
        >
          Dica: Você pode configurar uma senha permanente nas configurações do
          seu perfil.
        </Text> */}

        <Text style={footer}>
          <Link
            href="https://google.com.br"
            target="_blank"
            style={{ ...link, color: "#898989" }}
          >
            Psycopoint
          </Link>
          , sua clinica virtual.
        </Text>
      </Container>
    </Body>
  </Html>
);

export default MagicLink;

const main = {
  backgroundColor: "#ffffff",
};

const container = {
  paddingLeft: "12px",
  paddingRight: "12px",
  margin: "0 auto",
};

const h1 = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "40px 0",
  padding: "0",
};

const link = {
  color: "#2754C5",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  textDecoration: "underline",
};

const text = {
  color: "#333",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "14px",
  margin: "24px 0",
};

const footer = {
  color: "#898989",
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif",
  fontSize: "12px",
  lineHeight: "22px",
  marginTop: "12px",
  marginBottom: "24px",
};
