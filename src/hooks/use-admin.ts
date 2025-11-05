
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function useAdmin() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    
    // Simplification : un seul état de vérification
    const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const adminRoleRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'roles_admin', user.uid);
    }, [firestore, user]);

    const { data: adminDoc, isLoading: isAdminDocLoading } = useDoc(adminRoleRef);

    useEffect(() => {
        // La vérification est en cours tant que l'utilisateur ou le document admin est en chargement.
        const stillChecking = isUserLoading || isAdminDocLoading;
        setIsCheckingAdmin(stillChecking);
        
        // Si la vérification est terminée, on met à jour le statut admin.
        if (!stillChecking) {
            // L'utilisateur est admin si l'utilisateur est connecté ET que le document admin existe.
            setIsAdmin(!!user && !!adminDoc);
        }
    }, [isUserLoading, isAdminDocLoading, user, adminDoc]);
    
    // On retourne un état clair : le statut et si on est encore en train de vérifier.
    return { isAdmin, isCheckingAdmin };
}
