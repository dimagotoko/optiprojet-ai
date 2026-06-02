
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Menu, UserCircle, LogOut, Sun, Moon } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useUser, useAuth, useFirestore } from '@/firebase';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { signOut } from 'firebase/auth';
import { usePathname, useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import React from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useAdmin } from '@/hooks/use-admin';


export function Header() {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const { isAdmin } = useAdmin();
  const { theme, setTheme, resolvedTheme } = useTheme();

  React.useEffect(() => {
    let isMounted = true;
    if (user && firestore) {
      const userDocRef = doc(firestore, 'users', user.uid);
      getDoc(userDocRef).then(docSnap => {
        if (isMounted && docSnap.exists()) {
          setUserRole(docSnap.data().role);
        }
      });
    } else {
       if (isMounted) {
         setUserRole(null);
       }
    }
    return () => {
      isMounted = false;
    };
  }, [user, firestore]);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      // First, delete the session cookie on the server
      await fetch('/api/auth/session', { method: 'DELETE' });
      // Then, sign out the user from the client
      await signOut(auth);
      
      toast({
        title: 'Déconnexion réussie',
        description: 'Vous avez été déconnecté.',
      });

      // Redirect to home and refresh the page to clear all states
      window.location.href = '/';

    } catch (error) {
       toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de se déconnecter. Veuillez réessayer.',
      });
    }
  };

  const navLinks = [
    { href: '/trips', label: 'Trajets' },
    { href: '/#comment-ca-marche', label: 'Comment ça marche ?' },
  ];

  const renderUserMenu = () => {
    if (isUserLoading) {
      return null; // Affiche rien pendant la vérification
    }

    if (user) {
      const firstName = user.displayName?.split(' ')[0];
      return (
        <div className="flex items-center gap-2">
            {firstName && <span className="hidden sm:inline text-sm font-medium text-muted-foreground">{firstName}</span>}
            <AlertDialog>
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
                    <p className="text-sm font-medium leading-none truncate max-w-[200px]">{user.displayName}</p>
                    <p className="text-xs leading-none text-muted-foreground truncate max-w-[200px]">
                        {user.email}
                    </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href="/dashboard">Tableau de bord</Link>
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">Admin</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                    <Link href="/profile">Gérer le profil</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <Link href="/dashboard">Mes trajets</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                    onSelect={(e) => e.preventDefault()}
                    className="text-red-500 focus:text-red-500"
                    >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Déconnexion</span>
                    </DropdownMenuItem>
                </AlertDialogTrigger>
                </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialogContent>
                <AlertDialogHeader>
                <AlertDialogTitle>Confirmer la déconnexion ?</AlertDialogTitle>
                <AlertDialogDescription>
                    Êtes-vous sûr de vouloir vous déconnecter de votre compte ?
                </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleLogout} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Me déconnecter
                </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
            </AlertDialog>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost">
          <Link href="/login">Connexion</Link>
        </Button>
        <Button asChild>
          <Link href="/signup">Inscription</Link>
        </Button>
      </div>
    );
  };


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo always visible on mobile, full nav on desktop */}
        <Link href="/" className="mr-4 flex items-center space-x-2 md:hidden">
          <Logo className="h-6 w-6 text-primary" />
        </Link>
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
                className="transition-colors hover:text-foreground text-foreground/80 whitespace-nowrap"
              >
                {link.label}
              </Link>
            ))}
            {user && userRole === 'transporteur' && (
               <Link
                href="/post-trip"
                className="transition-colors hover:text-foreground text-foreground/80 whitespace-nowrap"
              >
                Proposer un trajet
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="transition-colors hover:text-foreground text-foreground/80 whitespace-nowrap"
              >
                Admin
              </Link>
            )}
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
               {user && userRole === 'transporteur' && (
                 <Link href="/post-trip" className="text-sm font-medium">
                    Proposer un trajet
                </Link>
              )}
              {isAdmin && (
                 <Link href="/admin" className="text-sm font-medium">
                    Admin
                </Link>
              )}
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label={resolvedTheme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          </Button>
          {renderUserMenu()}
        </div>
      </div>
    </header>
  );
}
