ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS public_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_public_token
ON public.invoices(public_token)
WHERE public_token IS NOT NULL;
