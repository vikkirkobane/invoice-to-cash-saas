import { handlers } from '@/lib/auth';

export async function POST(req: Request) {
  // Forward to NextAuth signOut handler
  return handlers.POST!(req);
}