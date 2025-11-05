
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
        // We are checking as long as the user is loading OR the admin doc is loading
        const stillChecking = isUserLoading || isAdminDocLoading;
        setIsCheckingAdmin(stillChecking);

        if (stillChecking) {
            return; // Exit early if we are not done loading everything
        }

        // Once all loading is done, we can determine the admin status
        if (!user) {
            setIsAdmin(false);
            return;
        }

        // If adminDoc exists, the user is an admin
        setIsAdmin(!!adminDoc);

    }, [user, isUserLoading, adminDoc, isAdminDocLoading]);

    return { isAdmin, isCheckingAdmin };
}
