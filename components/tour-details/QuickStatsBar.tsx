import React from 'react';
import { View, Text } from 'react-native';
import { Clock, Footprints, Banknote } from 'lucide-react-native';
import { Tour } from '../../api/tours';

export const QuickStatsBar = ({ tour }: { tour: Tour }) => {
  return (
    <View className='bg-white p-4 mx-4 -mt-[25px] rounded-xl flex-row justify-around items-center shadow-sm elevation-5'>
      <View className='flex-row items-center gap-1'>
        <Clock size={16} color='#6B7280' />
        <Text className='text-sm font-bold text-gray-900'>
          {tour.duration ? `${Math.round(tour.duration)}h` : 'N/A'}
        </Text>
      </View>
      <View className='w-[1px] h-5 bg-gray-200' />
      <View className='flex-row items-center gap-1'>
        <Footprints size={16} color='#6B7280' />
        <Text className='text-sm font-bold text-gray-900'>
          {tour.totalDistance ? `${tour.totalDistance.toFixed(1)} km` : 'N/A'}
        </Text>
      </View>
      <View className='w-[1px] h-5 bg-gray-200' />
      <View className='flex-row items-center gap-1'>
        <Banknote size={16} color='#6B7280' />
        <Text className='text-sm font-bold text-gray-900'>
          {tour.price ? `$${tour.price}` : 'Free'}
        </Text>
      </View>
    </View>
  );
};
