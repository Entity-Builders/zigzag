import React from 'react';
import { View, Text } from 'react-native';
import { TourStopDayHeader } from './types';

export const DayHeader = ({ data }: { data: TourStopDayHeader }) => {
  return (
    <View className='py-4 px-4'>
      <View className='flex-row items-center gap-2'>
        <View className='w-1 h-5 bg-blue-500 rounded-full' />
        <Text className='text-xl text-gray-800 font-bold'>{data.title}</Text>
      </View>
    </View>
  );
};
