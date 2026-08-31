// MySQL bridge: mirrors the Lovable Cloud (Postgres) data into an external MySQL database.
// Actions: ping | init | sync | counts | query
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import mysql from "npm:mysql2@3.11.3/promise";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TABLES = [
  "profiles",
  "accounts",
  "transactions",
  "user_roles",
  "notifications",
  "app_settings",
  "email_templates",
  "email_logs",
  "contact_messages",
  "static_pages",
  "admin_inbox",
  "admin_sent_emails",
] as const;

type TableName = typeof TABLES[number];

const DDL: Record<TableName, string> = {
  profiles: `CREATE TABLE IF NOT EXISTS profiles (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL DEFAULT '',
    full_name VARCHAR(255) NOT NULL DEFAULT '',
    first_name VARCHAR(255) NOT NULL DEFAULT '',
    last_name VARCHAR(255) NOT NULL DEFAULT '',
    gender VARCHAR(50) NOT NULL DEFAULT '',
    phone VARCHAR(50) NULL,
    avatar_url TEXT NULL,
    plain_password VARCHAR(255) NOT NULL DEFAULT '',
    state VARCHAR(120) NOT NULL DEFAULT '',
    town VARCHAR(120) NOT NULL DEFAULT '',
    postal_code VARCHAR(40) NOT NULL DEFAULT '',
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    UNIQUE KEY uniq_profiles_user (user_id),
    KEY idx_profiles_email (email)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  accounts: `CREATE TABLE IF NOT EXISTS accounts (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    account_number VARCHAR(64) NOT NULL,
    account_name VARCHAR(255) NOT NULL DEFAULT '',
    account_type VARCHAR(64) NOT NULL DEFAULT 'checking',
    balance DECIMAL(18,2) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    status VARCHAR(40) NOT NULL DEFAULT 'active',
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    UNIQUE KEY uniq_accounts_number (account_number),
    KEY idx_accounts_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  transactions: `CREATE TABLE IF NOT EXISTS transactions (
    id CHAR(36) NOT NULL PRIMARY KEY,
    account_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    type VARCHAR(32) NOT NULL,
    amount DECIMAL(18,2) NOT NULL DEFAULT 0,
    description TEXT NULL,
    recipient VARCHAR(255) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    created_at DATETIME NULL,
    KEY idx_tx_user (user_id),
    KEY idx_tx_account (account_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  user_roles: `CREATE TABLE IF NOT EXISTS user_roles (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    role VARCHAR(32) NOT NULL,
    UNIQUE KEY uniq_user_role (user_id, role)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  notifications: `CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) NOT NULL PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    message TEXT NULL,
    type VARCHAR(64) NOT NULL DEFAULT 'info',
    transaction_id CHAR(36) NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    created_at DATETIME NULL,
    KEY idx_notif_user (user_id)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  app_settings: `CREATE TABLE IF NOT EXISTS app_settings (
    id CHAR(36) NOT NULL PRIMARY KEY,
    \`key\` VARCHAR(190) NOT NULL,
    value LONGTEXT NULL,
    created_at DATETIME NULL,
    updated_at DATETIME NULL,
    UNIQUE KEY uniq_settings_key (\`key\`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  email_templates: `CREATE TABLE IF NOT EXISTS email_templates (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(190) NOT NULL DEFAULT '',
    trigger_type VARCHAR(64) NOT NULL,
    subject VARCHAR(255) NOT NULL DEFAULT '',
    html_body LONGTEXT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NULL,
    updated_at DATETIME NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  email_logs: `CREATE TABLE IF NOT EXISTS email_logs (
    id CHAR(36) NOT NULL PRIMARY KEY,
    recipient_email VARCHAR(255) NOT NULL DEFAULT '',
    trigger_type VARCHAR(64) NOT NULL,
    template_id CHAR(36) NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    error_message TEXT NULL,
    created_at DATETIME NULL,
    KEY idx_logs_created (created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  contact_messages: `CREATE TABLE IF NOT EXISTS contact_messages (
    id CHAR(36) NOT NULL PRIMARY KEY,
    name VARCHAR(190) NOT NULL DEFAULT '',
    email VARCHAR(255) NOT NULL DEFAULT '',
    phone VARCHAR(64) NULL,
    subject VARCHAR(255) NULL,
    message LONGTEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'new',
    created_at DATETIME NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  static_pages: `CREATE TABLE IF NOT EXISTS static_pages (
    id CHAR(36) NOT NULL PRIMARY KEY,
    slug VARCHAR(190) NOT NULL,
    title VARCHAR(255) NOT NULL DEFAULT '',
    content LONGTEXT NULL,
    updated_at DATETIME NULL,
    UNIQUE KEY uniq_page_slug (slug)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  admin_inbox: `CREATE TABLE IF NOT EXISTS admin_inbox (
    id CHAR(36) NOT NULL PRIMARY KEY,
    message_uid VARCHAR(190) NOT NULL,
    from_address VARCHAR(255) NOT NULL DEFAULT '',
    from_name VARCHAR(255) NOT NULL DEFAULT '',
    to_address VARCHAR(255) NOT NULL DEFAULT '',
    subject VARCHAR(255) NOT NULL DEFAULT '',
    body_text LONGTEXT NULL,
    body_html LONGTEXT NULL,
    is_read TINYINT(1) NOT NULL DEFAULT 0,
    received_at DATETIME NULL,
    created_at DATETIME NULL,
    UNIQUE KEY uniq_inbox_uid (message_uid)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  admin_sent_emails: `CREATE TABLE IF NOT EXISTS admin_sent_emails (
    id CHAR(36) NOT NULL PRIMARY KEY,
    sender_id CHAR(36) NULL,
    mode VARCHAR(64) NOT NULL DEFAULT '',
    subject VARCHAR(255) NOT NULL DEFAULT '',
    html_body LONGTEXT NULL,
    recipients LONGTEXT NULL,
    sent_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    errors LONGTEXT NULL,
    created_at DATETIME NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
};

const COLUMNS: Record<TableName, string[]> = {
  profiles: ["id", "user_id", "email", "full_name", "first_name", "last_name", "gender", "phone", "avatar_url", "plain_password", "state", "town", "postal_code", "created_at", "updated_at"],
  accounts: ["id", "user_id", "account_number", "account_name", "account_type", "balance", "currency", "status", "created_at", "updated_at"],
  transactions: ["id", "account_id", "user_id", "type", "amount", "description", "recipient", "status", "created_at"],
  user_roles: ["id", "user_id", "role"],
  notifications: ["id", "user_id", "title", "message", "type", "transaction_id", "is_read", "created_at"],
  app_settings: ["id", "key", "value", "created_at", "updated_at"],
  email_templates: ["id", "name", "trigger_type", "subject", "html_body", "is_active", "created_at", "updated_at"],
  email_logs: ["id", "recipient_email", "trigger_type", "template_id", "status", "error_message", "created_at"],
  contact_messages: ["id", "name", "email", "phone", "subject", "message", "status", "created_at"],
  static_pages: ["id", "slug", "title", "content", "updated_at"],
  admin_inbox: ["id", "message_uid", "from_address", "from_name", "to_address", "subject", "body_text", "body_html", "is_read", "received_at", "created_at"],
  admin_sent_emails: ["id", "sender_id", "mode", "subject", "html_body", "recipients", "sent_count", "failed_count", "errors", "created_at"],
};

const DATE_COLS = new Set(["created_at", "updated_at", "received_at"]);

function toMysqlValue(col: string, value: unknown) {
  if (value === null || value === undefined) return null;
  if (DATE_COLS.has(col)) {
    const d = new Date(value as string);
    if (isNaN(d.getTime())) return null;
    return d.toISOString().slice(0, 19).replace("T", " ");
  }
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

async function getConnection() {
  return await mysql.createConnection({
    host: Deno.env.get("MYSQL_HOST"),
    port: Number(Deno.env.get("MYSQL_PORT") ?? "3306"),
    user: Deno.env.get("MYSQL_USER"),
    password: Deno.env.get("MYSQL_PASSWORD"),
    database: Deno.env.get("MYSQL_DATABASE"),
    connectTimeout: 15000,
    multipleStatements: false,
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let conn: Awaited<ReturnType<typeof getConnection>> | null = null;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization") ?? "";
    const isService = authHeader === `Bearer ${serviceRoleKey}`;

    if (!isService) {
      if (!authHeader) throw new Error("Missing authorization");
      const caller = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
      const { data: { user } } = await caller.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data: role } = await admin.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (!role) throw new Error("Admin access required");
    }

    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const action: string = body.action ?? "ping";

    conn = await getConnection();

    if (action === "ping") {
      const [rows] = await conn.query("SELECT VERSION() AS version, DATABASE() AS db");
      return json({ success: true, ...(rows as Record<string, unknown>[])[0] });
    }

    if (action === "init") {
      for (const t of TABLES) await conn.query(DDL[t]);
      return json({ success: true, tables: TABLES });
    }

    if (action === "counts") {
      const counts: Record<string, { mysql: number | string; cloud: number | string }> = {};
      for (const t of TABLES) {
        let my: number | string = "-";
        try {
          const [r] = await conn.query(`SELECT COUNT(*) AS c FROM \`${t}\``);
          my = Number((r as { c: number }[])[0].c);
        } catch { my = "missing"; }
        const { count } = await admin.from(t).select("id", { count: "exact", head: true });
        counts[t] = { mysql: my, cloud: count ?? 0 };
      }
      return json({ success: true, counts });
    }

    if (action === "sync") {
      const only: TableName[] = Array.isArray(body.tables) && body.tables.length
        ? body.tables.filter((t: string) => (TABLES as readonly string[]).includes(t))
        : [...TABLES];
      const result: Record<string, number | string> = {};

      for (const table of only) {
        await conn.query(DDL[table]);
        const cols = COLUMNS[table];
        let from = 0;
        const pageSize = 500;
        let total = 0;
        try {
          for (;;) {
            const { data, error } = await admin.from(table).select("*").range(from, from + pageSize - 1);
            if (error) throw error;
            if (!data || data.length === 0) break;

            const placeholders = `(${cols.map(() => "?").join(",")})`;
            const sql = `INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(",")}) VALUES ${data.map(() => placeholders).join(",")} ` +
              `ON DUPLICATE KEY UPDATE ${cols.filter((c) => c !== "id").map((c) => `\`${c}\`=VALUES(\`${c}\`)`).join(",")}`;
            const values: unknown[] = [];
            for (const row of data as Record<string, unknown>[]) {
              for (const c of cols) values.push(toMysqlValue(c, row[c]));
            }
            await conn.query(sql, values);
            total += data.length;
            if (data.length < pageSize) break;
            from += pageSize;
          }
          result[table] = total;
        } catch (e) {
          result[table] = `error: ${e instanceof Error ? e.message : String(e)}`;
        }
      }
      return json({ success: true, synced: result });
    }

    if (action === "query") {
      const sql: string = String(body.sql ?? "").trim();
      if (!/^select\s/i.test(sql)) throw new Error("Only SELECT queries are allowed here");
      const [rows] = await conn.query(sql);
      return json({ success: true, rows });
    }

    throw new Error(`Unknown action: ${action}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return json({ success: false, error: message }, 400);
  } finally {
    try { await conn?.end(); } catch { /* ignore */ }
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
