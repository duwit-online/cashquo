export const EMAIL_CONFIG_KEYS = [
  "email_provider",
  "smtp_host",
  "smtp_port",
  "smtp_user",
  "smtp_password",
  "smtp_from_email",
  "smtp_from_name",
  "resend_api_key",
];

export type EmailSettings = Record<string, string>;

export const loadEmailSettings = async (adminClient: any): Promise<EmailSettings> => {
  const { data, error } = await adminClient
    .from("app_settings")
    .select("key, value")
    .in("key", EMAIL_CONFIG_KEYS);

  if (error) {
    throw new Error(error.message);
  }

  const config: EmailSettings = {};
  data?.forEach((setting: { key: string; value: string }) => {
    config[setting.key] = setting.value;
  });

  return config;
};

const getFromAddress = (config: EmailSettings) => {
  const fromEmail = config.smtp_from_email?.trim();
  const fromName = config.smtp_from_name?.trim() || "Fidelity CashQuora";

  if (!fromEmail) {
    throw new Error("From email is not configured");
  }

  return `${fromName} <${fromEmail}>`;
};

const normalizeEmailError = (error: unknown, config: EmailSettings) => {
  const message = error instanceof Error ? error.message : "Send failed";
  const host = config.smtp_host || "your SMTP host";
  const port = config.smtp_port || "587";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("os error 110") || lowerMessage.includes("timed out")) {
    return `Connection to SMTP server ${host}:${port} timed out. The mail server is not reachable from the backend. Check the hostname, open the SMTP port in your firewall, and make sure the server allows external SMTP connections.`;
  }

  if (lowerMessage.includes("name or service not known") || lowerMessage.includes("failed to lookup address information")) {
    return `SMTP host ${host} could not be resolved. Check the hostname in admin settings.`;
  }

  return message;
};

const foldBase64 = (value: string) => {
  const lines: string[] = [];
  for (let index = 0; index < value.length; index += 76) {
    lines.push(value.slice(index, index + 76));
  }
  return lines.join("\r\n");
};

export const sendConfiguredEmail = async (
  config: EmailSettings,
  options: { html: string; subject: string; to: string },
) => {
  const provider = config.email_provider || "none";

  if (provider === "none") {
    throw new Error("No email provider configured");
  }

  if (provider === "resend") {
    const resendKey = config.resend_api_key?.trim();

    if (!resendKey) {
      throw new Error("Resend API key not configured");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: getFromAddress(config),
        to: [options.to],
        subject: options.subject,
        html: options.html,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(JSON.stringify(result));
    }

    return result;
  }

  if (provider === "smtp") {
    const host = config.smtp_host?.trim();
    const username = config.smtp_user?.trim();
    const password = config.smtp_password ?? "";
    const port = Number(config.smtp_port) || 587;

    if (!host) throw new Error("SMTP host is not configured");
    if (!username) throw new Error("SMTP username is not configured");
    if (!password) throw new Error("SMTP password is not configured");

    const { SMTPClient } = await import("https://raw.githubusercontent.com/nurulhudaapon/deno-denomailer/1.6.0/mod.ts").catch(async () =>
      await import("npm:denomailer@1.6.0")
    );
    const client = new SMTPClient({
      connection: {
        hostname: host,
        port,
        tls: port === 465,
        auth: {
          username,
          password,
        },
      },
    });

    try {
      // Encode HTML as base64 to avoid quoted-printable artifacts like "=20"
      // that appear when long lines or trailing spaces get soft-wrapped.
      const htmlBytes = new TextEncoder().encode(options.html);
      let binary = "";
      for (let i = 0; i < htmlBytes.length; i++) binary += String.fromCharCode(htmlBytes[i]);
      const base64Html = foldBase64(btoa(binary));

      // Derive a readable plain-text fallback from the HTML so clients that
      // prefer text/plain (or previews) show the actual message instead of
      // literal placeholder text like "auto".
      const plainText = options.html
        .replace(/<style[\s\S]*?<\/style>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<\/(p|div|h[1-6]|li|tr|br)>/gi, "\n")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<[^>]+>/g, "")
        .replace(/&nbsp;/gi, " ")
        .replace(/&amp;/gi, "&")
        .replace(/&lt;/gi, "<")
        .replace(/&gt;/gi, ">")
        .replace(/&quot;/gi, '"')
        .replace(/\n{3,}/g, "\n\n")
        .trim() || options.subject;

      await client.send({
        from: getFromAddress(config),
        to: options.to,
        subject: options.subject,
        content: plainText,
        mimeContent: [
          {
            mimeType: 'text/plain; charset="utf-8"',
            content: plainText,
          },
          {
            mimeType: 'text/html; charset="utf-8"',
            content: base64Html,
            transferEncoding: "base64",
          },
        ],
      });


      return { success: true };

    } catch (error) {
      throw new Error(normalizeEmailError(error, config));
    } finally {
      try {
        await client.close();
      } catch {}
    }
  }

  throw new Error("Unsupported email provider configured");
};