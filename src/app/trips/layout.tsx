import { GoogleMapsProvider } from '@/components/GoogleMapsProvider';

export default function TripsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <GoogleMapsProvider>{children}</GoogleMapsProvider>;
}
