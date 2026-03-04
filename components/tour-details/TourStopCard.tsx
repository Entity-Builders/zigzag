import React from 'react';
import { View, Image, Text, Pressable } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { TourStopLocation } from './types';

export const TourStopCard = ({
  data,
  isLast,
}: {
  data: TourStopLocation;
  isLast: boolean;
}) => {
  return (
    <View className='flex-row flex-1'>
      {/* Timeline Node */}
      <View className='w-[40px] items-center relative'>
        {/* Top Line */}
        <View className='h-[20px] w-[2px] bg-gray-300' />

        {/* Node Dot */}
        <View className='w-4 h-4 rounded-full bg-blue-500 border-[3px] border-white z-10 shadow-sm' />

        {/* Bottom Line (if not last) */}
        {!isLast && <View className='flex-1 w-[2px] bg-gray-300' />}
      </View>

      {/* Card Content */}
      <View className='flex-1 pb-6 pr-4'>
        <View className='bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm elevation-2 flex-row'>
          <Image
            source={{ uri: data.image }}
            alt={data.title}
            className='w-[100px] h-[100px]'
            resizeMode='cover'
          />
          <View className='p-3 flex-1 justify-between flex-col'>
            <View className='flex-col'>
              <Text
                className='text-sm font-bold text-gray-900'
                numberOfLines={1}
              >
                {data.title}
              </Text>
              <Text className='text-xs text-gray-500 mt-1' numberOfLines={2}>
                {data.description}
              </Text>
            </View>

            <View className='flex-row justify-between items-center mt-2'>
              <View className='flex-row gap-1'>
                {data.badges?.map((badge, idx) => (
                  <View
                    key={idx}
                    className='border border-gray-300 rounded px-1.5 py-0.5'
                  >
                    <Text className='text-[10px] text-gray-600'>
                      {badge.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* Action Button */}
              <Pressable className='flex-row items-center py-1'>
                <Text className='text-xs font-bold text-blue-600'>Ver</Text>
                <ChevronRight size={14} color='#2563EB' className='ml-1' />
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};
