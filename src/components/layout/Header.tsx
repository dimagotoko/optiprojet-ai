'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, UserCircle, LogOut } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useUser, useAuth } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { signOut } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';


export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({
        title: 'Déconnexion réussie',
        description: 'Vous avez été déconnecté et redirigé vers la page d\'accueil.',
      });
      router.push('/');
      router.refresh();
    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de se déconnecter. Veuillez réessayer.',
      });
    }
  };

  const navLinks = [
    { href: '/#trajets-populaires', label: 'Trajets' },
    { href: '/#comment-ca-marche', label: 'Comment ça marche ?' },
    { href: '/post-trip', label: 'Proposer un trajet' },
  ];
  
  const isProfilePage = pathname === '/profile';

  const renderUserMenu = () => {
    if (isUserLoading) {
      return null; // or a loading spinner
    }

    if (user) {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-9 w-9">
                 <AvatarImage src={user.photoURL || undefined} alt={user.displayName || 'Avatar'} />
                <AvatarFallback>
                  {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{user.displayName}</p>
                <p className="text-xs leading-none text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              {isProfilePage ? (
                 <Link href="/">Quitter</Link>
              ) : (
                <Link href="/profile">Profil</Link>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem>
              Mes trajets
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-500">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Déconnexion</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    }

    return (
      <>
        <Button asChild variant="ghost">
          <Link href="/login">Connexion</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Inscription</Link>
        </Button>
      </>
    );
  };


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Logo className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block">OptiTrajet AI</span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition-colors hover:text-foreground/80 text-foreground/60"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <Link href="/" className="mr-6 flex items-center space-x-2">
              <Logo className="h-6 w-6 text-primary" />
              <span className="font-bold">OptiTrajet AI</span>
            </Link>
            <div className="flex flex-col space-y-3 pt-6">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} className="text-sm font-medium">
                  {link.label}
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-end space-x-2">
          {renderUserMenu()}
        </div>
      </div>
    </header>
  );
}
