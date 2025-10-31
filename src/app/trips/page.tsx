
import { TripCard } from '@/components/TripCard';
import { TripSearchForm } from '@/components/TripSearchForm';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function TripsPage() {
  const allTrips = [
    {
      from: 'Montréal',
      to: 'Québec',
      date: '30 Juil',
      price: '35$',
      driver: {
        name: 'Amélie Tremblay',
        avatar: PlaceHolderImages.find((img) => img.id === 'avatar-1')?.imageUrl || '',
        rating: 4.9,
      },
    },
    {
      from: 'Longueuil',
      to: 'Laval',
      date: '02 Août',
      price: '15$',
      driver: {
        name: 'Félix Bouchard',
        avatar: PlaceHolderImages.find((img) => img.id === 'avatar-2')?.imageUrl || '',
        rating: 4.8,
      },
    },
    {
      from: 'Montréal',
      to: 'Sherbrooke',
      date: '05 Août',
      price: '25$',
      driver: {
        name: 'Florence Gagnon',
        avatar: PlaceHolderImages.find((img) => img.id === 'avatar-3')?.imageUrl || '',
        rating: 5.0,
      },
    },
    {
      from: 'Québec',
      to: 'Trois-Rivières',
      date: '08 Août',
      price: '20$',
      driver: {
        name: 'Leo Roy',
        avatar: 'https://picsum.photos/seed/avatar4/100/100',
        rating: 4.7,
      },
    },
    {
      from: 'Ottawa',
      to: 'Montréal',
      date: '10 Août',
      price: '30$',
      driver: {
        name: 'Mia Caron',
        avatar: 'https://picsum.photos/seed/avatar5/100/100',
        rating: 4.9,
      },
    },
    {
      from: 'Gatineau',
      to: 'Montréal',
      date: '11 Août',
      price: '28$',
      driver: {
        name: 'Noah Dubois',
        avatar: 'https://picsum.photos/seed/avatar6/100/100',
        rating: 4.6,
      },
    },
  ];

  return (
    <div className="container py-12 px-4 md:px-6">
      <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl font-headline">Tous les trajets</h1>
          <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
            Trouvez le covoiturage parfait pour votre prochaine destination.
          </p>
        </div>
      </div>
      <div className="mb-12">
        <TripSearchForm />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {allTrips.map((trip, index) => (
          <TripCard key={index} {...trip} />
        ))}
      </div>
    </div>
  );
}
