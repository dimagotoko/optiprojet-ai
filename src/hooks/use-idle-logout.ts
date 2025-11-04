
'use client';

import { useEffect, useCallback } from 'react';
import { useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from './use-toast';
import { usePathname, useRouter } from 'next/navigation';

export function useIdleLogout(timeout: number) {
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = useCallback(() => {
    if (!auth || !auth.currentUser) return;
    
    signOut(auth).then(() => {
      toast({
        title: "Déconnexion pour inactivité",
        description: "Vous avez été déconnecté pour des raisons de sécurité.",
      });
      // Redirect to home page after logout
      router.push('/');
    }).catch(error => {
        console.error("Erreur lors de la déconnexion pour inactivité:", error);
    });
  }, [auth, toast, router]);

  useEffect(() => {
    // Ne pas activer la déconnexion sur les pages publiques
    const publicPages = ['/login', '/signup', '/'];
    if (publicPages.includes(pathname) || !auth?.currentUser) {
      return;
    }

    let timer: NodeJS.Timeout;

    const events = ['mousemove', 'keydown', 'touchstart', 'scroll'];

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(handleLogout, timeout);
    };

    // Attacher les écouteurs d'événements
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    // Démarrer le minuteur initial
    resetTimer();

    // Nettoyer lors du démontage du composant
    return () => {
      clearTimeout(timer);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [handleLogout, timeout, pathname, auth?.currentUser]);
}
