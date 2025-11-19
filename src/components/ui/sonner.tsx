'use client';

import { Toaster as SonnerToaster, toast, type ToasterProps } from 'sonner';

export const Toaster = (props: ToasterProps) => (
  <SonnerToaster richColors position="top-right" closeButton {...props} />
);

export { toast };
