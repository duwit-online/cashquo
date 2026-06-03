import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Settings {
  imap_host?: string;
  imap_port?: string;
  imap_user?: string;
  imap_password?: string;
  imap_tls?: string; // "true" | "false"
  imap_mailbox?: string; // default INBOX
}

const decodeMimeWord = (s: string) =>
  s
    .replace(/=\?([^?]+)\?([BbQq])\?([^?]+)\?=/g, (_m, _cs, enc, data) => {
      try {
        if (enc.toLowerCase() === "b") {
          const bin = atob(data);
          return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
        }
        return data.replace(/_/g, " ").replace(/=([0-9A-Fa-f]{2})/g, (_x, h) =>
          String.fromCharCode(parseInt(h, 16)),
        );
      } catch {
        return data;
      }
    })
    .trim();

const parseHeaders = (raw: string) => {
  const headers: Record<string, string> = {};
  const unfolded = raw.replace(/\r?\n[ \t]+/g, " ");
  for (const line of unfolded.split(/\r?\n/)) {
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const value = line.slice(idx + 1).trim();
    headers[key] = value;
  }
  return headers;
};

const decodeQuotedPrintable = (str: string) =>
  str
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_m, h) => String.fromCharCode(parseInt(h, 16)));

const decodeBase64Body = (str: string) => {
  try {
    const clean = str.replace(/\s+/g, "");
    const bin = atob(clean);
    return new TextDecoder("utf-8").decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    return "";
  }
};

const extractBody = (raw: string, headers: Record<string, string>) => {
  const ct = headers["content-type"] || "text/plain";
  const cte = (headers["content-transfer-encoding"] || "7bit").toLowerCase();
  const splitIdx = raw.indexOf("\r\n\r\n") !== -1 ? raw.indexOf("\r\n\r\n") + 4 : raw.indexOf("\n\n") + 2;
  let body = raw.slice(splitIdx);

  let text = "";
  let html = "";

  const decodePart = (partRaw: string) => {
    const sIdx = partRaw.indexOf("\r\n\r\n") !== -1 ? partRaw.indexOf("\r\n\r\n") + 4 : partRaw.indexOf("\n\n") + 2;
    const partHeadersRaw = partRaw.slice(0, sIdx);
    const partBody = partRaw.slice(sIdx);
    const ph = parseHeaders(partHeadersRaw);
    const pct = (ph["content-type"] || "text/plain").toLowerCase();
    const pcte = (ph["content-transfer-encoding"] || "7bit").toLowerCase();
    let decoded = partBody;
    if (pcte === "base64") decoded = decodeBase64Body(partBody);
    else if (pcte === "quoted-printable") decoded = decodeQuotedPrintable(partBody);
    if (pct.includes("text/plain") && !text) text = decoded;
    else if (pct.includes("text/html") && !html) html = decoded;
    else if (pct.includes("multipart/")) {
      const innerBoundary = pct.match(/boundary="?([^";]+)"?/i)?.[1];
      if (innerBoundary) parseMultipart(decoded, innerBoundary);
    }
  };

  const parseMultipart = (data: string, boundary: string) => {
    const parts = data.split(`--${boundary}`);
    for (const part of parts) {
      if (!part || part.trim() === "--" || part.trim() === "") continue;
      decodePart(part.replace(/^\r?\n/, ""));
    }
  };

  if (ct.toLowerCase().includes("multipart/")) {
    const boundary = ct.match(/boundary="?([^";]+)"?/i)?.[1];
    if (boundary) parseMultipart(body, boundary);
  } else {
    if (cte === "base64") body = decodeBase64Body(body);
    else if (cte === "quoted-printable") body = decodeQuotedPrintable(body);
    if (ct.toLowerCase().includes("text/html")) html = body;
    else text = body;
  }

  return { text: text.trim(), html: html.trim() };
};

const parseFrom = (from: string) => {
  const decoded = decodeMimeWord(from);
  const m = decoded.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), address: m[2].trim() };
  return { name: "", address: decoded };
};

class ImapClient {
  conn!: Deno.TlsConn | Deno.Conn;
  encoder = new TextEncoder();
  decoder = new TextDecoder();
  buffer = "";
  tagN = 0;

  async connect(host: string, port: number, tls: boolean) {
    this.conn = tls
      ? await Deno.connectTls({ hostname: host, port })
      : await Deno.connect({ hostname: host, port });
    await this.read(); // greeting
  }

  async read(until: (data: string) => boolean = (d) => /\r\n$/.test(d)): Promise<string> {
    const buf = new Uint8Array(8192);
    const startedAt = Date.now();
    while (!until(this.buffer)) {
      const n = await Promise.race([
        this.conn.read(buf),
        new Promise<number | null>((resolve) => setTimeout(() => resolve(null), 20000)),
      ]);
      if (n === null) throw new Error("IMAP read timeout");
      if (!n) break;
      this.buffer += this.decoder.decode(buf.subarray(0, n));
      if (Date.now() - startedAt > 30000) throw new Error("IMAP read timeout");
    }
    const out = this.buffer;
    this.buffer = "";
    return out;
  }

