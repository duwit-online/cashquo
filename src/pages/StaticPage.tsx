import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Landmark, ArrowLeft } from "lucide-react";
import WhatsAppFab from "@/components/WhatsAppFab";
import MarketTicker from "@/components/MarketTicker";

interface Page {
  title: string;
  content: string;
  updated_at: string;
}

const StaticPage = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("static_pages")
        .select("title, content, updated_at")
        .eq("slug", slug)
        .maybeSingle();
      if (!active) return;
      if (error || !data) setNotFound(true);
      else setPage(data as Page);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <Landmark className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display font-bold">Fidelity CashQuora</span>
          </Link>
          <ThemeToggle />
        </div>
      </nav>

      <MarketTicker variant="light" />

      <main className="max-w-3xl mx-auto px-4 py-12">
        <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Back to home
        </Link>

        {loading && <div className="text-muted-foreground">Loading…</div>}

        {!loading && notFound && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <h1 className="text-2xl font-display font-bold mb-2">Page not found</h1>
            <p className="text-muted-foreground">This page hasn't been created yet.</p>
          </div>
        )}

        {!loading && page && (
          <article>
            <h1 className="text-3xl sm:text-4xl font-display font-bold mb-3">{page.title}</h1>
            <p className="text-xs text-muted-foreground mb-8">
              Last updated {new Date(page.updated_at).toLocaleDateString()}
            </p>
            <div
              className="prose prose-neutral dark:prose-invert max-w-none [&_h1]:font-display [&_h2]:font-display [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-bold [&_p]:my-3 [&_p]:leading-relaxed [&_a]:text-primary [&_a]:underline [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </article>
        )}
      </main>

      <footer className="border-t border-border mt-12 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Fidelity CashQuora. All rights reserved.
      </footer>

      <WhatsAppFab />
    </div>
  );
};

export default StaticPage;
