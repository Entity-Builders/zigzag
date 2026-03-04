import React from 'react';
import { ScrollView, Text, Pressable } from 'react-native';
import { Sparkles, Landmark, Trees, Coffee } from 'lucide-react-native';

const MOODS = [
  { id: '1', label: 'Romántico', icon: Sparkles },
  { id: '2', label: 'Historia', icon: Landmark },
  { id: '3', label: 'Aventura', icon: Trees },
  { id: '4', label: 'Cafés', icon: Coffee },
];

export const MoodsSection = () => {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingRight: 20 }}
    >
      {MOODS.map((mood) => {
        const IconComponent = mood.icon;
        return (
          <Pressable
            key={mood.id}
            className='flex-row items-center bg-white border border-gray-300 rounded-full px-4 py-2'
          >
            <IconComponent size={16} color='#4B5563' />
            <Text className='text-[#1A1A1A] font-medium text-sm ml-2'>
              {mood.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
};