  async send(line: string): Promise<string> {
    const tag = `A${++this.tagN}`;
    await this.conn.write(this.encoder.encode(`${tag} ${line}\r\n`));
    const re = new RegExp(`^${tag} (OK|NO|BAD)`, "m");
    let acc = "";
    const buf = new Uint8Array(16384);
    const start = Date.now();
    while (!re.test(acc)) {
      const n = await Promise.race([
        this.conn.read(buf),
        new Promise<number | null>((resolve) => setTimeout(() => resolve(null), 30000)),
      ]);
      if (n === null) throw new Error(`IMAP timeout waiting for ${tag}`);
      if (!n) break;
      acc += this.decoder.decode(buf.subarray(0, n));
      if (Date.now() - start > 45000) throw new Error("IMAP command timeout");
    }
    const status = acc.match(re)?.[1];
    if (status !== "OK") throw new Error(`IMAP ${status}: ${acc}`);
    return acc;
  }

  close() {
    try { this.conn.close(); } catch {}
  }
}

const fetchInbox = async (settings: Settings) => {
  const host = settings.imap_host?.trim();
  const port = Number(settings.imap_port) || 993;
  const user = settings.imap_user?.trim();
  const password = settings.imap_password ?? "";
  const tls = (settings.imap_tls ?? "true") !== "false";
  const mailbox = settings.imap_mailbox?.trim() || "INBOX";

  if (!host) throw new Error("IMAP host not configured");
  if (!user) throw new Error("IMAP username not configured");
  if (!password) throw new Error("IMAP password not configured");

  const client = new ImapClient();
  await client.connect(host, port, tls);
  try {
    await client.send(`LOGIN "${user}" "${password.replace(/"/g, '\\"')}"`);
    const selectResp = await client.send(`SELECT "${mailbox}"`);
    const existsMatch = selectResp.match(/\*\s+(\d+)\s+EXISTS/i);
    const total = existsMatch ? Number(existsMatch[1]) : 0;
    if (!total) return { fetched: 0, inserted: 0 };

    const start = Math.max(1, total - 29); // last 30 messages
    const fetchResp = await client.send(
      `FETCH ${start}:${total} (UID BODY.PEEK[])`,
    );

    // Parse FETCH responses
    const messages: Array<{ uid: string; raw: string }> = [];
    const regex = /\* \d+ FETCH \(([^)]*?UID (\d+)[^)]*?)BODY\[\] \{(\d+)\}\r\n/g;
    let m: RegExpExecArray | null;
    let cursor = 0;
    while ((m = regex.exec(fetchResp))) {
      const uid = m[2];
      const size = Number(m[3]);
      const bodyStart = m.index + m[0].length;
      const raw = fetchResp.slice(bodyStart, bodyStart + size);
      messages.push({ uid, raw });
      cursor = bodyStart + size;
    }

    return { messages, total };
  } finally {
    try { await client.send("LOGOUT"); } catch {}
    client.close();
  }
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", userData.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settingsRows } = await admin
      .from("app_settings").select("key, value")
      .in("key", ["imap_host", "imap_port", "imap_user", "imap_password", "imap_tls", "imap_mailbox"]);
    const settings: Settings = {};
    settingsRows?.forEach((r: any) => { (settings as any)[r.key] = r.value; });

    const result = await fetchInbox(settings);
    if (!("messages" in result) || !result.messages) {
      return new Response(JSON.stringify({ fetched: 0, inserted: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let inserted = 0;
    for (const msg of result.messages) {
      // skip if already stored
      const { data: existing } = await admin
        .from("admin_inbox").select("id").eq("message_uid", msg.uid).maybeSingle();
      if (existing) continue;

      const splitIdx = msg.raw.indexOf("\r\n\r\n");
      const headersRaw = splitIdx > -1 ? msg.raw.slice(0, splitIdx) : msg.raw;
      const headers = parseHeaders(headersRaw);
      const subject = decodeMimeWord(headers["subject"] || "(no subject)");
      const from = parseFrom(headers["from"] || "");
      const to = decodeMimeWord(headers["to"] || "");
      const dateHeader = headers["date"];
      const receivedAt = dateHeader ? new Date(dateHeader).toISOString() : new Date().toISOString();
      const { text, html } = extractBody(msg.raw, headers);

      const { error } = await admin.from("admin_inbox").insert({
        message_uid: msg.uid,
        from_address: from.address,
        from_name: from.name,
        to_address: to,
        subject,
        body_text: text,
        body_html: html,
        received_at: receivedAt,
      });
      if (!error) inserted++;
    }

    return new Response(JSON.stringify({ fetched: result.messages.length, inserted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("fetch-inbox error", err);
    let msg = err?.message || "Failed to fetch inbox";
    if (/timed out|timeout|os error 110/i.test(msg)) {
      msg = "Connection to IMAP server timed out. Check host, port, and that the server allows external IMAP connections.";
    }
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
