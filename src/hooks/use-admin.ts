
'use client';

import { useState, useEffect } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';

export function useAdmin() {
    const { user, isUserLoading } = useUser();
    const firestore = useFirestore();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

    const adminRoleRef = useMemoFirebase(() => {
        if (!firestore || !user) return null;
        return doc(firestore, 'roles_admin', user.uid);
    }, [firestore, user]);

    const { data: adminDoc, isLoading: isAdminDocLoading } = useDoc(adminRoleRef);

    useEffect(() => {
        if (isUserLoading || isAdminDocLoading) {
            setIsCheckingAdmin(true);
            return;
        }

        if (!user) {
            setIsAdmin(false);
            setIsCheckingAdmin(false);
            return;
        }

        setIsAdmin(!!adminDoc);
        setIsCheckingAdmin(false);

    }, [user, isUserLoading, adminDoc, isAdminDocLoading]);

    return { isAdmin, isCheckingAdmin };
}
