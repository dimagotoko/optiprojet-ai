import Link from 'next/link';
import { Logo } from '@/components/Logo';

export function Footer() {
  return (
    <footer className="w-full border-t bg-background">
      <div className="container px-4 md:px-6 py-6 md:py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Logo className="h-6 w-6 text-primary" />
            <span className="text-sm font-semibold">OptiTrajet AI</span>
          </Link>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} OptiTrajet AI. Tous droits réservés.
          </p>
          <nav className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/trips" className="hover:text-foreground transition-colors">Trajets</Link>
            <Link href="/signup" className="hover:text-foreground transition-colors">S'inscrire</Link>
            <Link href="/#comment-ca-marche" className="hover:text-foreground transition-colors">À propos</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
