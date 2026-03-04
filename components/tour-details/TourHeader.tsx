import React from 'react';
import { Dimensions, View, Image, Pressable, Text } from 'react-native';
import { Map } from '../../features/map';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Tour } from '../../api/tours';
import { getImage } from './utils';

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const TourHeader = ({ tour }: { tour: Tour }) => {
  const router = useRouter();
  const firstActivity = tour.activities?.[0]?.activity;
  const imageUri = tour.coverImage || getImage(firstActivity?.photos);
  console.log('$$$ tour:', tour);

  const getFirstLocation = () => {
    if (tour.metadata?.options?.latitude && tour.metadata?.options?.longitude) {
      return {
        latitude: tour.metadata?.options?.latitude,
        longitude: tour.metadata.options.longitude,
      };
    } else if (firstActivity?.latitude && firstActivity?.longitude) {
      return {
        latitude: firstActivity.latitude,
        longitude: firstActivity.longitude,
      };
    }
  };

  const firstLocation = getFirstLocation();

  console.log('$$$ firstLocation 2:', firstLocation);
  // Get tags from metadata or fallback to first activity type
  const tags =
    tour.metadata?.tags ||
    (firstActivity?.type
      ? [firstActivity.type]
      : tour.activities?.[0]?.activityType
        ? [tour.activities[0].activityType]
        : ['']);
  return (
    <View style={{ height: SCREEN_HEIGHT * 0.4 }} className='w-full relative'>
      {/* Background Image or Static Map */}
      {firstLocation ? (
        <Map
          isStatic
          initialRegion={{
            ...firstLocation,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }}
          markers={[
            {
              id: 'tour-location',
              coordinate: firstLocation,
              title: tour.name,
            },
          ]}
        />
      ) : (
        <Image
          source={{ uri: imageUri }}
          alt={tour.name}
          className='w-full h-full'
          resizeMode='cover'
        />
      )}

      {/* Gradient Overlay (Simulated) */}
      <View className='absolute bottom-0 left-0 right-0 h-1/2 bg-black opacity-60' />

      {/* Back Button */}
      <View className='absolute top-[50px] left-[20px] z-10'>
        <Pressable
          className='bg-white/20 rounded-full p-2'
          onPress={() => router.back()}
        >
          <ArrowLeft color='white' size={24} />
        </Pressable>
      </View>

      {/* Title & Tags */}
      <View className='absolute bottom-[20px] left-[20px] right-[20px] flex-col gap-1'>
        <View className='flex-row gap-2 flex-wrap'>
          {tags.map((tag: string) => (
            <View key={tag} className='bg-white/20 rounded-full px-3 py-1'>
              <Text className='text-white font-medium text-sm'>{tag}</Text>
            </View>
          ))}
        </View>
        <Text className='text-white text-3xl font-bold mt-2'>{tour.name}</Text>
      </View>
    </View>
  );
};
