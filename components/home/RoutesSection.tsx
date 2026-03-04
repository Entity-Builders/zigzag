import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { MapPin, ChevronRight } from 'lucide-react-native';
import { Link } from 'expo-router';
import { useMap } from '../../context/app';
import { fetchNearbyTours, Tour } from '../../api/tours';

const DEFAULT_MAP_IMAGE =
  'https://images.unsplash.com/photo-1569336415962-a4bd9f69cd83?q=80&w=1000&auto=format&fit=crop';
const DEFAULT_THUMB_1 =
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?q=80&w=200&auto=format&fit=crop';
const DEFAULT_THUMB_2 =
  'https://images.unsplash.com/photo-1497935586351-b67a49e012bf?q=80&w=200&auto=format&fit=crop';

interface RoutesSectionProps {
  category?: string;
  categoryTitle?: string;
}

export const RoutesSection = ({
  category = 'walking',
  categoryTitle = 'Rutas a pie cercanas',
}: RoutesSectionProps) => {
  const { center } = useMap();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadTours = async () => {
      if (!center) return;

      setLoading(true);
      try {
        const fetchedTours = await fetchNearbyTours(
          center.lat,
          center.lng,
          category,
        );
        if (fetchedTours && fetchedTours.length > 0) {
          setTours(fetchedTours);
        }
      } catch (error) {
        console.error('Failed to fetch tours:', error);
      } finally {
        setLoading(false);
      }
    };

    loadTours();
  }, [center, category]);

  const getTourImages = (tour: Tour) => {
    const activities = tour.activities || [];

    const img1 = activities[0]?.activity?.photos?.[0]
      ? typeof activities[0].activity.photos[0] === 'string'
        ? activities[0].activity.photos[0]
        : activities[0].activity.photos[0].url
      : DEFAULT_THUMB_1;

    const img2 = activities[1]?.activity?.photos?.[0]
      ? typeof activities[1].activity.photos[0] === 'string'
        ? activities[1].activity.photos[0]
        : activities[1].activity.photos[0].url
      : DEFAULT_THUMB_2;

    return { map: DEFAULT_MAP_IMAGE, thumb1: img1, thumb2: img2 };
  };

  return (
    <View className='flex-col gap-4'>
      <View className='px-4 flex-row justify-between items-center w-full'>
        <Text className='text-xl font-bold text-[#1A1A1A] flex-1'>
          {categoryTitle}
        </Text>
        <Link href={`/tours?category=${encodeURIComponent(category)}`} asChild>
          <Pressable>
            <View className='flex-row gap-1 items-center'>
              <Text className='text-sm text-[#2E4038] font-medium'>
                Ver todo
              </Text>
              <ChevronRight size={16} color='#2E4038' />
            </View>
          </Pressable>
        </Link>
      </View>

      {loading ? (
        <View className='h-[200px] justify-center items-center'>
          <ActivityIndicator size='large' color='#3B82F6' />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 16, paddingHorizontal: 16 }}
        >
          {tours.map((tour) => {
            const images = getTourImages(tour);
            return (
              <Link href={`/tours/${tour.id}`} asChild key={tour.id}>
                <Pressable>
                  <View className='w-[300px] bg-white rounded-2xl overflow-hidden shadow-sm elevation-2'>
                    {/* Card Images */}
                    <View className='flex-row h-[180px]'>
                      <View className='flex-[2] bg-gray-100'>
                        <Image
                          source={{ uri: images.map }}
                          alt='Map Route'
                          className='w-full h-full'
                          resizeMode='cover'
                        />
                      </View>
                      <View className='flex-1 flex-col border-l border-white'>
                        <View className='flex-1 border-b border-white'>
                          <Image
                            source={{ uri: images.thumb1 }}
                            alt='Stop 1'
                            className='w-full h-full'
                            resizeMode='cover'
                          />
                        </View>
                        <View className='flex-1'>
                          <Image
                            source={{ uri: images.thumb2 }}
                            alt='Stop 2'
                            className='w-full h-full'
                            resizeMode='cover'
                          />
                        </View>
                      </View>
                    </View>

                    {/* Card Content */}
                    <View className='p-4 flex-col gap-1'>
                      <Text className='text-lg font-bold text-[#1A1A1A]'>
                        {tour.name}
                      </Text>
                      <View className='flex-row gap-2 items-center'>
                        <MapPin size={12} color='#6B7280' />
                        <Text className='text-sm text-gray-500'>
                          {tour.activities?.length || 0} paradas •{' '}
                          {(tour.duration || 0).toFixed(1)} hrs
                        </Text>
                      </View>
                    </View>
                  </View>
                </Pressable>
              </Link>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};
