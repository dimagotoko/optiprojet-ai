'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function useAdmin() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    
    const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    const adminRoleRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'roles_admin', user.uid);
    }, [firestore, user]);

    const { data: adminDoc, isLoading: isAdminDocLoading } = useDoc(adminRoleRef);

    useEffect(() => {
        // Only resolve when both auth and firestore doc loading are finished
        if (!isUserLoading && !isAdminDocLoading) {
            setIsAdmin(!!user && !!adminDoc);
            setIsCheckingAdmin(false);
        }
    }, [isUserLoading, isAdminDocLoading, user, adminDoc]);
    
    return { isAdmin, isCheckingAdmin };
}
