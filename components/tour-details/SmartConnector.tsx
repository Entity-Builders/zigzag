import React from 'react';
import { View, Text } from 'react-native';
import { Bus, Footprints } from 'lucide-react-native';
import { TourStopTransport } from './types';

export const SmartConnector = ({ data }: { data: TourStopTransport }) => {
  const IconComponent = data.mode === 'bus' ? Bus : Footprints;

  return (
    <View className='flex-row flex-1'>
      {/* Timeline Line */}
      <View className='w-10 items-center'>
        <View className='flex-1 w-[2px] border-l border-dashed border-gray-300' />
      </View>

      {/* Content */}
      <View className='flex-1 py-4'>
        <View className='bg-gray-50 py-2 px-3 rounded-full self-start border border-gray-200'>
          <View className='flex-row gap-2 items-center'>
            <IconComponent size={14} color='#3B82F6' />
            <Text className='text-xs font-medium text-gray-600'>
              {data.label} • {data.duration}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};
