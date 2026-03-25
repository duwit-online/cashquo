DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'Admins can update all accounts'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Admins can update all accounts"
      ON public.accounts
      FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
    $sql$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'accounts' AND policyname = 'Admins can insert accounts'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Admins can insert accounts"
      ON public.accounts
      FOR INSERT
      TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'))
    $sql$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Admins can insert transactions'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Admins can insert transactions"
      ON public.transactions
      FOR INSERT
      TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'))
    $sql$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'transactions' AND policyname = 'Admins can update transactions'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Admins can update transactions"
      ON public.transactions
      FOR UPDATE
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
    $sql$;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgname = 'update_accounts_updated_at'
      AND tgrelid = 'public.accounts'::regclass
      AND NOT tgisinternal
  ) THEN
    EXECUTE $sql$
      CREATE TRIGGER update_accounts_updated_at
      BEFORE UPDATE ON public.accounts
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column()
    $sql$;
  END IF;
END $$;